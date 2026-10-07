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
   */
  async purchase(userId: string, dto: PurchasePlanDto) {
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

    const orderId = `order_${randomUUID().replace(/-/g, '')}`;
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: plan.price,
        currency: plan.currency,
        status: 'CREATED',
        razorpayOrderId: orderId,
        metadata: {
          planId: plan.id,
          planName: plan.name,
          vaultId: target.id,
          vaultName: target.name,
          durationDays: plan.durationDays,
        },
      },
    });

    return {
      paymentId: payment.id,
      orderId: payment.razorpayOrderId,
      amount: Number(payment.amount),
      currency: payment.currency,
      planId: plan.id,
      planName: plan.name,
      vaultId: target.id,
      vaultName: target.name,
      durationDays: plan.durationDays,
      status: payment.status,
    };
  }

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
  ) {
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

      const orderId = `order_${randomUUID().replace(/-/g, '')}`;
      const payment = await tx.payment.create({
        data: {
          userId,
          amount: finalAmount,
          currency: plan.currency,
          status: 'CREATED',
          razorpayOrderId: orderId,
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
        orderId: payment.razorpayOrderId,
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
    };

    return {
      paymentId: payment.id,
      orderId: payment.razorpayOrderId,
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

  /**
   * Confirm a purchase: marks the owned CREATED payment as SUCCESS and only then
   * activates the subscription (with vault snapshot) for the user. Idempotent:
   * an already-confirmed payment returns its subscription instead of
   * double-activating.
   */
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
