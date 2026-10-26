import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionAccessService } from '../access/subscription-access.service';
import { WebhookService } from './webhook.service';
import { SubscriptionStatus } from '@prisma/client';

interface MockPrismaService {
  webhookEvent: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  subscription: {
    findFirst: jest.Mock;
    update: jest.Mock;
    findUniqueOrThrow: jest.Mock;
  };
  payment: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
  subscriptionVaultAccess: {
    createMany: jest.Mock;
  };
  $transaction: jest.Mock;
}

interface MockSubscriptionAccessService {
  cancelSubscription: jest.Mock;
  extendSubscription: jest.Mock;
  handleSubscriptionActivated: jest.Mock;
}

function createMockPrismaService(): MockPrismaService {
  const mockTx: any = {
    webhookEvent: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    subscription: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    subscriptionPlan: {
      findUnique: jest.fn().mockResolvedValue({ id: 'p1', vaults: [{ vaultId: 'v1' }] }),
    },
    subscriptionVaultAccess: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  return {
    webhookEvent: mockTx.webhookEvent as any,
    subscription: mockTx.subscription,
    payment: mockTx.payment,
    subscriptionPlan: mockTx.subscriptionPlan,
    subscriptionVaultAccess: mockTx.subscriptionVaultAccess,
    $transaction: jest.fn(async (fn: (tx: typeof mockTx) => Promise<any>) => fn(mockTx)),
  } as any;
}

function createMockSubscriptionAccessService(): MockSubscriptionAccessService {
  return {
    cancelSubscription: jest.fn().mockResolvedValue(undefined),
    extendSubscription: jest.fn().mockResolvedValue(undefined),
    handleSubscriptionActivated: jest.fn().mockResolvedValue(undefined),
  };
}

type RazorpaySubscriptionStatus =
  | 'created'
  | 'authenticated'
  | 'active'
  | 'pending'
  | 'halted'
  | 'cancelled'
  | 'completed'
  | 'expired';
type RazorpayPaymentStatus = 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';

interface RazorpayWebhookEvent {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    subscription?: {
      entity: {
        id: string;
        entity: string;
        plan_id: string;
        status: RazorpaySubscriptionStatus;
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
      };
    };
    payment?: {
      entity: {
        id: string;
        entity: string;
        amount: number;
        currency: string;
        status: RazorpayPaymentStatus;
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
      };
    };
  };
}

describe('WebhookService', () => {
  let service: WebhookService;
  let prisma: MockPrismaService;
  let subscriptionAccess: MockSubscriptionAccessService;

  const createBaseEvent = (overrides: Partial<RazorpayWebhookEvent> = {}): RazorpayWebhookEvent => {
    const now = Math.floor(Date.now() / 1000);
    return {
      entity: 'event',
      account_id: 'acc_123',
      event: 'subscription.charged',
      contains: ['subscription', 'payment'],
      payload: {
        subscription: {
          entity: {
            id: 'sub_rzp_123',
            entity: 'subscription',
            plan_id: 'plan_rzp_1',
            status: 'active',
            current_start: now - 86400,
            current_end: now + 86400,
            ended_at: null,
            charge_at: now + 86400 * 30,
            start_at: now - 86400,
            end_at: now + 86400 * 365,
            auth_attempts: 0,
            paid_count: 1,
            created_at: now - 86400,
            short_url: 'https://rzp.io/i/test',
            has_scheduled_changes: false,
            change_scheduled_at: null,
            source: 'api',
            remaining_count: '0',
            customer_id: 'cust_123',
            payment_method: 'card',
          },
        },
        payment: {
          entity: {
            id: 'pay_rzp_123',
            entity: 'payment',
            amount: 149900,
            currency: 'INR',
            status: 'captured',
            order_id: 'order_rzp_1',
            invoice_id: null,
            international: false,
            method: 'card',
            amount_refunded: 0,
            refund_status: null,
            captured: true,
            description: null,
            card_id: null,
            bank: 'HDFC',
            wallet: null,
            vpa: null,
            email: 'test@example.com',
            contact: '9999999999',
            notes: { planId: 'plan_1', vaultId: 'v1' },
            fee: 0,
            tax: 0,
            error_code: null,
            error_description: null,
            created_at: now,
            subscription_id: 'sub_rzp_123',
          },
        },
      },
      ...overrides,
    };
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    subscriptionAccess = createMockSubscriptionAccessService();

    const module = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionAccessService, useValue: subscriptionAccess },
      ],
    }).compile();

    service = module.get(WebhookService);
    jest.clearAllMocks();
  });

  describe('handleWebhook', () => {
    it('skips processing if another delivery has already claimed the event', async () => {
      (prisma.webhookEvent as any).create.mockRejectedValue({ code: 'P2002' });

      await service.handleWebhook(createBaseEvent());

      expect((prisma.webhookEvent as any).create).toHaveBeenCalled();
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('stores webhook event and processes subscription.charged', async () => {
      prisma.webhookEvent.findUnique.mockResolvedValue(null);
      (prisma.webhookEvent as any).create = jest.fn().mockResolvedValue({});
      prisma.webhookEvent.update.mockResolvedValue({});
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub_local_1',
        userId: 'user_1',
        plan: { durationDays: 30 },
        endDate: new Date(Date.now() + 86400000),
      });
      prisma.payment.findUnique.mockResolvedValue(null);

      await service.handleWebhook(createBaseEvent());

      expect((prisma.webhookEvent as any).create).toHaveBeenCalled();
      expect(prisma.payment.create).toHaveBeenCalled();
      expect(prisma.subscription.update).toHaveBeenCalled();
      expect(prisma.webhookEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { processed: true },
        }),
      );
    });

    it('handles subscription.payment_failed and marks subscription as FAILED after max attempts', async () => {
      const failedEvent = createBaseEvent({
        event: 'subscription.payment_failed',
        payload: {
          subscription: {
            entity: {
              ...createBaseEvent().payload.subscription!.entity,
              auth_attempts: 3,
            },
          },
          payment: createBaseEvent().payload.payment,
        },
      });

      prisma.webhookEvent.findUnique.mockResolvedValue(null);
      (prisma.webhookEvent as any).create = jest.fn().mockResolvedValue({});
      prisma.webhookEvent.update.mockResolvedValue({});
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub_local_1',
        userId: 'user_1',
      });
      prisma.payment.findUnique.mockResolvedValue(null);

      await service.handleWebhook(failedEvent);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub_local_1' },
        data: {
          status: SubscriptionStatus.FAILED,
          autoRenew: false,
          nextBillingDate: null,
        },
      });
    });

    it('handles subscription.payment_failed and updates nextBillingDate for retry', async () => {
      const now = Math.floor(Date.now() / 1000);
      const failedEvent = createBaseEvent({
        event: 'subscription.payment_failed',
        payload: {
          subscription: {
            entity: {
              ...createBaseEvent().payload.subscription!.entity,
              auth_attempts: 1,
              charge_at: now + 86400,
            },
          },
          payment: createBaseEvent().payload.payment,
        },
      });

      prisma.webhookEvent.findUnique.mockResolvedValue(null);
      (prisma.webhookEvent as any).create = jest.fn().mockResolvedValue({});
      prisma.webhookEvent.update.mockResolvedValue({});
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub_local_1',
        userId: 'user_1',
      });
      prisma.payment.findUnique.mockResolvedValue(null);

      await service.handleWebhook(failedEvent);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub_local_1' },
        data: {
          nextBillingDate: expect.any(Date),
        },
      });
    });

    it('handles subscription.cancelled via subscriptionAccess.cancelSubscription', async () => {
      const cancelledEvent = createBaseEvent({
        event: 'subscription.cancelled',
        payload: { subscription: { entity: createBaseEvent().payload.subscription!.entity } },
      });

      prisma.webhookEvent.findUnique.mockResolvedValue(null);
      (prisma.webhookEvent as any).create = jest.fn().mockResolvedValue({});
      prisma.webhookEvent.update.mockResolvedValue({});
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub_local_1',
        userId: 'user_1',
      });

      await service.handleWebhook(cancelledEvent);

      expect(subscriptionAccess.cancelSubscription).toHaveBeenCalledWith(
        'sub_local_1',
        'Cancelled via Razorpay',
      );
    });

    it('handles subscription.completed', async () => {
      const completedEvent = createBaseEvent({
        event: 'subscription.completed',
        payload: { subscription: { entity: createBaseEvent().payload.subscription!.entity } },
      });

      prisma.webhookEvent.findUnique.mockResolvedValue(null);
      (prisma.webhookEvent as any).create = jest.fn().mockResolvedValue({});
      prisma.webhookEvent.update.mockResolvedValue({});
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub_local_1',
        userId: 'user_1',
      });

      await service.handleWebhook(completedEvent);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub_local_1' },
        data: {
          status: SubscriptionStatus.EXPIRED,
          autoRenew: false,
          nextBillingDate: null,
        },
      });
    });

    it('does not grant access when a mandate is authenticated without a captured payment', async () => {
      const authEvent = createBaseEvent({
        event: 'subscription.authenticated',
        payload: { subscription: { entity: createBaseEvent().payload.subscription!.entity } },
      });

      prisma.webhookEvent.findUnique.mockResolvedValue(null);
      (prisma.webhookEvent as any).create = jest.fn().mockResolvedValue({});
      prisma.webhookEvent.update.mockResolvedValue({});
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub_local_1',
        userId: 'user_1',
      });

      await service.handleWebhook(authEvent);

      expect(prisma.subscription.update).not.toHaveBeenCalled();
      expect(prisma.subscriptionVaultAccess.createMany).not.toHaveBeenCalled();
      expect(subscriptionAccess.handleSubscriptionActivated).not.toHaveBeenCalled();
    });

    it('does not reactivate a failed subscription when a stale authenticated event arrives', async () => {
      const authEvent = createBaseEvent({
        event: 'subscription.authenticated',
        payload: { subscription: { entity: createBaseEvent().payload.subscription!.entity } },
      });

      (prisma.webhookEvent as any).create = jest.fn().mockResolvedValue({});
      prisma.webhookEvent.update.mockResolvedValue({});
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub_local_1',
        userId: 'user_1',
        status: SubscriptionStatus.FAILED,
      });

      await service.handleWebhook(authEvent);

      expect(prisma.subscription.update).not.toHaveBeenCalled();
      expect(prisma.subscriptionVaultAccess.createMany).not.toHaveBeenCalled();
    });

    it('does not grant access for a subscription.charged event without a captured payment', async () => {
      const event = createBaseEvent({
        payload: {
          subscription: { entity: createBaseEvent().payload.subscription!.entity },
          payment: {
            entity: {
              ...createBaseEvent().payload.payment!.entity,
              status: 'authorized',
              captured: false,
            },
          },
        },
      });

      (prisma.webhookEvent as any).create = jest.fn().mockResolvedValue({});
      prisma.webhookEvent.update.mockResolvedValue({});

      await service.handleWebhook(event);

      expect(prisma.subscription.findFirst).not.toHaveBeenCalled();
      expect(prisma.subscription.update).not.toHaveBeenCalled();
      expect(prisma.subscriptionVaultAccess.createMany).not.toHaveBeenCalled();
    });

    it('warns and returns early if no local subscription found', async () => {
      prisma.webhookEvent.findUnique.mockResolvedValue(null);
      (prisma.webhookEvent as any).create = jest.fn().mockResolvedValue({});
      prisma.webhookEvent.update.mockResolvedValue({});
      prisma.subscription.findFirst.mockResolvedValue(null);

      await service.handleWebhook(createBaseEvent());

      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });
  });
});
