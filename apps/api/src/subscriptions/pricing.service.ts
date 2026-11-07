import {
  assertLocalPaymentEvidence,
  assertSubscriptionEvidence,
  isCapturedPayment,
  PaymentEvidence,
  SubscriptionEvidence,
} from '../payments/autopay-evidence';
import {
  CANCELLED_AWAITING_CAPTURE,
  CLEANUP_PENDING,
  cleanupUnpaidAutoPay,
  confirmUnpaidCancellation,
  lockSubscription,
} from '../payments/autopay-cleanup';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionAccessService } from '../access/subscription-access.service';
import { CouponsService } from '../coupons/coupons.service';
import { couponError, normalizeCouponCode, serializeCouponSummary } from '../coupons/coupon.util';
import { BUSINESS_VAULT_NAMES, durationLabel } from './pricing-catalog';
import { PurchasePlanDto } from './dto/purchase-plan.dto';
import { ConfirmPurchaseDto } from './dto/confirm-purchase.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { VerifySubscriptionDto } from './dto/verify-subscription.dto';
import { AUTOPAY_TERM_MONTHS, RazorpayService } from '../payments/razorpay.service';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';

export interface OneTimePurchaseResult {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  planId: string;
  planName: string;
  vaultId: string;
  vaultName: string;
  durationDays: number;
  status: PaymentStatus;
  keyId: string;
  recurring: false;
  // Optional coupon fields (present when coupon is applied)
  originalAmount?: number;
  discountAmount?: number;
  coupon?: {
    id: string;
    code: string;
    description: string | null;
    discountType: string;
    discountValue: number;
  };
}

export interface RecurringPurchaseResult {
  paymentId: string;
  subscriptionId: string;
  razorpaySubscriptionId: string;
  shortUrl: string;
  amount: number;
  currency: string;
  planId: string;
  planName: string;
  vaultId: string;
  vaultName: string;
  durationDays: number;
  status: PaymentStatus;
  keyId: string;
  recurring: true;
}

export type PurchaseResult = OneTimePurchaseResult | RecurringPurchaseResult;

/**
 * Server-side pricing and purchase flow. Activation requires verified captured
 * payment evidence; client-only confirmation never grants access.
 */
@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SubscriptionAccessService,
    private readonly coupons: CouponsService,
    private readonly razorpayService: RazorpayService,
  ) {}

  /**
   * Public grouped pricing catalog: 6 business vaults x 3 duration offers.
   * Returns only active, non-archived plans over the catalog vaults.
   */
  async getPublicPricing() {
    const catalogNames = BUSINESS_VAULT_NAMES;

    const vaults = await this.prisma.vault.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        plans: {
          where: { plan: { deletedAt: null, isActive: true } },
          include: { plan: true },
        },
      },
    });

    const pricedVaults = vaults
      .filter((v) => catalogNames.includes(v.name))
      .map((v) => {
        const plans = v.plans
          .map((row) => row.plan)
          .sort((a, b) => a.durationDays - b.durationDays)
          .map((p) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            regularPrice: Number(p.regularPrice),
            discountedPrice: Number(p.price),
            discountPercentage: p.discountPercentage,
            currency: p.currency,
            durationDays: p.durationDays,
            durationLabel: durationLabel(p.durationDays),
          }));
        return {
          vault: { id: v.id, name: v.name, description: v.description },
          plans,
        };
      })
      .filter((v) => v.plans.length > 0);

    // Keep deterministic catalog order (sortOrder may not be maintained in dev).
    const vaultIndex = new Map(pricedVaults.map((v, i) => [v.vault.id, i]));
    return pricedVaults.sort((a, b) => {
      const vi = vaultIndex.get(a.vault.id) ?? 0;
      const vj = vaultIndex.get(b.vault.id) ?? 0;
      return vi - vj;
    });
  }

  /**
   * Start a purchase: validate plan availability and create a CREATED payment
   * session for the exact server-side plan price.
   * Supports both one-time (default) and recurring (AutoPay) purchases.
   */
  async purchase(userId: string, dto: PurchasePlanDto): Promise<PurchaseResult> {
    if (dto.recurring) {
      return this.purchaseRecurring(userId, dto);
    }
    return this.purchaseOneTime(userId, dto);
  }

  /**
   * One-time purchase (existing behavior): creates a Razorpay Order.
   */
  private async purchaseOneTime(
    userId: string,
    dto: PurchasePlanDto,
  ): Promise<OneTimePurchaseResult> {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id: dto.planId, deletedAt: null, isActive: true },
      include: {
        vaults: {
          where: { vault: { deletedAt: null, status: 'ACTIVE' } },
          include: { vault: { select: { id: true, name: true } } },
        },
      },
    });
    if (!plan) {
      throw new NotFoundException('Plan is not available for purchase');
    }

    const tokenVaults = plan.vaults.map((v) => v.vault);
    const target =
      tokenVaults.find((v) => v.id === dto.vaultId) ??
      (tokenVaults.length === 1 ? tokenVaults[0] : undefined);
    if (!target) {
      throw new BadRequestException(
        tokenVaults.length === 0
          ? 'This plan grants no vault access'
          : 'A vaultId belonging to this plan is required',
      );
    }

    // An empty/whitespace-only coupon code simply means "no coupon".
    if (dto.couponCode !== undefined && normalizeCouponCode(dto.couponCode) !== '') {
      return this.purchaseWithCoupon(userId, dto.couponCode, plan, target);
    }

    const order = await this.razorpayService.createOrder({
      amount: Number(plan.price),
      currency: plan.currency,
      receipt: `order_${randomUUID().replace(/-/g, '')}`,
      notes: {
        userId,
        planId: plan.id,
        vaultId: target.id,
      },
    });

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: plan.price,
        currency: plan.currency,
        status: 'CREATED',
        razorpayOrderId: order.id,
        metadata: {
          planId: plan.id,
          planName: plan.name,
          vaultId: target.id,
          vaultName: target.name,
          durationDays: plan.durationDays,
          recurring: false,
        },
      },
    });

    return {
      paymentId: payment.id,
      orderId: order.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      planId: plan.id,
      planName: plan.name,
      vaultId: target.id,
      vaultName: target.name,
      durationDays: plan.durationDays,
      status: payment.status,
      keyId: this.razorpayService.getKeyId(),
      recurring: false,
    };
  }

  /**
   * Recurring purchase (AutoPay): creates a Razorpay Subscription.
   * Requires a Razorpay Plan to exist (created on-demand if missing).
   */
  private async purchaseRecurring(
    userId: string,
    dto: PurchasePlanDto,
  ): Promise<RecurringPurchaseResult> {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id: dto.planId, deletedAt: null, isActive: true },
      include: {
        vaults: {
          where: { vault: { deletedAt: null, status: 'ACTIVE' } },
          include: { vault: { select: { id: true, name: true } } },
        },
      },
    });
    if (!plan) {
      throw new NotFoundException('Plan is not available for purchase');
    }

    const tokenVaults = plan.vaults.map((v) => v.vault);
    const target =
      tokenVaults.find((v) => v.id === dto.vaultId) ??
      (tokenVaults.length === 1 ? tokenVaults[0] : undefined);
    if (!target) {
      throw new BadRequestException(
        tokenVaults.length === 0
          ? 'This plan grants no vault access'
          : 'A vaultId belonging to this plan is required',
      );
    }

    // Coupons not supported for recurring subscriptions in this phase
    if (dto.couponCode !== undefined && normalizeCouponCode(dto.couponCode) !== '') {
      throw new BadRequestException('Coupons are not supported for recurring subscriptions');
    }

    // Prevent duplicate active AutoPay subscriptions for same user/plan
    const existingActiveRecurring = await this.prisma.subscription.findFirst({
      where: {
        userId,
        planId: plan.id,
        autoRenew: true,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING] },
      },
    });
    if (existingActiveRecurring) {
      throw new ConflictException('You already have an active AutoPay subscription for this plan');
    }

    // Also check for any existing active subscription (one-time or recurring) to avoid conflicts
    const existingActiveSub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        endDate: { gt: new Date() },
      },
    });
    if (existingActiveSub && !existingActiveSub.razorpaySubscriptionId) {
      throw new ConflictException('You already have an active subscription for this plan');
    }

    // Get or create Razorpay Plan
    const razorpayPlanId = plan.razorpayPlanId;
    if (!razorpayPlanId) {
      throw new BadRequestException('This plan is not configured for recurring billing');
    }
    // Enforce allowlist - explicitly reject excluded plans
    if (razorpayPlanId === 'plan_Trq9hv9Sx7SUb7') {
      throw new BadRequestException('This plan is not available for purchase');
    }
    // Block Remote 6-month plan with billing interval mismatch until resolved
    if (razorpayPlanId === 'plan_Trq302lYgONage') {
      throw new BadRequestException('This plan is not available for recurring billing');
    }
    this.razorpayService.validateRazorpayPlanId(razorpayPlanId);

    const unresolvedCreation = await this.prisma.webhookEvent.findFirst({
      where: {
        eventType: 'autopay.creation',
        processed: false,
        AND: [
          { payload: { path: ['userId'], equals: userId } },
          { payload: { path: ['planId'], equals: plan.id } },
        ],
      },
    });
    if (unresolvedCreation) {
      throw new ConflictException('An earlier AutoPay creation requires cleanup before retrying');
    }
    // Durable intent survives a process crash or an ambiguous gateway timeout.
    const creationId = `autopay_creation_${randomUUID()}`;
    await this.prisma.webhookEvent.create({
      data: {
        eventId: creationId,
        eventType: 'autopay.creation',
        processed: false,
        payload: { userId, planId: plan.id },
      },
    });
    const subscription = await this.razorpayService.createSubscription({
      planId: razorpayPlanId,
      totalCount: Math.max(1, Math.floor(AUTOPAY_TERM_MONTHS / (plan.durationDays / 30))),
      customerNotify: true,
      notes: {
        userId,
        planId: plan.id,
        vaultId: target.id,
      },
    });

    await this.prisma.webhookEvent.update({
      where: { eventId: creationId },
      data: {
        payload: { userId, planId: plan.id, razorpaySubscriptionId: subscription.id },
      },
    });

    // The database index backing this transaction permits only one pending or
    // active AutoPay attempt per user/plan. If a concurrent request loses the
    // race, its newly-created Razorpay subscription is cancelled below.
    let purchase: { localSubscription: { id: string }; payment: any };
    try {
      purchase = await this.prisma.$transaction(async (tx) => {
        const localSubscription = await tx.subscription.create({
          data: {
            userId,
            planId: plan.id,
            startDate: new Date(),
            endDate: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000),
            status: SubscriptionStatus.PENDING,
            razorpaySubscriptionId: subscription.id,
            autoRenew: true,
            nextBillingDate: subscription.charge_at
              ? new Date(subscription.charge_at * 1000)
              : null,
            paymentReference: subscription.short_url,
          },
        });

        if (plan.vaults.length > 0) {
          await tx.subscriptionVaultAccess.createMany({
            data: plan.vaults.map((v) => ({
              subscriptionId: localSubscription.id,
              vaultId: v.vault.id,
            })),
            skipDuplicates: true,
          });
        }

        const payment = await tx.payment.create({
          data: {
            userId,
            subscriptionId: localSubscription.id,
            razorpaySubscriptionId: subscription.id,
            amount: plan.price,
            currency: plan.currency,
            status: 'CREATED',
            metadata: {
              planId: plan.id,
              planName: plan.name,
              vaultId: target.id,
              vaultName: target.name,
              durationDays: plan.durationDays,
              recurring: true,
              razorpaySubscriptionId: subscription.id,
              shortUrl: subscription.short_url,
            },
          },
        });

        await tx.webhookEvent.update({ where: { eventId: creationId }, data: { processed: true } });
        return { localSubscription, payment };
      });
    } catch (error: any) {
      try {
        const cleanup = await confirmUnpaidCancellation(this.razorpayService, subscription.id);
        if (cleanup.paid || !cleanup.cancelled)
          throw new Error('Orphan capture requires reconciliation');
        await this.prisma.webhookEvent.update({
          where: { eventId: creationId },
          data: { processed: true },
        });
      } catch {
        // The remote ID is essential for operator reconciliation if local
        // persistence failed. Never silently discard this cleanup failure.
        Logger.error(
          `AutoPay orphan requires reconciliation: ${subscription.id}`,
          'PricingService',
        );
        throw new ConflictException(
          'Purchase persistence and gateway cleanup failed; contact support before retrying',
        );
      }
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'You already have an active AutoPay subscription for this plan',
        );
      }
      throw error;
    }

    return {
      paymentId: purchase.payment.id,
      subscriptionId: purchase.localSubscription.id,
      razorpaySubscriptionId: subscription.id,
      shortUrl: subscription.short_url,
      amount: Number(plan.price),
      currency: plan.currency,
      planId: plan.id,
      planName: plan.name,
      vaultId: target.id,
      vaultName: target.name,
      durationDays: plan.durationDays,
      status: purchase.payment.status,
      keyId: this.razorpayService.getKeyId(),
      recurring: true,
    };
  }

  // period conversion removed - using pre-configured Razorpay plans

  /**
   * Coupon purchase path: eligibility, limits and discount math all re-checked
   * inside one transaction, with the coupon row locked so concurrent
   * redemptions serialize on the usage limit instead of double-spending it.
   * The payable amount is derived from the plan price in the database; the
   * full breakdown is stored on the payment metadata and the CouponUsage row.
   */
  private async purchaseWithCoupon(
    userId: string,
    rawCode: string,
    plan: { id: string; name: string; price: unknown; currency: string; durationDays: number },
    target: { id: string; name: string },
  ): Promise<OneTimePurchaseResult> {
    return this.prisma.$transaction(async (tx) => {
      const found = await this.coupons.resolve(tx, rawCode);
      await this.coupons.lock(tx, found.id);

      // Re-read under the lock: the coupon may have been edited/archived
      // between the lookup and lock acquisition.
      const coupon = await this.coupons.reload(tx, found.id);
      if (!coupon) {
        throw couponError('COUPON_NOT_FOUND');
      }
      this.coupons.assertEligible(coupon, userId, plan.id, new Date());
      await this.coupons.assertLimits(tx, coupon, userId);

      const { originalAmount, discountAmount, finalAmount } = this.coupons.computeAmounts(
        coupon,
        Number(plan.price),
      );

      const order = await this.razorpayService.createOrder({
        amount: Number(finalAmount),
        currency: plan.currency,
        receipt: `order_${randomUUID().replace(/-/g, '')}`,
        notes: {
          userId,
          planId: plan.id,
          vaultId: target.id,
          couponCode: coupon.code,
        },
      });

      const payment = await tx.payment.create({
        data: {
          userId,
          amount: finalAmount,
          currency: plan.currency,
          status: 'CREATED',
          razorpayOrderId: order.id,
          metadata: {
            planId: plan.id,
            planName: plan.name,
            vaultId: target.id,
            vaultName: target.name,
            durationDays: plan.durationDays,
            couponId: coupon.id,
            couponCode: coupon.code,
            originalAmount,
            discountAmount,
          },
        },
      });

      // Reserves one redemption. paymentId is unique, so a payment session can
      // never reserve twice; failed/cancelled/refunded payments release their
      // slot when counting (see COUNTED_PAYMENT_STATUSES).
      await tx.couponUsage.create({
        data: {
          couponId: coupon.id,
          userId,
          planId: plan.id,
          paymentId: payment.id,
          originalAmount,
          discountAmount,
          finalAmount,
          currency: plan.currency,
        },
      });

      return {
        paymentId: payment.id,
        orderId: payment.razorpayOrderId!,
        amount: Number(payment.amount),
        originalAmount,
        discountAmount,
        coupon: serializeCouponSummary(coupon),
        currency: payment.currency,
        planId: plan.id,
        planName: plan.name,
        vaultId: target.id,
        vaultName: target.name,
        durationDays: plan.durationDays,
        status: payment.status,
        keyId: this.razorpayService.getKeyId(),
        recurring: false,
      };
    });
  }

  /**
   * Fetch an owned payment session for checkout rendering. The frozen
   * plan/vault/coupon breakdown is read from the payment metadata so the
   * checkout screen always renders the exact server-side amount and can never
   * be tricked into displaying a client-supplied price.
   */
  async getPaymentSession(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { subscription: true },
    });
    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    const meta = (payment.metadata ?? {}) as {
      planId?: string;
      planName?: string;
      vaultId?: string;
      vaultName?: string;
      durationDays?: number;
      couponCode?: string;
      originalAmount?: number;
      discountAmount?: number;
      recurring?: boolean;
      razorpaySubscriptionId?: string;
      shortUrl?: string;
    };

    const razorpaySubscriptionId =
      payment.razorpaySubscriptionId || meta.razorpaySubscriptionId || null;
    const subscriptionId = payment.subscriptionId || null;
    const recurring = meta.recurring === true || !!razorpaySubscriptionId;

    return {
      paymentId: payment.id,
      orderId: payment.razorpayOrderId,
      subscriptionId,
      razorpaySubscriptionId,
      shortUrl: meta.shortUrl || null,
      status: payment.status,
      amount: Number(payment.amount),
      currency: payment.currency,
      planId: meta.planId ?? null,
      planName: meta.planName ?? null,
      vaultId: meta.vaultId ?? null,
      vaultName: meta.vaultName ?? null,
      durationDays: meta.durationDays ?? null,
      couponCode: meta.couponCode ?? null,
      originalAmount: Number(meta.originalAmount ?? payment.amount),
      discountAmount: Number(meta.discountAmount ?? 0),
      finalAmount: Number(payment.amount),
      keyId: this.razorpayService.getKeyId(),
      recurring,
      cleanupPending: payment.subscription?.cancellationReason === CLEANUP_PENDING,
    };
  }

  /**
   * Mark an owned abandoned payment session as FAILED. This is what a real
   * gateway would report back to the server on a declined payment (and what
   * the test gateway calls for its failure path); a later Razorpay webhook can
   * re-use it unchanged. Failed payments are excluded from coupon usage
   * counting, so this releases any redemption slot the session reserved.
   */
  async failPayment(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { subscription: true },
    });
    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }
    if (['SUCCESS', 'REFUNDED', 'CANCELLED'].includes(payment.status)) {
      throw new BadRequestException('Payment cannot be failed in its current state');
    }
    if (payment.status === 'FAILED' && !payment.subscription?.razorpaySubscriptionId) {
      return { paymentId: payment.id, status: 'FAILED' };
    }
    if (payment.subscription?.razorpaySubscriptionId) {
      await cleanupUnpaidAutoPay(this.prisma, this.razorpayService, payment.subscription.id);
    } else {
      const changed = await this.prisma.payment.updateMany({
        where: { id: payment.id, status: { in: ['CREATED', 'PENDING', 'FAILED'] } },
        data: { status: 'FAILED', webhookEvent: 'payment.failed' },
      });
      if (!changed.count)
        throw new ConflictException('Payment cannot be cancelled; refresh its status');
    }
    return { paymentId: payment.id, status: 'FAILED' };
  }

  async verifyPayment(userId: string, dto: VerifyPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: { subscription: true },
    });
    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'SUCCESS') {
      return this.successResponse(payment);
    }
    if (['FAILED', 'REFUNDED', 'CANCELLED'].includes(payment.status)) {
      throw new BadRequestException('Payment cannot be verified in its current state');
    }

    if (!payment.razorpayOrderId || payment.razorpayOrderId !== dto.razorpay_order_id) {
      throw new BadRequestException('Invalid order id');
    }

    const isValid = this.razorpayService.verifySignature({
      orderId: dto.razorpay_order_id,
      paymentId: dto.razorpay_payment_id,
      signature: dto.razorpay_signature,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    const captured = await this.razorpayService.fetchPayment(dto.razorpay_payment_id);
    if (
      captured.status !== 'captured' ||
      captured.captured !== true ||
      captured.order_id !== payment.razorpayOrderId ||
      captured.amount !== Math.round(Number(payment.amount) * 100) ||
      captured.currency !== payment.currency
    ) {
      throw new BadRequestException('A matching captured payment is required');
    }
    return this.activateAfterPayment(userId, payment, dto.razorpay_payment_id, 'payment.verified');
  }

  async verifySubscriptionPayment(userId: string, dto: VerifySubscriptionDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: {
        subscription: {
          include: {
            plan: {
              include: {
                vaults: {
                  where: { vault: { deletedAt: null, status: 'ACTIVE' } },
                  include: { vault: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'SUCCESS') {
      return this.successResponse(payment);
    }
    if (['FAILED', 'REFUNDED', 'CANCELLED'].includes(payment.status)) {
      throw new BadRequestException('Payment cannot be verified in its current state');
    }

    const expectedSubId =
      payment.razorpaySubscriptionId || (payment.metadata as any)?.razorpaySubscriptionId;
    if (!expectedSubId || expectedSubId !== dto.razorpay_subscription_id) {
      throw new BadRequestException('Invalid subscription id');
    }

    // 1. Cryptographic HMAC signature check (timing-safe)
    const isValid = this.razorpayService.verifySubscriptionSignature({
      paymentId: dto.razorpay_payment_id,
      subscriptionId: dto.razorpay_subscription_id,
      signature: dto.razorpay_signature,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    // 2. Fetch payment details directly from Razorpay API
    let rzpPayment: any;
    try {
      rzpPayment = await this.razorpayService.fetchPayment(dto.razorpay_payment_id);
    } catch (err: any) {
      throw new BadRequestException(
        `Failed to verify payment status with payment gateway: ${err?.message || 'unknown error'}`,
      );
    }

    if (!rzpPayment) {
      throw new BadRequestException('Payment record not found on payment gateway');
    }

    // 3. Verify payment belongs to this subscription
    if (
      rzpPayment.id !== dto.razorpay_payment_id ||
      (rzpPayment.subscription_id != null &&
        rzpPayment.subscription_id !== dto.razorpay_subscription_id)
    ) {
      throw new BadRequestException('Payment does not match this subscription');
    }

    if (!payment.subscription || payment.subscription.userId !== userId) {
      throw new BadRequestException('Local subscription does not belong to this checkout user');
    }
    // Checkout HMAC binds payment_id|subscription_id even when the fetched
    // payment omits subscription_id. Fetch the subscription to verify its plan
    // and any ownership notes instead of demanding an undocumented field.
    const rzpSubscription = await this.razorpayService.fetchSubscription(expectedSubId);
    assertSubscriptionEvidence(payment.subscription, rzpSubscription, rzpPayment);
    assertLocalPaymentEvidence(payment, payment.subscription, rzpPayment);

    // 4. Verify amount and currency
    const expectedAmountPaise = Math.round(Number(payment.amount) * 100);
    if (Number(rzpPayment.amount) !== expectedAmountPaise) {
      throw new BadRequestException('Payment amount does not match plan price');
    }
    if (rzpPayment.currency !== payment.currency) {
      throw new BadRequestException('Payment currency mismatch');
    }

    // 5. Verify captured status
    if (!isCapturedPayment(rzpPayment)) {
      if (rzpPayment.status === 'authorized' || rzpPayment.status === 'created') {
        // Persist the gateway-confirmed pending state so a page refresh cannot
        // reopen the checkout form and imply that a new attempt is required.
        await this.prisma.payment.updateMany({
          where: { id: payment.id, status: { in: ['CREATED', 'PENDING'] } },
          data: { status: 'PENDING', webhookEvent: 'subscription.pending' },
        });
        const pendingPayment = await this.prisma.payment.findUniqueOrThrow({
          where: { id: payment.id },
        });
        if (pendingPayment.status === 'SUCCESS') return this.successResponse(pendingPayment);
        if (pendingPayment.status !== 'PENDING')
          throw new ConflictException('Checkout is no longer pending');
        return {
          status: 'PENDING' as const,
          message:
            'Payment authorization is in progress. Your access will be activated as soon as the charge settles.',
          payment: serializePayment(pendingPayment),
        };
      }
      throw new BadRequestException(`Payment has not been captured (status: ${rzpPayment.status})`);
    }

    // 6. Payment confirmed captured! Activate subscription & grant vault access.
    return this.activateAfterSubscriptionPayment(
      userId,
      payment,
      dto.razorpay_payment_id,
      'subscription.verified',
      rzpSubscription,
      rzpPayment,
    );
  }

  private async activateAfterSubscriptionPayment(
    _userId: string,
    payment: any,
    razorpayPaymentId: string,
    webhookEvent: string,
    verifiedSubscription: SubscriptionEvidence,
    verifiedPayment: PaymentEvidence,
  ) {
    const meta = (payment.metadata ?? {}) as {
      planId?: string;
      vaultId?: string;
      planName?: string;
    };
    const planId = meta.planId || payment.subscription?.planId;
    const subId = payment.subscriptionId;
    if (!planId || !subId) {
      throw new BadRequestException('Payment session is missing required subscription metadata');
    }
    if (
      payment.subscription &&
      [
        SubscriptionStatus.CANCELLED,
        SubscriptionStatus.EXPIRED,
        SubscriptionStatus.FAILED,
      ].includes(payment.subscription.status)
    ) {
      throw new ConflictException('Subscription is no longer eligible for activation');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: {
        vaults: {
          where: { vault: { deletedAt: null, status: 'ACTIVE' } },
          include: { vault: { select: { id: true, name: true } } },
        },
      },
    });
    if (!plan || plan.deletedAt || !plan.isActive) {
      throw new ConflictException('The plan is no longer available');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await lockSubscription(tx, subId);
      const current = await tx.subscription.findUniqueOrThrow({
        where: { id: subId },
        include: { plan: true },
      });
      const currentPayment = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      assertSubscriptionEvidence(current, verifiedSubscription, verifiedPayment);
      assertLocalPaymentEvidence(currentPayment, current, verifiedPayment);

      if (currentPayment.status === 'SUCCESS') {
        if (currentPayment.razorpayPaymentId !== razorpayPaymentId) {
          throw new ConflictException(
            'Checkout already captured with another payment; reconciliation required',
          );
        }
        return tx.subscription.findUniqueOrThrow({
          where: { id: subId },
          include: { plan: true, vaultAccess: { include: { vault: true } } },
        });
      }
      if (
        !['PENDING', 'ACTIVE'].includes(current.status) ||
        !['CREATED', 'PENDING', 'SUCCESS'].includes(currentPayment.status)
      ) {
        throw new ConflictException(
          'Checkout was cancelled; captured payment requires reconciliation',
        );
      }
      // Activate subscription
      const sub = await tx.subscription.update({
        where: { id: subId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          autoRenew:
            current.autoRenew &&
            current.cancellationReason !== CANCELLED_AWAITING_CAPTURE &&
            !['cancelled', 'completed', 'expired'].includes(verifiedSubscription.status ?? ''),
          nextBillingDate: ['cancelled', 'completed', 'expired'].includes(
            verifiedSubscription.status ?? '',
          )
            ? null
            : current.nextBillingDate,
          paymentReference: razorpayPaymentId,
        },
      });

      // Snapshot vault access if not already present
      if (plan.vaults.length > 0) {
        await tx.subscriptionVaultAccess.createMany({
          data: plan.vaults.map((v) => ({
            subscriptionId: sub.id,
            vaultId: v.vault.id,
          })),
          skipDuplicates: true,
        });
      }

      // Update payment to SUCCESS
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          razorpayPaymentId,
          webhookEvent,
        },
      });

      return tx.subscription.findUniqueOrThrow({
        where: { id: sub.id },
        include: {
          vaultAccess: { include: { vault: { select: { id: true, name: true } } } },
          plan: true,
        },
      });
    });

    if (this.access.effectiveStatus(updated) === 'ACTIVE') {
      try {
        await this.access.handleSubscriptionActivated(updated.id);
      } catch {
        // best effort
      }
    }

    return {
      status: 'SUCCESS' as const,
      subscription: {
        id: updated.id,
        plan: {
          id: updated.plan?.id,
          name: updated.plan?.name,
          price: Number(updated.plan?.price),
          regularPrice: Number(updated.plan?.regularPrice),
          discountedPrice: Number(updated.plan?.price),
          discountPercentage: updated.plan?.discountPercentage,
          currency: updated.plan?.currency,
          durationDays: updated.plan?.durationDays,
          durationLabel: durationLabel(updated.plan?.durationDays ?? 0),
        },
        status: updated.status,
        startDate: updated.startDate,
        endDate: updated.endDate,
        vaultAccess: updated.vaultAccess.map((va: any) => ({
          id: va.id,
          vaultId: va.vaultId,
          name: va.vault?.name ?? '',
        })),
      },
      payment: serializePayment({
        ...payment,
        status: 'SUCCESS',
      }),
    };
  }

  /**
   * Activates the subscription and marks the payment SUCCESS. Shared by all
   * verification paths (signature + webhook).
   */
  private async activateAfterPayment(
    userId: string,
    payment: {
      id: string;
      status: string;
      razorpayOrderId: string | null;
      amount: unknown;
      currency: string;
      metadata: unknown;
    },
    razorpayPaymentId: string,
    webhookEvent: string,
  ) {
    const meta = (payment.metadata ?? {}) as {
      planId?: string;
      vaultId?: string;
      planName?: string;
      couponId?: string;
      couponCode?: string;
      originalAmount?: number;
      discountAmount?: number;
    };
    if (!meta.planId || !meta.vaultId) {
      throw new BadRequestException('Purchase session is missing required metadata');
    }

    const subscription = await this.prisma
      .$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id" = ${payment.id} FOR UPDATE`;
        const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
        if (current.status === 'SUCCESS' && current.subscriptionId) {
          return tx.subscription.findUniqueOrThrow({
            where: { id: current.subscriptionId },
            include: { plan: true, vaultAccess: { include: { vault: true } } },
          });
        }
        if (!['CREATED', 'PENDING'].includes(current.status)) {
          throw new ConflictException('Checkout is no longer eligible for activation');
        }
        const created = await this.access.createSubscriptionWithSnapshot(
          userId,
          meta.planId!,
          {
            status: 'ACTIVE',
            paymentReference: razorpayPaymentId,
          },
          tx,
        );
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'SUCCESS', subscriptionId: created.id, razorpayPaymentId, webhookEvent },
        });
        await tx.couponUsage.updateMany({
          where: { paymentId: payment.id },
          data: { subscriptionId: created.id },
        });
        return created;
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.message === 'PLAN_NOT_AVAILABLE') {
          throw new ConflictException('The plan is no longer available for purchase');
        }
        throw error;
      });
    await this.access.handleSubscriptionActivated(subscription.id).catch(() => undefined);

    return {
      status: 'SUCCESS' as const,
      subscription: {
        id: subscription.id,
        plan: {
          id: subscription.plan?.id,
          name: subscription.plan?.name,
          price: Number(subscription.plan?.price),
          regularPrice: Number(subscription.plan?.regularPrice),
          discountedPrice: Number(subscription.plan?.price),
          discountPercentage: subscription.plan?.discountPercentage,
          currency: subscription.plan?.currency,
          durationDays: subscription.plan?.durationDays,
          durationLabel: durationLabel(subscription.plan?.durationDays ?? 0),
        },
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        vaultAccess: subscription.vaultAccess.map((va) => ({
          id: va.id,
          vaultId: va.vaultId,
          name: va.vault?.name ?? '',
        })),
      },
      payment: serializePayment({ ...payment, status: 'SUCCESS' }),
    };
  }

  /** Idempotent success read for an already-activated payment. */
  private async successResponse(payment: {
    id: string;
    subscriptionId: string | null;
    status: string;
    razorpayOrderId: string | null;
    amount: unknown;
    currency: string;
  }) {
    if (!payment.subscriptionId) {
      throw new ConflictException('Payment is already processed');
    }
    const sub = await this.prisma.subscription.findUnique({
      where: { id: payment.subscriptionId },
      include: {
        plan: true,
        vaultAccess: { include: { vault: { select: { id: true, name: true } } } },
      },
    });
    return { status: 'SUCCESS' as const, subscription: sub, payment: serializePayment(payment) };
  }

  async confirmPurchase(userId: string, dto: ConfirmPurchaseDto) {
    const payment = await this.prisma.payment.findUnique({ where: { id: dto.paymentId } });
    if (!payment || payment.userId !== userId) throw new NotFoundException('Payment not found');
    if (payment.status === 'SUCCESS') return this.successResponse(payment);
    throw new BadRequestException('Gateway verification of a captured payment is required');
  }
}

function serializePayment(payment: {
  id: string;
  status: string;
  razorpayOrderId: string | null;
  amount: unknown;
  currency: string;
}) {
  return {
    id: payment.id,
    status: payment.status,
    orderId: payment.razorpayOrderId,
    amount: Number(payment.amount),
    currency: payment.currency,
  };
}
