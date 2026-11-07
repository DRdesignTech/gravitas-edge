import { VerifySubscriptionDto } from '../subscriptions/dto/verify-subscription.dto';
import { recordRvaCharge, RVA_AUTOPAY_PLANS } from '../payments/rva-autopay';
import { isCapturedPayment } from '../payments/autopay-evidence';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AUTOPAY_TERM_MONTHS, RazorpayService } from '../payments/razorpay.service';
import { durationLabel } from '../subscriptions/pricing-catalog';
import { RvaCouponsService } from './rva-coupons.service';
import { couponError, normalizeCouponCode, serializeCouponSummary } from '../coupons/coupon.util';
import { Prisma } from '@prisma/client';

export const RVA_PAYMENT_METADATA_KIND = 'RECRUITMENT_VENDOR_ACCESS';

/**
 * Recruitment Vendor Access purchase + activation flow.
 *
 * This is a fully separate payment path from the Opportunity Vault
 * (`PricingService`): it uses `RecruitmentVendorPlan` and writes
 * `RecruitmentVendorSubscription`, and it NEVER sets the generic
 * `Payment.subscriptionId` or creates `SubscriptionVaultAccess`. Activating an
 * RVA purchase therefore cannot unlock the Opportunity Vault (and vice-versa).
 *
 * Prices are always read server-side from the plan row; the client only sends
 * a planId (and an optional RVA-only coupon code whose discount is recomputed
 * server-side).
 */
@Injectable()
export class RvaPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayService: RazorpayService,
    private readonly coupons: RvaCouponsService,
  ) {}

  async purchase(userId: string, planId: string, couponCode?: string, recurring?: boolean) {
    if (recurring) {
      if (couponCode?.trim())
        throw new BadRequestException('Coupons apply to one-time purchases only');
      return this.purchaseRecurring(userId, planId);
    }
    return this.purchaseOneTime(userId, planId, couponCode);
  }

  /**
   * One-time purchase (existing behavior): creates a Razorpay Order.
   */
  private async purchaseOneTime(userId: string, planId: string, couponCode?: string) {
    const plan = await this.prisma.recruitmentVendorPlan.findFirst({
      where: { id: planId, deletedAt: null, isActive: true },
    });
    if (!plan) {
      throw new NotFoundException('Plan is not available for purchase');
    }

    // An empty/whitespace-only coupon code simply means "no coupon".
    if (couponCode !== undefined && normalizeCouponCode(couponCode) !== '') {
      return this.purchaseWithCoupon(userId, couponCode, plan);
    }

    const order = await this.razorpayService.createOrder({
      amount: Number(plan.price),
      currency: plan.currency,
      receipt: `rva_${randomUUID().replace(/-/g, '')}`,
      notes: {
        kind: RVA_PAYMENT_METADATA_KIND,
        userId,
        planId: plan.id,
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
          kind: RVA_PAYMENT_METADATA_KIND,
          recruitmentVendorPlanId: plan.id,
          planId: plan.id,
          planName: plan.name,
          durationDays: plan.durationDays,
          vault: 'recruitment-vendor-access',
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
  private async purchaseRecurring(userId: string, planId: string) {
    const plan = await this.prisma.recruitmentVendorPlan.findFirst({
      where: { id: planId, deletedAt: null, isActive: true },
    });
    if (!plan) {
      throw new NotFoundException('Plan is not available for purchase');
    }

    const billing = RVA_AUTOPAY_PLANS[plan.durationDays];
    if (!billing || plan.currency !== 'INR') {
      throw new BadRequestException('AutoPay is unavailable for this plan');
    }
    const gatewayPlan = await this.razorpayService.fetchPlan(billing.id);
    if (
      gatewayPlan.id !== billing.id ||
      gatewayPlan.period !== 'monthly' ||
      Number(gatewayPlan.interval) !== billing.months ||
      Number(gatewayPlan.item.amount) !== billing.amount * 100 ||
      gatewayPlan.item.currency !== plan.currency
    ) {
      throw new ConflictException('RVA AutoPay plan does not match the configured billing terms');
    }

    let createdRemoteId: string | undefined;
    let payment;
    try {
      payment = await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`);
          const existing = await tx.recruitmentVendorSubscription.findFirst({
            where: {
              userId,
              razorpaySubscriptionId: { not: null },
              autoRenew: true,
              status: { in: ['PENDING', 'ACTIVE'] },
            },
            include: { payments: { orderBy: { createdAt: 'asc' }, take: 1 } },
          });
          if (existing?.status === 'ACTIVE') {
            throw new ConflictException('AutoPay is already active for this account');
          }
          if (existing?.razorpaySubscriptionId) {
            const remote = await this.razorpayService.fetchSubscription(
              existing.razorpaySubscriptionId,
            );
            if (['cancelled', 'expired'].includes(remote.status)) {
              const closed = await tx.recruitmentVendorSubscription.updateMany({
                where: { id: existing.id, status: 'PENDING' },
                data: { status: 'CANCELLED', autoRenew: false, nextBillingDate: null },
              });
              if (closed.count !== 1) {
                throw new ConflictException(
                  'RVA AutoPay checkout state changed. Please try again.',
                );
              }
              await tx.payment.updateMany({
                where: {
                  recruitmentVendorSubscriptionId: existing.id,
                  status: { in: ['CREATED', 'PENDING'] },
                },
                data: { status: 'CANCELLED' },
              });
            } else {
              if (existing.planId !== plan.id || !existing.payments[0]) {
                throw new ConflictException(
                  'Finish or cancel the pending RVA AutoPay checkout first',
                );
              }
              return existing.payments[0];
            }
          }
          const subscription = await this.razorpayService.createSubscription({
            planId: billing.id,
            totalCount: Math.floor(AUTOPAY_TERM_MONTHS / billing.months),
            customerNotify: true,
            expireBy: Math.floor(Date.now() / 1000) + 86_400,
            notes: { userId, planId: plan.id, product: 'rva' },
          });
          createdRemoteId = subscription.id;
          const now = new Date();
          const local = await tx.recruitmentVendorSubscription.create({
            data: {
              userId,
              planId: plan.id,
              startDate: now,
              endDate: now,
              status: 'PENDING',
              razorpaySubscriptionId: subscription.id,
              autoRenew: true,
            },
          });
          return tx.payment.create({
            data: {
              userId,
              recruitmentVendorSubscriptionId: local.id,
              razorpaySubscriptionId: subscription.id,
              amount: billing.amount,
              currency: plan.currency,
              status: 'CREATED',
              metadata: {
                kind: RVA_PAYMENT_METADATA_KIND,
                planId: plan.id,
                planName: plan.name,
                durationDays: plan.durationDays,
                recurring: true,
                gatewayPlanId: billing.id,
              },
            },
          });
        },
        { timeout: 30_000 },
      );
    } catch (error) {
      if (createdRemoteId)
        await this.razorpayService.cancelSubscription(createdRemoteId).catch(() => undefined);
      throw error;
    }
    return {
      paymentId: payment.id,
      orderId: null,
      razorpaySubscriptionId: payment.razorpaySubscriptionId,
      amount: Number(payment.amount),
      currency: plan.currency,
      planId: plan.id,
      planName: plan.name,
      durationDays: plan.durationDays,
      status: payment.status,
      keyId: this.razorpayService.getKeyId(),
    };
  }

  async verifyRecurring(userId: string, dto: VerifySubscriptionDto) {
    const local = await this.assertOwnedRvaPayment(userId, dto.paymentId);
    const remoteId = local.razorpaySubscriptionId;
    if (
      !remoteId ||
      remoteId !== dto.razorpay_subscription_id ||
      !this.razorpayService.verifySubscriptionSignature({
        subscriptionId: remoteId,
        paymentId: dto.razorpay_payment_id,
        signature: dto.razorpay_signature,
      })
    ) {
      throw new BadRequestException('Invalid RVA AutoPay payment signature');
    }
    if (local.status === 'SUCCESS') return { status: 'SUCCESS' as const };
    const [payment, subscription] = await Promise.all([
      this.razorpayService.fetchPayment(dto.razorpay_payment_id),
      this.razorpayService.fetchSubscription(remoteId),
    ]);
    const metadata = local.metadata as { gatewayPlanId?: string } | null;
    if (
      payment.id !== dto.razorpay_payment_id ||
      subscription.id !== remoteId ||
      subscription.plan_id !== metadata?.gatewayPlanId ||
      Number(payment.amount) !== Math.round(Number(local.amount) * 100) ||
      payment.currency !== local.currency
    ) {
      throw new BadRequestException('Payment gateway returned mismatched RVA payment details');
    }
    const captured = isCapturedPayment(payment);
    if (!captured || !subscription.current_end) {
      if (!captured && payment.status !== 'created' && payment.status !== 'authorized') {
        throw new BadRequestException('RVA AutoPay payment was not captured');
      }
      await this.prisma.payment.updateMany({
        where: { id: local.id, status: 'CREATED' },
        data: { status: 'PENDING' },
      });
      return { status: 'PENDING' as const };
    }
    await recordRvaCharge(this.prisma, subscription, payment, 'subscription.verified', local.id);
    return { status: 'SUCCESS' as const };
  }

  /**
   * RVA coupon purchase path: eligibility, limits and discount math are all
   * re-checked inside one transaction, with the RVA coupon row locked so
   * concurrent redemptions serialize on the usage limit instead of
   * double-spending it. The payable amount is derived from the RVA plan price
   * in the database; the full breakdown is stored on the payment metadata and
   * the `RecruitmentVendorCouponUsage` row.
   */
  private async purchaseWithCoupon(
    userId: string,
    rawCode: string,
    plan: {
      id: string;
      name: string;
      price: unknown;
      currency: string;
      durationDays: number;
    },
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

      const order = await this.razorpayService.createOrder({
        amount: Number(finalAmount),
        currency: plan.currency,
        receipt: `rva_${randomUUID().replace(/-/g, '')}`,
        notes: {
          kind: RVA_PAYMENT_METADATA_KIND,
          userId,
          planId: plan.id,
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
            kind: RVA_PAYMENT_METADATA_KIND,
            recruitmentVendorPlanId: plan.id,
            planId: plan.id,
            planName: plan.name,
            durationDays: plan.durationDays,
            vault: 'recruitment-vendor-access',
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
      await tx.recruitmentVendorCouponUsage.create({
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
        durationDays: plan.durationDays,
        status: payment.status,
        keyId: this.razorpayService.getKeyId(),
      };
    });
  }

  async getPaymentSession(userId: string, paymentId: string) {
    const payment = await this.assertOwnedRvaPayment(userId, paymentId);
    const meta = (payment.metadata ?? {}) as {
      planId?: string;
      planName?: string;
      durationDays?: number;
      couponCode?: string;
      originalAmount?: number;
      discountAmount?: number;
    };
    return {
      paymentId: payment.id,
      orderId: payment.razorpayOrderId,
      razorpaySubscriptionId: payment.razorpaySubscriptionId,
      status: payment.status,
      amount: Number(payment.amount),
      currency: payment.currency,
      planId: meta.planId ?? null,
      planName: meta.planName ?? null,
      durationDays: meta.durationDays ?? null,
      couponCode: meta.couponCode ?? null,
      originalAmount: Number(meta.originalAmount ?? payment.amount),
      discountAmount: Number(meta.discountAmount ?? 0),
      finalAmount: Number(payment.amount),
      keyId: this.razorpayService.getKeyId(),
    };
  }

  async failPayment(userId: string, paymentId: string) {
    const payment = await this.assertOwnedRvaPayment(userId, paymentId);
    if (payment.razorpaySubscriptionId) {
      if (payment.status !== 'CREATED') return { paymentId: payment.id, status: payment.status };
      const remote = await this.razorpayService.fetchSubscription(payment.razorpaySubscriptionId);
      if (remote.status === 'created') {
        await this.razorpayService.cancelSubscription(remote.id);
      } else if (!['cancelled', 'expired'].includes(remote.status)) {
        throw new ConflictException('RVA AutoPay authorization has already started');
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.recruitmentVendorSubscription.updateMany({
          where: { id: payment.recruitmentVendorSubscriptionId!, status: 'PENDING' },
          data: { status: 'CANCELLED', autoRenew: false, nextBillingDate: null },
        });
        await tx.payment.updateMany({
          where: { id: payment.id, status: 'CREATED' },
          data: { status: 'CANCELLED' },
        });
      });
      return { paymentId: payment.id, status: 'CANCELLED' };
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

  async verifyPayment(
    userId: string,
    dto: {
      paymentId: string;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ) {
    const payment = await this.assertOwnedRvaPayment(userId, dto.paymentId);

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

  async confirmPurchase(userId: string, paymentId: string) {
    const payment = await this.assertOwnedRvaPayment(userId, paymentId);

    if (payment.status === 'SUCCESS') {
      if (payment.recruitmentVendorSubscriptionId) {
        return this.successResponse(payment);
      }
      throw new ConflictException('Payment is already processed');
    }
    if (['FAILED', 'REFUNDED', 'CANCELLED'].includes(payment.status)) {
      throw new BadRequestException('Payment cannot be confirmed in its current state');
    }

    if (Number(payment.amount) !== 0 || payment.razorpaySubscriptionId) {
      throw new BadRequestException('Payment must be verified before confirming this purchase');
    }
    return this.activateAfterPayment(userId, payment, null, 'purchase.confirmed');
  }

  private async activateAfterPayment(
    userId: string,
    payment: {
      id: string;
      status: string;
      amount: unknown;
      currency: string;
      metadata: unknown;
      razorpayOrderId: string | null;
      razorpayPaymentId: string | null;
    },
    razorpayPaymentId: string | null,
    webhookEvent: string,
  ) {
    const meta = (payment.metadata ?? {}) as {
      planId?: string;
      couponId?: string;
      couponCode?: string;
      originalAmount?: number;
      discountAmount?: number;
    };
    if (!meta.planId) {
      throw new BadRequestException('Purchase session is missing required metadata');
    }

    const plan = await this.prisma.recruitmentVendorPlan.findFirst({
      where: { id: meta.planId, deletedAt: null, isActive: true },
    });
    if (!plan) {
      throw new ConflictException('The plan is no longer available for purchase');
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.recruitmentVendorSubscription.create({
        data: {
          userId,
          planId: plan.id,
          startDate,
          endDate,
          status: 'ACTIVE',
          paymentReference: razorpayPaymentId ?? payment.id,
        },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          recruitmentVendorSubscriptionId: subscription.id,
          razorpayPaymentId: razorpayPaymentId ?? undefined,
          webhookEvent,
        },
      });

      // Link the reserved redemption to the activated RVA subscription
      // (no-op for purchases without a coupon).
      await tx.recruitmentVendorCouponUsage.updateMany({
        where: { paymentId: payment.id },
        data: { recruitmentVendorSubscriptionId: subscription.id },
      });

      return subscription;
    });

    return {
      subscription: {
        id: result.id,
        plan: {
          id: plan.id,
          name: plan.name,
          price: Number(plan.price),
          regularPrice: Number(plan.regularPrice),
          discountedPrice: Number(plan.price),
          discountPercentage: plan.discountPercentage,
          currency: plan.currency,
          durationDays: plan.durationDays,
          durationLabel: durationLabel(plan.durationDays),
        },
        status: result.status,
        startDate: result.startDate,
        endDate: result.endDate,
        vault: 'recruitment-vendor-access',
      },
      payment: {
        id: payment.id,
        status: 'SUCCESS',
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

  private async successResponse(payment: {
    id: string;
    recruitmentVendorSubscriptionId: string | null;
    status: string;
    amount: unknown;
    currency: string;
    metadata: unknown;
  }) {
    if (!payment.recruitmentVendorSubscriptionId) {
      throw new ConflictException('Payment is already processed');
    }
    const sub = await this.prisma.recruitmentVendorSubscription.findUnique({
      where: { id: payment.recruitmentVendorSubscriptionId },
      include: { plan: true },
    });
    const meta = (payment.metadata ?? {}) as {
      couponId?: string;
      couponCode?: string;
      originalAmount?: number;
      discountAmount?: number;
    };
    return {
      subscription: sub
        ? {
            id: sub.id,
            plan: sub.plan
              ? {
                  id: sub.plan.id,
                  name: sub.plan.name,
                  price: Number(sub.plan.price),
                  regularPrice: Number(sub.plan.regularPrice),
                  discountedPrice: Number(sub.plan.price),
                  discountPercentage: sub.plan.discountPercentage,
                  currency: sub.plan.currency,
                  durationDays: sub.plan.durationDays,
                  durationLabel: durationLabel(sub.plan.durationDays),
                }
              : null,
            status: sub.status,
            startDate: sub.startDate,
            endDate: sub.endDate,
            vault: 'recruitment-vendor-access',
          }
        : null,
      payment: {
        id: payment.id,
        status: payment.status,
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

  /**
   * Loads a payment and guarantees it belongs to the user AND to the RVA vault
   * (kind marker). This prevents an Opportunity Vault payment id from being
   * used against RVA endpoints.
   */
  private async assertOwnedRvaPayment(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }
    const meta = (payment.metadata ?? {}) as { kind?: string };
    if (meta.kind !== RVA_PAYMENT_METADATA_KIND) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }
}
