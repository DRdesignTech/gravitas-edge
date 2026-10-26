import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';

export const CANCELLED_AWAITING_CAPTURE =
  'AutoPay cancelled; captured charge awaiting reconciliation';
export const CLEANUP_PENDING = 'AutoPay cleanup pending';
export const CLEANUP_CONFIRMED = 'AutoPay cleanup confirmed';

// Every AutoPay writer takes this lock before reading state. No gateway call
// belongs inside this transaction: remote cleanup is a retryable two-phase operation.
export async function lockSubscription(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "Subscription" WHERE "id" = ${id} FOR UPDATE`;
}

export async function cleanupUnpaidAutoPay(
  prisma: PrismaService,
  gateway: RazorpayService,
  subscriptionId: string,
) {
  const sub = await prisma.$transaction(async (tx) => {
    await lockSubscription(tx, subscriptionId);
    const current = await tx.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });
    const paid = await tx.payment.findFirst({ where: { subscriptionId, status: 'SUCCESS' } });
    if (paid || current.status === 'ACTIVE') {
      throw new ConflictException('Payment is already captured; refresh payment status');
    }
    if (current.cancellationReason === CLEANUP_CONFIRMED) return null;
    // Keep the uniqueness reservation until remote cancellation is confirmed.
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'PENDING', autoRenew: true, cancellationReason: CLEANUP_PENDING },
    });
    return current;
  });
  if (!sub) return;

  const remote = await confirmUnpaidCancellation(gateway, sub.razorpaySubscriptionId!);

  const captured = await prisma.$transaction(async (tx) => {
    await lockSubscription(tx, subscriptionId);
    const current = await tx.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });
    const paid = await tx.payment.findFirst({ where: { subscriptionId, status: 'SUCCESS' } });
    if (paid || current.status === 'ACTIVE') {
      // Capture won the race. Preserve paid-through access, but the mandate is
      // now cancelled remotely, so do not advertise future automatic renewal.
      if (remote.cancelled) {
        await tx.subscription.update({
          where: { id: subscriptionId },
          data: { autoRenew: false, nextBillingDate: null },
        });
      }
      return true;
    }
    if (remote.paid) return true; // keep reservation until capture reconciliation
    await tx.payment.updateMany({
      where: { subscriptionId, status: { in: ['CREATED', 'PENDING'] } },
      data: { status: 'FAILED', webhookEvent: 'payment.abandoned' },
    });
    await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED',
        autoRenew: false,
        nextBillingDate: null,
        cancelledAt: new Date(),
        cancellationReason: CLEANUP_CONFIRMED,
      },
    });
    return false;
  });
  if (captured)
    throw new ConflictException('Payment was captured during cancellation; refresh payment status');
}

export async function confirmUnpaidCancellation(gateway: RazorpayService, remoteId: string) {
  try {
    const remote = await gateway.fetchSubscription(remoteId);
    // A capture can precede its webhook. Never release this purchase for retry
    // until that capture has been reconciled locally.
    if (typeof remote.paid_count !== 'number') throw new Error('Gateway payment count unknown');
    if (remote.paid_count > 0)
      return {
        paid: true,
        cancelled: ['cancelled', 'completed', 'expired'].includes(remote.status),
      };
    if (!['cancelled', 'completed', 'expired'].includes(remote.status)) {
      await gateway.cancelSubscription(remoteId, false);
    }
    const confirmed = await gateway.fetchSubscription(remoteId);
    if (
      !['cancelled', 'completed', 'expired'].includes(confirmed.status) ||
      typeof confirmed.paid_count !== 'number'
    ) {
      throw new Error('Remote cleanup is not confirmed');
    }
    return { paid: confirmed.paid_count > 0, cancelled: true };
  } catch {
    throw new ServiceUnavailableException(
      'AutoPay cleanup is pending. Retry cancellation; a new purchase is blocked until cleanup is confirmed.',
    );
  }
}

/** Called by a worker/operator; no timer or production job is installed here. */
export async function reconcileAutoPayCleanup(prisma: PrismaService, gateway: RazorpayService) {
  const pending = await prisma.subscription.findMany({
    where: {
      status: 'PENDING',
      razorpaySubscriptionId: { not: null },
      OR: [
        { cancellationReason: CLEANUP_PENDING },
        { createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } },
      ],
    },
    take: 100,
    orderBy: { createdAt: 'asc' },
  });
  const results: { id: string; repaired: boolean; error?: string }[] = [];
  for (const sub of pending) {
    try {
      await cleanupUnpaidAutoPay(prisma, gateway, sub.id);
      results.push({ id: sub.id, repaired: true });
    } catch (error) {
      results.push({
        id: sub.id,
        repaired: false,
        error: error instanceof Error ? error.message : 'Cleanup failed',
      });
    }
  }
  const creations = await prisma.webhookEvent.findMany({
    where: {
      eventType: 'autopay.creation',
      processed: false,
      createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
    },
    take: 100,
    orderBy: { createdAt: 'asc' },
  });
  for (const creation of creations) {
    try {
      const remoteId = (creation.payload as { razorpaySubscriptionId?: string })
        .razorpaySubscriptionId;
      if (!remoteId)
        throw new Error(
          'Gateway creation result unknown; operator must locate subscription using user/plan notes',
        );
      const result = await confirmUnpaidCancellation(gateway, remoteId);
      if (result.paid)
        throw new Error('Orphan has a captured payment; operator reconciliation required');
      await prisma.webhookEvent.update({ where: { id: creation.id }, data: { processed: true } });
      results.push({ id: creation.id, repaired: true });
    } catch (error) {
      results.push({
        id: creation.id,
        repaired: false,
        error: error instanceof Error ? error.message : 'Cleanup failed',
      });
    }
  }
  return results;
}
