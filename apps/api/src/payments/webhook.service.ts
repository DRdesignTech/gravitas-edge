import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionAccessService } from '../access/subscription-access.service';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';

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
  status: 'created' | 'authenticated' | 'active' | 'pending' | 'halted' | 'cancelled' | 'completed' | 'expired';
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
    private readonly subscriptionAccess: SubscriptionAccessService,
  ) {}

  async handleWebhook(event: RazorpayWebhookEvent): Promise<void> {
    // Use a more specific event ID for better idempotency
    const subscriptionId = event.payload.subscription?.entity?.id;
    const paymentId = event.payload.payment?.entity?.id;
    const eventId = event.event + '_' + (paymentId || subscriptionId || event.account_id || 'unknown') + '_' + (event.payload.payment?.entity?.created_at || event.payload.subscription?.entity?.created_at || Date.now());
    
    this.logger.log(`Processing webhook event: ${event.event} for ${subscriptionId || paymentId}`);

    // Check idempotency
    const existingEvent = await this.prisma.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent?.processed) {
      this.logger.log(`Webhook event ${eventId} already processed, skipping`);
      return;
    }

    // Store webhook event for idempotency
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
      // If duplicate, check if already processed
      if (err.code === 'P2002') {
        const dup = await this.prisma.webhookEvent.findUnique({ where: { eventId } });
        if (dup?.processed) {
          this.logger.log(`Webhook event ${eventId} already processed, skipping`);
          return;
        }
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
      this.logger.error(`Failed to process webhook event ${event.event}:`, error);
      throw error;
    }
  }

  private async handleSubscriptionAuthenticated(event: RazorpayWebhookEvent): Promise<void> {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) return;

    // Reject excluded plans
    if (subscription.plan_id === 'plan_Trq9hv9Sx7SUb7') {
      this.logger.warn(`Rejected webhook for excluded plan ${subscription.plan_id} on subscription ${subscription.id}`);
      return;
    }

    this.logger.log(`Subscription authenticated: ${subscription.id}, customer: ${subscription.customer_id}`);

    // Find local subscription by razorpaySubscriptionId
    const localSub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
    });

    if (!localSub) {
      this.logger.warn(`No local subscription found for Razorpay subscription: ${subscription.id}`);
      return;
    }

    // Update local subscription status to ACTIVE and set autoRenew
    await this.prisma.subscription.update({
      where: { id: localSub.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        nextBillingDate: subscription.charge_at ? new Date(subscription.charge_at * 1000) : null,
      },
    });

    this.logger.log(`Local subscription ${localSub.id} activated for auto-renewal`);
  }

  private async handleSubscriptionActivated(event: RazorpayWebhookEvent): Promise<void> {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) return;

    if (subscription.plan_id === 'plan_Trq9hv9Sx7SUb7') {
      this.logger.warn(`Rejected webhook for excluded plan ${subscription.plan_id} on subscription ${subscription.id}`);
      return;
    }

    this.logger.log(`Subscription activated: ${subscription.id}`);

    const localSub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
    });

    if (!localSub) {
      this.logger.warn(`No local subscription found for Razorpay subscription: ${subscription.id}`);
      return;
    }

    await this.prisma.subscription.update({
      where: { id: localSub.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        nextBillingDate: subscription.charge_at ? new Date(subscription.charge_at * 1000) : null,
      },
    });
  }

  private async handleSubscriptionCharged(event: RazorpayWebhookEvent): Promise<void> {
    const subscription = event.payload.subscription?.entity;
    const payment = event.payload.payment?.entity;
    
    if (!subscription || !payment) {
      this.logger.warn('Missing subscription or payment in charged event');
      return;
    }
    if (subscription.plan_id === 'plan_Trq9hv9Sx7SUb7') {
      this.logger.warn(`Rejected webhook for excluded plan ${subscription.plan_id} on subscription ${subscription.id}`);
      return;
    }
    // Also check if local plan is mapped to excluded
    if (subscription.plan_id === 'plan_Trq302lYgONage') {
      this.logger.warn(`Blocked webhook for mismatched Remote 6-month plan ${subscription.plan_id}`);
      return;
    }

    this.logger.log(`Subscription charged: ${subscription.id}, payment: ${payment.id}, amount: ${payment.amount}`);

    // Find local subscription
    const localSub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
      include: { plan: true },
    });

    if (!localSub) {
      this.logger.warn(`No local subscription found for Razorpay subscription: ${subscription.id}`);
      return;
    }

    // Check if payment already recorded (idempotency)
    const existingPayment = await this.prisma.payment.findUnique({
      where: { razorpayPaymentId: payment.id },
    });

    if (existingPayment) {
      this.logger.log(`Payment ${payment.id} already recorded, skipping`);
      return;
    }

    // Create payment record and extend subscription in transaction
    const newEndDate = new Date(localSub.endDate.getTime() + localSub.plan.durationDays * 24 * 60 * 60 * 1000);
    const nextBillingDate = subscription.charge_at ? new Date(subscription.charge_at * 1000) : newEndDate;

    await this.prisma.$transaction(async (tx) => {
      // Create payment record
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

      // Extend subscription endDate by plan duration
      await tx.subscription.update({
        where: { id: localSub.id },
        data: {
          endDate: newEndDate,
          nextBillingDate,
          status: SubscriptionStatus.ACTIVE,
          autoRenew: true,
        },
      });
    });

    this.logger.log(`Extended subscription ${localSub.id} to ${newEndDate}, next billing: ${nextBillingDate}`);
  }

  private async handleSubscriptionPaymentFailed(event: RazorpayWebhookEvent): Promise<void> {
    const subscription = event.payload.subscription?.entity;
    const payment = event.payload.payment?.entity;
    
    if (!subscription) return;

    this.logger.log(`Subscription payment failed: ${subscription.id}`);

    const localSub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
    });

    if (!localSub) {
      this.logger.warn(`No local subscription found for Razorpay subscription: ${subscription.id}`);
      return;
    }

    // Record failed payment if payment entity exists
    if (payment) {
      const existingPayment = await this.prisma.payment.findUnique({
        where: { razorpayPaymentId: payment.id },
      });

      if (!existingPayment) {
        try {
          await this.prisma.payment.create({
            data: {
              userId: localSub.userId,
              subscriptionId: localSub.id,
              razorpayPaymentId: payment.id,
              razorpayOrderId: payment.order_id,
              razorpaySubscriptionId: subscription.id,
              amount: payment.amount / 100,
              currency: payment.currency,
              status: PaymentStatus.FAILED,
              webhookEvent: event.event,
              metadata: {
                subscriptionId: subscription.id,
                paymentId: payment.id,
                errorCode: payment.error_code,
                errorDescription: payment.error_description,
                authAttempts: subscription.auth_attempts,
              },
            },
          });
        } catch (e) {
          // Ignore duplicate
        }
      }
    }

    // Update subscription status based on auth attempts
    const maxAuthAttempts = 3;
    if (subscription.auth_attempts >= maxAuthAttempts) {
      await this.prisma.subscription.update({
        where: { id: localSub.id },
        data: {
          status: SubscriptionStatus.FAILED,
          autoRenew: false,
          nextBillingDate: null,
        },
      });
      this.logger.log(`Subscription ${localSub.id} marked as FAILED after ${subscription.auth_attempts} attempts`);
    } else {
      // Update next billing date for retry
      await this.prisma.subscription.update({
        where: { id: localSub.id },
        data: {
          nextBillingDate: subscription.charge_at ? new Date(subscription.charge_at * 1000) : null,
        },
      });
      this.logger.log(`Subscription ${localSub.id} payment failed, attempt ${subscription.auth_attempts}/${maxAuthAttempts}, will retry`);
    }
  }

  private async handleSubscriptionCancelled(event: RazorpayWebhookEvent): Promise<void> {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) return;

    this.logger.log(`Subscription cancelled: ${subscription.id}`);

    const localSub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
    });

    if (!localSub) {
      this.logger.warn(`No local subscription found for Razorpay subscription: ${subscription.id}`);
      return;
    }

    // Preserve paid-through access - cancelSubscription should handle this
    await this.subscriptionAccess.cancelSubscription(localSub.id, 'Cancelled via Razorpay');

    this.logger.log(`Local subscription ${localSub.id} cancelled`);
  }

  private async handleSubscriptionCompleted(event: RazorpayWebhookEvent): Promise<void> {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) return;

    this.logger.log(`Subscription completed: ${subscription.id}`);

    const localSub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
    });

    if (!localSub) {
      this.logger.warn(`No local subscription found for Razorpay subscription: ${subscription.id}`);
      return;
    }

    await this.prisma.subscription.update({
      where: { id: localSub.id },
      data: {
        status: SubscriptionStatus.EXPIRED,
        autoRenew: false,
        nextBillingDate: null,
      },
    });

    this.logger.log(`Local subscription ${localSub.id} marked as completed/expired`);
  }

  private async handleSubscriptionHalted(event: RazorpayWebhookEvent): Promise<void> {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) return;

    this.logger.log(`Subscription halted: ${subscription.id}`);

    const localSub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
    });

    if (!localSub) {
      this.logger.warn(`No local subscription found for Razorpay subscription: ${subscription.id}`);
      return;
    }

    await this.prisma.subscription.update({
      where: { id: localSub.id },
      data: {
        autoRenew: false,
        nextBillingDate: null,
      },
    });

    this.logger.log(`Local subscription ${localSub.id} halted (auto-renew disabled)`);
  }

  private async handleSubscriptionPending(event: RazorpayWebhookEvent): Promise<void> {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) return;

    this.logger.log(`Subscription pending: ${subscription.id}`);

    const localSub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
    });

    if (!localSub) {
      this.logger.warn(`No local subscription found for Razorpay subscription: ${subscription.id}`);
      return;
    }

    await this.prisma.subscription.update({
      where: { id: localSub.id },
      data: {
        status: SubscriptionStatus.PENDING,
      },
    });
  }

  private async handleSubscriptionExpired(event: RazorpayWebhookEvent): Promise<void> {
    const subscription = event.payload.subscription?.entity;
    if (!subscription) return;

    this.logger.log(`Subscription expired: ${subscription.id}`);

    const localSub = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
    });

    if (!localSub) {
      this.logger.warn(`No local subscription found for Razorpay subscription: ${subscription.id}`);
      return;
    }

    await this.prisma.subscription.update({
      where: { id: localSub.id },
      data: {
        status: SubscriptionStatus.EXPIRED,
        autoRenew: false,
        nextBillingDate: null,
      },
    });

    this.logger.log(`Local subscription ${localSub.id} expired`);
  }
}