import {
  BadRequestException,
  ConflictException,
  Injectable,
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
import { RazorpayService } from '../payments/razorpay.service';
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
 * Server-side pricing, purchase and (interim, gateway-agnostic) payment flow.
 *
 * The price shown to a client is ALWAYS the server-controlled plan price from
 * the database - the client can only send a planId (+ optional vaultId, + an
 * optional coupon code whose discount is recomputed server-side). Never trusts
 * client-supplied prices. A payment session (status CREATED) must be confirmed
 * through /purchase/confirm before any subscription is activated, so
 * activation is a deliberate, server-side step (the Razorpay webhook can later
 * replace the confirm call without changing the data model).
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
  private async purchaseOneTime(userId: string, dto: PurchasePlanDto): Promise<OneTimePurchaseResult> {
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
  private async purchaseRecurring(userId: string, dto: PurchasePlanDto): Promise<RecurringPurchaseResult> {
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
        razorpaySubscriptionId: { not: null },
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
    let razorpayPlanId = plan.razorpayPlanId;
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

    // Create Razorpay Subscription (total_count = 999 is max allowed, effectively infinite)
    const subscription = await this.razorpayService.createSubscription({
      planId: razorpayPlanId,
      totalCount: Math.max(1, Math.floor(730 / plan.durationDays)), // max allowed by Razorpay; effectively infinite recurring
      customerNotify: true,
      notes: {
        userId,
        planId: plan.id,
        vaultId: target.id,
      },
    });

    // Create local subscription in PENDING state (will be activated on webhook)
    const localSubscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000),
        status: SubscriptionStatus.PENDING,
        razorpaySubscriptionId: subscription.id,
        autoRenew: true,
        nextBillingDate: subscription.charge_at ? new Date(subscription.charge_at * 1000) : null,
        paymentReference: subscription.short_url,
      },
    });

    // Create payment record for the authorization payment
    const payment = await this.prisma.payment.create({
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

    return {
      paymentId: payment.id,
      subscriptionId: localSubscription.id,
      razorpaySubscriptionId: subscription.id,
      shortUrl: subscription.short_url,
      amount: Number(plan.price),
      currency: plan.currency,
      planId: plan.id,
      planName: plan.name,
      vaultId: target.id,
      vaultName: target.name,
      durationDays: plan.durationDays,
      status: payment.status,
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
    };
  }

  /**
   * Mark an owned CREATED payment session as FAILED. This is what a real
   * gateway would report back to the server on a declined payment (and what
   * the test gateway calls for its failure path); a later Razorpay webhook can
   * re-use it unchanged. Failed payments are excluded from coupon usage
   * counting, so this releases any redemption slot the session reserved.
   */
  async failPayment(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status === 'FAILED') {
      return { paymentId: payment.id, status: 'FAILED' };
    }
    if (payment.status !== 'CREATED') {
      throw new BadRequestException('Payment cannot be failed in its current state');
    }
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', webhookEvent: 'payment.failed' },
    });
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
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', webhookEvent: 'payment.signature_failed' },
      });
      throw new BadRequestException('Invalid payment signature');
    }

    return this.activateAfterPayment(userId, payment, dto.razorpay_payment_id, 'payment.verified');
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

    let subscription;
    try {
      subscription = await this.access.createSubscriptionWithSnapshot(userId, meta.planId, {
        status: 'ACTIVE',
        paymentReference: razorpayPaymentId,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'PLAN_NOT_AVAILABLE') {
        throw new ConflictException('The plan is no longer available for purchase');
      }
      throw error;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        subscriptionId: subscription.id,
        razorpayPaymentId,
        webhookEvent,
      },
    });

    // Link the reserved redemption to the activated subscription (no-op for
    // purchases without a coupon).
    await this.prisma.couponUsage.updateMany({
      where: { paymentId: payment.id },
      data: { subscriptionId: subscription.id },
    });

    return {
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
      payment: serializePayment(payment),
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
    return { subscription: sub, payment: serializePayment(payment) };
  }

  async confirmPurchase(userId: string, dto: ConfirmPurchaseDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: { subscription: true },
    });
    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'SUCCESS') {
      if (payment.subscriptionId) {
        const sub = await this.prisma.subscription.findUnique({
          where: { id: payment.subscriptionId },
          include: {
            plan: true,
            vaultAccess: { include: { vault: { select: { id: true, name: true } } } },
          },
        });
        return { subscription: sub, payment: serializePayment(payment) };
      }
      throw new ConflictException('Payment is already processed');
    }
    if (['FAILED', 'REFUNDED', 'CANCELLED'].includes(payment.status)) {
      throw new BadRequestException('Payment cannot be confirmed in its current state');
    }

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

    let subscription;
    try {
      subscription = await this.access.createSubscriptionWithSnapshot(userId, meta.planId, {
        status: 'ACTIVE',
        paymentReference: payment.razorpayOrderId ?? undefined,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'PLAN_NOT_AVAILABLE') {
        throw new ConflictException('The plan is no longer available for purchase');
      }
      throw error;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        subscriptionId: subscription.id,
        razorpayPaymentId: `pay_${randomUUID().replace(/-/g, '')}`,
        webhookEvent: 'payment.confirmed',
      },
    });

    // Link the reserved redemption to the activated subscription (no-op for
    // purchases without a coupon).
    await this.prisma.couponUsage.updateMany({
      where: { paymentId: payment.id },
      data: { subscriptionId: subscription.id },
    });

    return {
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
        createdAt: subscription.createdAt,
        cancelledAt: subscription.cancelledAt ?? null,
        vaultAccess: (subscription.vaultAccess ?? []).map((va: any) => ({
          vaultId: va.vaultId,
          vaultName: va.vault?.name ?? null,
        })),
      },
      payment: {
        id: payment.id,
        status: 'SUCCESS',
        orderId: payment.razorpayOrderId,
        amount: Number(payment.amount),
        currency: payment.currency,
      },
      ...(meta.couponId
        ? {
            coupon: {
              id: meta.couponId,
              code: meta.couponCode ?? null,
              originalAmount: Number(meta.originalAmount ?? 0),
              discountAmount: Number(meta.discountAmount ?? 0),
              finalAmount: Number(payment.amount),
            },
          }
        : {}),
    };
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
