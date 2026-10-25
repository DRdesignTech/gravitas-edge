import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from '../payments/razorpay.service';
import { durationLabel } from '../subscriptions/pricing-catalog';
import { RvaCouponsService } from './rva-coupons.service';
import { couponError, normalizeCouponCode, serializeCouponSummary } from '../coupons/coupon.util';
import { SubscriptionStatus } from '@prisma/client';

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

    // Coupons not supported for recurring subscriptions in this phase
    // (couponCode parameter is ignored for recurring)

    // Get or create Razorpay Plan
    let razorpayPlanId = plan.razorpayPlanId;
    if (!razorpayPlanId) {
      const razorpayPlan = await this.razorpayService.createPlan({
        name: plan.name,
        amount: Number(plan.price),
        currency: plan.currency,
        interval: 1,
        period: this.durationDaysToPeriod(plan.durationDays),
        description: `Subscription for ${plan.name}`,
      });
      razorpayPlanId = razorpayPlan.id;
      await this.prisma.recruitmentVendorPlan.update({
        where: { id: plan.id },
        data: { razorpayPlanId },
      });
    }

    // Create Razorpay Subscription (total_count = 0 means infinite)
    const subscription = await this.razorpayService.createSubscription({
      planId: razorpayPlanId,
      totalCount: 0, // infinite recurring
      customerNotify: true,
      notes: {
        userId,
        planId: plan.id,
      },
    });

    // Create local subscription in PENDING state (will be activated on webhook)
    const localSubscription = await this.prisma.recruitmentVendorSubscription.create({
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
        recruitmentVendorSubscriptionId: localSubscription.id,
        razorpaySubscriptionId: subscription.id,
        amount: plan.price,
        currency: plan.currency,
        status: 'CREATED',
        metadata: {
          kind: RVA_PAYMENT_METADATA_KIND,
          recruitmentVendorPlanId: plan.id,
          planId: plan.id,
          planName: plan.name,
          durationDays: plan.durationDays,
          vault: 'recruitment-vendor-access',
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
      durationDays: plan.durationDays,
      status: payment.status,
      keyId: this.razorpayService.getKeyId(),
      recurring: true,
    };
  }

  private durationDaysToPeriod(days: number): 'daily' | 'weekly' | 'monthly' | 'yearly' {
    if (days <= 7) return 'weekly';
    if (days <= 31) return 'monthly';
    if (days <= 366) return 'yearly';
    return 'monthly';
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
