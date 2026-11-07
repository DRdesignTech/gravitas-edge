import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isCapturedPayment } from './autopay-evidence';

export const RVA_AUTOPAY_PLANS: Partial<
  Record<number, { id: string; months: number; amount: number }>
> = {
  30: { id: 'plan_TxBhWt43qdQklZ', months: 1, amount: 3999 },
  90: { id: 'plan_TxBiqnkdD7mFqD', months: 3, amount: 10999 },
  180: { id: 'plan_TxBnbK6ey5JBRu', months: 6, amount: 19999 },
};

export async function recordRvaCharge(
  prisma: PrismaService,
  subscription: {
    id: string;
    plan_id: string;
    status: string;
    current_end?: number | null;
    current_start?: number | null;
    charge_at?: number | null;
  },
  payment: {
    id: string;
    status: string;
    captured: boolean | number | string;
    subscription_id?: string | null;
    amount: number | string;
    currency: string;
  },
  event: string,
  checkoutId?: string,
) {
  const currentEnd = subscription.current_end;
  if (
    !isCapturedPayment(payment) ||
    !currentEnd ||
    (payment.subscription_id && payment.subscription_id !== subscription.id)
  ) {
    throw new BadRequestException('RVA charge is not captured or does not match the subscription');
  }
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "RecruitmentVendorSubscription" WHERE "razorpaySubscriptionId" = ${subscription.id} FOR UPDATE`,
    );
    const local = await tx.recruitmentVendorSubscription.findUniqueOrThrow({
      where: { razorpaySubscriptionId: subscription.id },
    });
    const initial = await tx.payment.findFirstOrThrow({
      where: { recruitmentVendorSubscriptionId: local.id },
      orderBy: { createdAt: 'asc' },
    });
    const metadata = initial.metadata as { gatewayPlanId?: string } | null;
    if (
      metadata?.gatewayPlanId !== subscription.plan_id ||
      (checkoutId && initial.id !== checkoutId) ||
      Number(payment.amount) !== Math.round(Number(initial.amount) * 100) ||
      payment.currency !== initial.currency
    ) {
      throw new BadRequestException('RVA charge does not match the checkout terms');
    }
    const existing = await tx.payment.findUnique({ where: { razorpayPaymentId: payment.id } });
    if (existing) {
      if (existing.recruitmentVendorSubscriptionId !== local.id || existing.status !== 'SUCCESS') {
        throw new BadRequestException('RVA charge is already linked to another payment');
      }
      return existing;
    }
    if (checkoutId && initial.status === 'SUCCESS') {
      throw new BadRequestException('RVA checkout is already settled');
    }

    const firstCharge = initial.status !== 'SUCCESS';
    const paidEnd = new Date(currentEnd * 1000);
    const autoRenew =
      local.autoRenew && !['cancelled', 'completed', 'expired'].includes(subscription.status);
    await tx.recruitmentVendorSubscription.update({
      where: { id: local.id },
      data: {
        status: 'ACTIVE',
        startDate:
          firstCharge && subscription.current_start
            ? new Date(subscription.current_start * 1000)
            : local.startDate,
        endDate: firstCharge || paidEnd > local.endDate ? paidEnd : local.endDate,
        autoRenew,
        nextBillingDate: !autoRenew
          ? null
          : !firstCharge && paidEnd < local.endDate
            ? local.nextBillingDate
            : subscription.charge_at
              ? new Date(subscription.charge_at * 1000)
              : null,
      },
    });

    const captured = {
      status: 'SUCCESS' as const,
      razorpayPaymentId: payment.id,
      webhookEvent: event,
    };
    return firstCharge
      ? tx.payment.update({ where: { id: initial.id }, data: captured })
      : tx.payment.create({
          data: {
            ...captured,
            userId: local.userId,
            recruitmentVendorSubscriptionId: local.id,
            razorpaySubscriptionId: subscription.id,
            amount: initial.amount,
            currency: initial.currency,
            metadata: initial.metadata ?? Prisma.JsonNull,
          },
        });
  });
}
