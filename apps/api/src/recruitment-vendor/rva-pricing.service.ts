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
 * a planId.
 */
@Injectable()
export class RvaPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayService: RazorpayService,
  ) {}

  async purchase(userId: string, planId: string) {
    const plan = await this.prisma.recruitmentVendorPlan.findFirst({
      where: { id: planId, deletedAt: null, isActive: true },
    });
    if (!plan) {
      throw new NotFoundException('Plan is not available for purchase');
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
    };
  }

  async getPaymentSession(userId: string, paymentId: string) {
    const payment = await this.assertOwnedRvaPayment(userId, paymentId);
    const meta = (payment.metadata ?? {}) as {
      planId?: string;
      planName?: string;
      durationDays?: number;
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
    const meta = (payment.metadata ?? {}) as { planId?: string };
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
    };
  }

  private async successResponse(payment: {
    id: string;
    recruitmentVendorSubscriptionId: string | null;
    status: string;
    amount: unknown;
    currency: string;
  }) {
    if (!payment.recruitmentVendorSubscriptionId) {
      throw new ConflictException('Payment is already processed');
    }
    const sub = await this.prisma.recruitmentVendorSubscription.findUnique({
      where: { id: payment.recruitmentVendorSubscriptionId },
      include: { plan: true },
    });
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
