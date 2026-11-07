import { recordRvaCharge, RVA_AUTOPAY_PLANS } from './rva-autopay';
import {
  assertLocalPaymentEvidence,
  assertSubscriptionEvidence,
  isCapturedPayment,
} from './autopay-evidence';
import { SubscriptionAccessService } from '../access/subscription-access.service';
import {
  CANCELLED_AWAITING_CAPTURE,
  cleanupUnpaidAutoPay,
  lockSubscription,
} from './autopay-cleanup';
import { RazorpayService } from './razorpay.service';
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, SubscriptionStatus, Prisma } from '@prisma/client';

interface RazorpayWebhookEvent {
  id?: string;
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    subscription?: {
      entity: RazorpaySubscription;
    };
    payment?: {
      entity: RazorpayPayment;
    };
  };
}

interface RazorpaySubscription {
  id: string;
  entity: string;
  plan_id: string;
  status:
    | 'created'
    | 'authenticated'
    | 'active'
    | 'pending'
    | 'halted'
    | 'cancelled'
    | 'completed'
    | 'expired';
  current_start: number | null;
  current_end: number | null;
  ended_at: number | null;
  charge_at: number;
  start_at: number;
  end_at: number;
  auth_attempts: number;
  paid_count: number;
  created_at: number;
  short_url: string;
  has_scheduled_changes: boolean;
  change_scheduled_at: number | null;
  source: string;
  remaining_count: string;
  customer_id: string | null;
  payment_method: string | null;
  notes?: Record<string, string>;
}

interface RazorpayPayment {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id: string | null;
  invoice_id: string | null;
  international: boolean;
  method: string | null;
  amount_refunded: number;
  refund_status: string | null;
  captured: boolean | number | string;
  description: string | null;
  card_id: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  email: string;
  contact: string;
  notes: Record<string, string>;
  fee: number;
  tax: number;
  error_code: string | null;
  error_description: string | null;
  created_at: number;
  subscription_id?: string | null;
  customer_id?: string | null;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayService: RazorpayService,
    private readonly subscriptionAccess: SubscriptionAccessService,
  ) {}

  async handleWebhook(
    event: RazorpayWebhookEvent,
    expectedCheckoutPaymentId?: string,
  ): Promise<void> {
    // Deterministic event ID for safe idempotency
    const rzpEventId = (event as any).id;
    const subscriptionId = event.payload.subscription?.entity?.id;
    const paymentId = event.payload.payment?.entity?.id;
    const eventTimestamp =
      (event as any).created_at ||
      event.payload.payment?.entity?.created_at ||
      event.payload.subscription?.entity?.created_at ||
      0;
    const eventId =
      rzpEventId ||
      `${event.event}_${paymentId || subscriptionId || event.account_id || 'unknown'}_${eventTimestamp}`;

    this.logger.log(`Processing webhook event: ${event.event} for ${subscriptionId || paymentId}`);

    // Creating the unique event row is the durable claim. A concurrent delivery
    // that loses this race must not run a second set of payment side effects.
    try {
      await this.prisma.webhookEvent.create({
        data: {
          eventId,
          eventType: event.event,
          payload: event as any,
          processed: false,
        },
      });
    } catch (err: any) {
      // The active delivery owns this event. If it fails it returns 500 and
      // Razorpay can retry after the event row is released below.
      if (err.code === 'P2002') {
        this.logger.log(`Webhook event ${eventId} is already claimed or processed, skipping`);
        return;
      } else {
        throw err;
      }
    }

    try {
      if (!(await this.handleRvaSubscriptionEvent(event))) {
        switch (event.event) {
          case 'subscription.authenticated':
            await this.handleSubscriptionAuthenticated(event);
            break;
          case 'subscription.activated':
            await this.handleSubscriptionActivated(event);
            break;
          case 'subscription.charged':
          case 'invoice.paid': // sometimes used
            await this.handleSubscriptionCharged(event, expectedCheckoutPaymentId);
            break;
          case 'subscription.payment_failed':
          case 'payment.failed':
            await this.handleSubscriptionPaymentFailed(event);
            break;
          case 'subscription.cancelled':
            await this.handleSubscriptionCancelled(event);
            break;
          case 'subscription.completed':
            await this.handleSubscriptionCompleted(event);
            break;
          case 'subscription.halted':
            await this.handleSubscriptionHalted(event);
            break;
          case 'subscription.pending':
            await this.handleSubscriptionPending(event);
            break;
          case 'subscription.expired':
            await this.handleSubscriptionExpired(event);
            break;
          case 'subscription.paused':
            await this.handleSubscriptionHalted(event); // treat as similar
            break;
          case 'subscription.resumed':
            await this.handleSubscriptionActivated(event);
            break;
          default:
            this.logger.warn(`Unhandled webhook event type: ${event.event}`);
        }
      }

      // This means dispatch completed without error, not that every event
      // granted access (authenticated/pending are informational). Charged and
      // activated-with-capture handlers must commit or throw before this flag.
      // Mark as processed
      await this.prisma.webhookEvent.update({
        where: { eventId },
        data: { processed: true },
      });

      this.logger.log(`Successfully processed webhook event: ${event.event}`);
    } catch (error) {
      // Leave the event eligible for a later Razorpay retry. We intentionally
      // do not mark it processed after a failed side effect.
      await this.prisma.webhookEvent.delete({ where: { eventId } }).catch(() => undefined);
      this.logger.error(`Failed to process webhook event ${event.event}:`, error);
      throw error;
    }
  }

  /** Operator-only recovery. Dry-run by default; never trusts a processed receipt as proof of payment. */
  async reconcileCapturedPayment(localPaymentId: string, gatewayPaymentId: string, apply = false) {
    const local = await this.prisma.payment.findUniqueOrThrow({
      where: { id: localPaymentId },
      include: { subscription: { include: { plan: true } } },
    });
    if (
      !local.subscription?.razorpaySubscriptionId ||
      (local.razorpayPaymentId && local.razorpayPaymentId !== gatewayPaymentId)
    ) {
      throw new Error('Reconciliation requires the original AutoPay checkout session');
    }
    const payment = await this.razorpayService.fetchPayment(gatewayPaymentId);
    const subscription = await this.razorpayService.fetchSubscription(
      local.subscription.razorpaySubscriptionId,
    );
    if (
      payment.id !== gatewayPaymentId ||
      !isCapturedPayment(payment) ||
      Number(payment.amount_refunded ?? 0) !== 0
    ) {
      throw new Error('Gateway record is not an unrefunded captured payment');
    }
    assertSubscriptionEvidence(local.subscription, subscription, payment);
    assertLocalPaymentEvidence(local, local.subscription, payment);
    // No Checkout HMAC or signed envelope exists in this operator path: prove
    // the gateway association from the invoice when payment omits the field.
    if (payment.subscription_id == null) {
      if (!payment.invoice_id)
        throw new Error('Gateway invoice required to prove subscription binding');
      const invoice = (await this.razorpayService.fetchInvoice(payment.invoice_id)) as {
        id: string;
        payment_id?: string;
        subscription_id?: string;
        order_id?: string | null;
      };
      if (
        invoice.id !== payment.invoice_id ||
        invoice.payment_id !== payment.id ||
        invoice.subscription_id !== subscription.id ||
        (invoice.order_id && invoice.order_id !== payment.order_id)
      ) {
        throw new Error('Gateway invoice does not bind this payment to this subscription');
      }
    }
    if (
      !['PENDING', 'ACTIVE'].includes(local.subscription.status) ||
      !['CREATED', 'PENDING', 'SUCCESS'].includes(local.status)
    ) {
      throw new Error('Terminal checkout requires deliberate operator review');
    }
    const result = {
      localPaymentId: local.id,
      localSubscriptionId: local.subscription.id,
      gatewayPaymentId: payment.id,
      gatewaySubscriptionId: subscription.id,
      amount: Number(local.amount),
      currency: local.currency,
      applied: apply,
    };
    if (apply) {
      // A separate recovery receipt avoids deleting or bypassing old processed
      // events. Payment-ID idempotency and the same row-locked transaction apply.
      await this.handleWebhook(
        {
          id: `autopay_reconciliation_${payment.id}`,
          entity: 'event',
          account_id: 'internal-gateway-verified-reconciliation',
          event: 'subscription.charged',
          contains: ['subscription', 'payment'],
          payload: {
            subscription: { entity: subscription as unknown as RazorpaySubscription },
            payment: {
              entity: { ...payment, amount: Number(payment.amount) } as unknown as RazorpayPayment,
            },
          },
        },
        local.id,
      );
      const repaired = await this.prisma.payment.findUniqueOrThrow({
        where: { id: local.id },
        include: { subscription: true },
      });
      if (
        repaired.status !== 'SUCCESS' ||
        repaired.razorpayPaymentId !== payment.id ||
        repaired.subscription?.status !== 'ACTIVE'
      ) {
        throw new Error(
          'Reconciliation receipt exists but capture is not committed; operator review required',
        );
      }
    }
    return result;
  }

  private async ensureVaultAccess(
    subscriptionId: string,
    planId: string,
    db: Pick<PrismaService, 'subscriptionPlan' | 'subscriptionVaultAccess'> = this.prisma,
  ): Promise<void> {
    const plan = await db.subscriptionPlan.findUnique({
      where: { id: planId },
      include: {
        vaults: {
          where: { vault: { deletedAt: null, status: 'ACTIVE' } },
        },
      },
    });
    if (plan && plan.vaults.length > 0) {
      await db.subscriptionVaultAccess.createMany({
        data: plan.vaults.map((v) => ({
          subscriptionId,
          vaultId: v.vaultId,
        })),
        skipDuplicates: true,
      });
    }
  }

  private async handleSubscriptionAuthenticated(event: RazorpayWebhookEvent): Promise<void> {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) return;

    // Reject excluded plans
    if (subscription.plan_id === 'plan_Trq9hv9Sx7SUb7') {
      this.logger.warn(
        `Rejected webhook for excluded plan ${subscription.plan_id} on subscription ${subscription.id}`,
      );
      return;
    }

    this.logger.log(
      `Subscription authenticated: ${subscription.id}, customer: ${subscription.customer_id}`,
    );

    // Mandate authentication is not a captured charge. It must never create
    // vault access, activate a subscription, or mark a payment successful.
    const localSub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
      include: { plan: true },
    });

    if (!localSub) {
      this.logger.warn(`No local subscription found for Razorpay subscription: ${subscription.id}`);
      return;
    }

    this.logger.log(`Mandate authenticated for ${localSub.id}; waiting for captured charge`);
  }

  private async handleSubscriptionActivated(event: RazorpayWebhookEvent): Promise<void> {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) return;

    if (subscription.plan_id === 'plan_Trq9hv9Sx7SUb7') {
      this.logger.warn(
        `Rejected webhook for excluded plan ${subscription.plan_id} on subscription ${subscription.id}`,
      );
      return;
    }

    if (event.payload.payment?.entity.status === 'captured') {
      await this.handleSubscriptionCharged(event);
      return;
    }

    this.logger.log(`Subscription activated: ${subscription.id}`);

    const localSub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
      include: { plan: true },
    });

    if (!localSub) {
      this.logger.warn(`No local subscription found for Razorpay subscription: ${subscription.id}`);
      return;
    }

    // Razorpay may emit this before the first charge. Captured payment events
    // are the only webhook path allowed to grant a paid entitlement.
    this.logger.log(
      `Subscription ${localSub.id} activated at Razorpay; waiting for captured charge`,
    );
  }

  private async handleRvaSubscriptionEvent(event: RazorpayWebhookEvent): Promise<boolean> {
    const subscription = event.payload.subscription?.entity;
    const payment = event.payload.payment?.entity;
    const remoteId = subscription?.id ?? payment?.subscription_id;
    if (!remoteId) return false;
    if (
      subscription &&
      !Object.values(RVA_AUTOPAY_PLANS).some((plan) => plan?.id === subscription.plan_id)
    ) {
      return false;
    }
    // Payment-only events can belong to either product.
    const local = await this.prisma.recruitmentVendorSubscription.findUnique({
      where: { razorpaySubscriptionId: remoteId },
    });
    if (!local) {
      if (subscription) throw new Error('RVA subscription not persisted yet; retry webhook');
      return false;
    }

    if (['subscription.charged', 'invoice.paid'].includes(event.event)) {
      if (!payment) throw new Error('Missing payment in RVA charge event');
      const chargedSubscription =
        subscription ?? (await this.razorpayService.fetchSubscription(remoteId));
      await recordRvaCharge(this.prisma, chargedSubscription, payment, event.event);
    } else if (
      ['subscription.cancelled', 'subscription.completed', 'subscription.expired'].includes(
        event.event,
      )
    ) {
      await this.prisma.$transaction(async (tx) => {
        await tx.recruitmentVendorSubscription.update({
          where: { id: local.id },
          data: { autoRenew: false, nextBillingDate: null },
        });
        await tx.recruitmentVendorSubscription.updateMany({
          where: { id: local.id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
        await tx.payment.updateMany({
          where: {
            recruitmentVendorSubscriptionId: local.id,
            status: { in: ['CREATED', 'PENDING'] },
          },
          data: { status: 'CANCELLED', webhookEvent: event.event },
        });
      });
    } else if (['subscription.halted', 'subscription.paused'].includes(event.event)) {
      await this.prisma.recruitmentVendorSubscription.update({
        where: { id: local.id },
        data: { nextBillingDate: null },
      });
    } else if (
      payment?.status === 'failed' &&
      ['payment.failed', 'subscription.payment_failed'].includes(event.event)
    ) {
      // The mandate can retry. Keep the checkout recoverable and preserve any paid term.
      await this.prisma.payment.updateMany({
        where: { recruitmentVendorSubscriptionId: local.id, status: 'CREATED' },
        data: { webhookEvent: event.event },
      });
    }
    return true;
  }

  private async handleSubscriptionCharged(
    event: RazorpayWebhookEvent,
    expectedCheckoutPaymentId?: string,
  ): Promise<void> {
    const subscription = event.payload.subscription?.entity;
    const payment = event.payload.payment?.entity;

    if (!subscription || !payment) {
      throw new Error('Missing subscription or payment in charged event');
    }
    if (
      !isCapturedPayment(payment) ||
      (payment.subscription_id != null && payment.subscription_id !== subscription.id)
    ) {
      throw new Error(`Non-captured or mismatched charge for ${subscription.id}`);
    }
    if (subscription.plan_id === 'plan_Trq9hv9Sx7SUb7') {
      this.logger.warn(
        `Rejected webhook for excluded plan ${subscription.plan_id} on subscription ${subscription.id}`,
      );
      return;
    }
    // Also check if local plan is mapped to excluded
    if (subscription.plan_id === 'plan_Trq302lYgONage') {
      this.logger.warn(
        `Blocked webhook for mismatched Remote 6-month plan ${subscription.plan_id}`,
      );
      return;
    }

    this.logger.log(
      `Subscription charged: ${subscription.id}, payment: ${payment.id}, amount: ${payment.amount}`,
    );

    const candidate = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
    });
    if (!candidate) throw new Error('Subscription not persisted yet; retry webhook');
    await this.prisma.$transaction(async (tx) => {
      await lockSubscription(tx, candidate.id);
      const localSub = await tx.subscription.findFirst({
        where: { razorpaySubscriptionId: subscription.id },
        include: { plan: true },
      });

      if (!localSub) {
        throw new Error(`Local subscription disappeared before charge commit: ${subscription.id}`);
      }

      // Do not resurrect explicitly cancelled or completed subscriptions
      if (
        localSub.status === SubscriptionStatus.CANCELLED ||
        localSub.status === SubscriptionStatus.EXPIRED ||
        localSub.status === SubscriptionStatus.FAILED
      ) {
        throw new Error(
          `Captured payment ${payment.id} on terminal subscription ${localSub.id}; reconciliation required`,
        );
      }

      assertSubscriptionEvidence(localSub, subscription, payment);

      // Check if payment already recorded (idempotency)
      const existingPayment = await tx.payment.findUnique({
        where: { razorpayPaymentId: payment.id },
      });

      if (existingPayment) assertLocalPaymentEvidence(existingPayment, localSub, payment);
      if (
        expectedCheckoutPaymentId &&
        existingPayment &&
        existingPayment.id !== expectedCheckoutPaymentId
      ) {
        throw new Error('Captured payment is already attached to another checkout history');
      }

      if (
        existingPayment &&
        ['SUCCESS', 'REFUNDED', 'CANCELLED'].includes(existingPayment.status)
      ) {
        this.logger.log(`Payment ${payment.id} already recorded, skipping`);
        return;
      }

      const autoRenew =
        localSub.autoRenew &&
        localSub.cancellationReason !== CANCELLED_AWAITING_CAPTURE &&
        !['cancelled', 'completed', 'expired'].includes(subscription.status);

      const isInitialCharge =
        localSub.status === SubscriptionStatus.PENDING || subscription.paid_count <= 1;

      if (isInitialCharge) {
        // FIRST CHARGE: endDate was already initialized to (startDate + durationDays) when created.
        // Do NOT extend endDate by another cycle!
        const nextBillingDate = autoRenew
          ? new Date(
              Math.max(
                localSub.nextBillingDate?.getTime() ?? 0,
                subscription.charge_at ? subscription.charge_at * 1000 : localSub.endDate.getTime(),
              ),
            )
          : null;

        await this.ensureVaultAccess(localSub.id, localSub.planId, tx);
        // Look for the initial pending payment session created during checkout
        const initialPayments = await tx.payment.findMany({
          where: { subscriptionId: localSub.id, status: { in: ['CREATED', 'PENDING'] } },
          take: 2,
        });
        if (initialPayments.length > 1)
          throw new Error('Multiple initial checkout sessions require reconciliation');
        const initialPayment = initialPayments[0];
        if (initialPayment) assertLocalPaymentEvidence(initialPayment, localSub, payment);
        if (initialPayment && existingPayment && initialPayment.id !== existingPayment.id) {
          throw new Error('Multiple initial checkout histories require reconciliation');
        }

        if (
          expectedCheckoutPaymentId &&
          (existingPayment || initialPayment)?.id !== expectedCheckoutPaymentId
        ) {
          throw new Error('Reconciliation does not target the original checkout payment');
        }
        if (!initialPayment && !existingPayment) {
          throw new Error('Initial checkout payment missing; reconciliation required');
        }

        if (initialPayment || existingPayment) {
          await tx.payment.update({
            where: { id: (existingPayment || initialPayment)!.id },
            data: {
              razorpayPaymentId: payment.id,
              razorpayOrderId: payment.order_id,
              razorpaySubscriptionId: subscription.id,
              amount: payment.amount / 100,
              currency: payment.currency,
              status: PaymentStatus.SUCCESS,
              webhookEvent: event.event,
              metadata: {
                ...((initialPayment?.metadata ?? existingPayment?.metadata ?? {}) as Record<
                  string,
                  Prisma.JsonValue
                >),
                subscriptionId: subscription.id,
                paymentId: payment.id,
                paidCount: subscription.paid_count,
                chargeAt: subscription.charge_at,
              },
            },
          });
        }

        // Activate subscription with base duration
        await tx.subscription.update({
          where: { id: localSub.id },
          data: {
            nextBillingDate,
            endDate: subscription.current_end
              ? new Date(Math.max(localSub.endDate.getTime(), subscription.current_end * 1000))
              : localSub.endDate,
            status: SubscriptionStatus.ACTIVE,
            autoRenew,
            paymentReference: payment.id,
          },
        });

        this.logger.log(
          `Initial charge processed for subscription ${localSub.id}, status ACTIVE, endDate: ${localSub.endDate}`,
        );
      } else {
        if (
          payment.amount !== Math.round(Number(localSub.plan.price) * 100) ||
          payment.currency !== localSub.plan.currency
        ) {
          throw new Error('Renewal amount or currency mismatch');
        }
        // RENEWAL CHARGE: Extend subscription endDate by plan duration
        if (!subscription.current_end)
          throw new Error('Renewal period missing; reconciliation required');
        const newEndDate = new Date(
          Math.max(localSub.endDate.getTime(), subscription.current_end * 1000),
        );
        const nextBillingDate = autoRenew
          ? new Date(
              Math.max(
                localSub.nextBillingDate?.getTime() ?? 0,
                subscription.charge_at ? subscription.charge_at * 1000 : newEndDate.getTime(),
              ),
            )
          : null;

        await this.ensureVaultAccess(localSub.id, localSub.planId, tx);
        // Create new renewal payment record
        await tx.payment.upsert({
          where: { razorpayPaymentId: payment.id },
          update: { status: PaymentStatus.SUCCESS, webhookEvent: event.event },
          create: {
            userId: localSub.userId,
            subscriptionId: localSub.id,
            razorpayPaymentId: payment.id,
            razorpayOrderId: payment.order_id,
            razorpaySubscriptionId: subscription.id,
            amount: payment.amount / 100,
            currency: payment.currency,
            status: PaymentStatus.SUCCESS,
            webhookEvent: event.event,
            metadata: {
              subscriptionId: subscription.id,
              paymentId: payment.id,
              paidCount: subscription.paid_count,
              chargeAt: subscription.charge_at,
            },
          },
        });

        // Extend subscription endDate by plan duration
        await tx.subscription.update({
          where: { id: localSub.id },
          data: {
            endDate: newEndDate,
            nextBillingDate,
            status: SubscriptionStatus.ACTIVE,
            autoRenew,
          },
        });

        this.logger.log(
          `Extended subscription ${localSub.id} to ${newEndDate}, next billing: ${nextBillingDate}`,
        );
      }
    });
    await this.subscriptionAccess.handleSubscriptionActivated(candidate.id).catch(() => undefined);
  }

  private async handleSubscriptionPaymentFailed(event: RazorpayWebhookEvent): Promise<void> {
    const remoteId =
      event.payload.subscription?.entity.id || event.payload.payment?.entity.subscription_id;
    if (!remoteId) return;
    const localSub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: remoteId },
    });
    if (!localSub) throw new Error('Subscription not persisted yet; retry webhook');
    const payment = event.payload.payment?.entity;
    if (payment) {
      if (payment.subscription_id !== remoteId || payment.status !== 'failed' || payment.captured) {
        this.logger.warn(`Ignoring inconsistent failure evidence for ${remoteId}`);
        return;
      }
      await this.prisma.$transaction(async (tx) => {
        await lockSubscription(tx, localSub.id);
        const existing = await tx.payment.findUnique({ where: { razorpayPaymentId: payment.id } });
        if (existing) return; // failure never downgrades captured/refunded history
        const initialSession = await tx.payment.findFirst({
          where: {
            subscriptionId: localSub.id,
            status: { in: ['CREATED', 'PENDING'] },
            razorpayPaymentId: null,
          },
        });
        const data = {
          razorpayPaymentId: payment.id,
          razorpaySubscriptionId: remoteId,
          amount: payment.amount / 100,
          currency: payment.currency,
          status: PaymentStatus.FAILED,
          webhookEvent: event.event,
        };
        if (initialSession) {
          // Bind the actual gateway payment to its checkout session, so a
          // capture winning cleanup updates the same history/session record.
          await tx.payment.update({ where: { id: initialSession.id }, data });
        } else {
          await tx.payment.create({
            data: { ...data, userId: localSub.userId, subscriptionId: localSub.id },
          });
        }
      });
    }
    // A failed renewal must never revoke already-paid access. Its remote
    // lifecycle events can disable future renewal without changing entitlement.
    if (localSub.status === SubscriptionStatus.ACTIVE) return;
    try {
      await cleanupUnpaidAutoPay(this.prisma, this.razorpayService, localSub.id);
    } catch (error) {
      // A capture won the lock while this failure was in flight.
      const current = await this.prisma.subscription.findUniqueOrThrow({
        where: { id: localSub.id },
      });
      if (current.status !== SubscriptionStatus.ACTIVE) throw error;
    }
  }

  private async handleSubscriptionCancelled(event: RazorpayWebhookEvent): Promise<void> {
    await this.disableRenewal(event);
  }
  private async handleSubscriptionCompleted(event: RazorpayWebhookEvent): Promise<void> {
    await this.disableRenewal(event);
  }
  private async handleSubscriptionHalted(event: RazorpayWebhookEvent): Promise<void> {
    await this.disableRenewal(event);
  }
  private async handleSubscriptionExpired(event: RazorpayWebhookEvent): Promise<void> {
    await this.disableRenewal(event);
  }
  private async handleSubscriptionPending(_event: RazorpayWebhookEvent): Promise<void> {
    // Informational only. Never overwrite a paid or terminal local state.
  }
  private async disableRenewal(event: RazorpayWebhookEvent): Promise<void> {
    const id = event.payload.subscription?.entity.id;
    if (!id) return;
    const sub = await this.prisma.subscription.findFirst({ where: { razorpaySubscriptionId: id } });
    if (!sub) throw new Error('Subscription not persisted yet; retry webhook');
    const unpaid = await this.prisma.$transaction(async (tx) => {
      await lockSubscription(tx, sub.id);
      const current = await tx.subscription.findUniqueOrThrow({ where: { id: sub.id } });
      const paid = await tx.payment.findFirst({
        where: { subscriptionId: sub.id, status: 'SUCCESS' },
      });
      if (current.status === 'ACTIVE' || paid) {
        await tx.subscription.updateMany({
          where: { id: sub.id, status: 'ACTIVE' },
          data: { autoRenew: false, nextBillingDate: null },
        });
        return false;
      }
      const remote = event.payload.subscription!.entity;
      if (
        remote.paid_count > 0 ||
        (event.payload.payment?.entity && isCapturedPayment(event.payload.payment.entity))
      ) {
        // A cancelled mandate is not evidence that its captured charge was
        // unpaid. Acknowledge the event, retain the checkout reservation, and
        // let verified capture processing/reconciliation grant entitlement.
        if (current.status === 'PENDING') {
          await tx.subscription.update({
            where: { id: sub.id },
            data: {
              cancellationReason: CANCELLED_AWAITING_CAPTURE,
              nextBillingDate: null,
            },
          });
        }
        return false;
      }
      return current.status === 'PENDING';
    });
    if (unpaid) {
      try {
        await this.handleSubscriptionPaymentFailed({
          ...event,
          payload: { subscription: event.payload.subscription },
        });
      } catch (error) {
        // Gateway may know about a capture before its webhook arrives. This
        // lifecycle event cannot cancel it; do not retry a permanent conflict.
        if (!(error instanceof ConflictException)) throw error;
        await this.prisma.$transaction(async (tx) => {
          await lockSubscription(tx, sub.id);
          await tx.subscription.updateMany({
            where: { id: sub.id, status: 'PENDING' },
            data: { cancellationReason: CANCELLED_AWAITING_CAPTURE, nextBillingDate: null },
          });
          await tx.subscription.updateMany({
            where: { id: sub.id, status: 'ACTIVE' },
            data: { autoRenew: false, nextBillingDate: null },
          });
        });
        this.logger.warn(`Cancelled mandate ${id} awaits captured-payment reconciliation`);
      }
    }
  }
}
