import { SubscriptionAccessService } from '../access/subscription-access.service';
import { cleanupUnpaidAutoPay, lockSubscription } from './autopay-cleanup';
import { RazorpayService } from './razorpay.service';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, SubscriptionStatus, Prisma } from '@prisma/client';

interface RazorpayWebhookEvent {
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
  captured: boolean;
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
  subscription_id: string | null;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayService: RazorpayService,
    private readonly subscriptionAccess: SubscriptionAccessService,
  ) {}

  async handleWebhook(event: RazorpayWebhookEvent): Promise<void> {
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
      switch (event.event) {
        case 'subscription.authenticated':
          await this.handleSubscriptionAuthenticated(event);
          break;
        case 'subscription.activated':
          await this.handleSubscriptionActivated(event);
          break;
        case 'subscription.charged':
        case 'invoice.paid': // sometimes used
          await this.handleSubscriptionCharged(event);
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

  private async handleSubscriptionCharged(event: RazorpayWebhookEvent): Promise<void> {
    const subscription = event.payload.subscription?.entity;
    const payment = event.payload.payment?.entity;

    if (!subscription || !payment) {
      this.logger.warn('Missing subscription or payment in charged event');
      return;
    }
    if (
      payment.status !== 'captured' ||
      payment.captured !== true ||
      payment.subscription_id !== subscription.id
    ) {
      this.logger.warn(`Ignoring non-captured or mismatched charge for ${subscription.id}`);
      return;
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
        this.logger.warn(
          `No local subscription found for Razorpay subscription: ${subscription.id}`,
        );
        return;
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

      if (
        localSub.plan &&
        (payment.currency !== localSub.plan.currency ||
          payment.amount !== Math.round(Number(localSub.plan.price) * 100))
      ) {
        throw new Error('Captured payment amount or currency mismatch; reconciliation required');
      }

      // Check if payment already recorded (idempotency)
      const existingPayment = await tx.payment.findUnique({
        where: { razorpayPaymentId: payment.id },
      });

      if (
        existingPayment &&
        ['SUCCESS', 'REFUNDED', 'CANCELLED'].includes(existingPayment.status)
      ) {
        this.logger.log(`Payment ${payment.id} already recorded, skipping`);
        return;
      }

      const isInitialCharge =
        localSub.status === SubscriptionStatus.PENDING || subscription.paid_count <= 1;

      if (isInitialCharge) {
        // FIRST CHARGE: endDate was already initialized to (startDate + durationDays) when created.
        // Do NOT extend endDate by another cycle!
        const nextBillingDate = localSub.autoRenew
          ? new Date(
              Math.max(
                localSub.nextBillingDate?.getTime() ?? 0,
                subscription.charge_at ? subscription.charge_at * 1000 : localSub.endDate.getTime(),
              ),
            )
          : null;

        await this.ensureVaultAccess(localSub.id, localSub.planId, tx);
        // Look for the initial pending payment session created during checkout
        const initialPayment = await tx.payment.findFirst({
          where: { subscriptionId: localSub.id, status: { in: ['CREATED', 'PENDING'] } },
        });

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
        } else {
          // If no initial pending record found, create new SUCCESS payment
          await tx.payment.create({
            data: {
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
            autoRenew: localSub.autoRenew,
            paymentReference: payment.id,
          },
        });

        this.logger.log(
          `Initial charge processed for subscription ${localSub.id}, status ACTIVE, endDate: ${localSub.endDate}`,
        );
      } else {
        // RENEWAL CHARGE: Extend subscription endDate by plan duration
        if (!subscription.current_end)
          throw new Error('Renewal period missing; reconciliation required');
        const newEndDate = new Date(
          Math.max(localSub.endDate.getTime(), subscription.current_end * 1000),
        );
        const nextBillingDate = localSub.autoRenew
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
            autoRenew: localSub.autoRenew,
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
    await this.prisma.$transaction(async (tx) => {
      await lockSubscription(tx, sub.id);
      // Remote lifecycle events describe the mandate, not paid entitlement.
      // Keep unpaid reservations until cleanup verifies no captured charges.
      await tx.subscription.updateMany({
        where: { id: sub.id, status: 'ACTIVE' },
        data: { autoRenew: false, nextBillingDate: null },
      });
    });
    if (sub.status !== SubscriptionStatus.ACTIVE) {
      await this.handleSubscriptionPaymentFailed({
        ...event,
        payload: { subscription: event.payload.subscription },
      });
    }
  }
}
