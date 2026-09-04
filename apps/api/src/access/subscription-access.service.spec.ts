import { Test } from '@nestjs/testing';
import { SubscriptionAccessService } from './subscription-access.service';
import { PrismaService } from '../prisma/prisma.service';

function mockPrismaService() {
  return {
    subscription: {
      findMany: jest.fn(),
    },
    subscriptionVaultAccess: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    subscriptionPlan: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;
}

describe('SubscriptionAccessService', () => {
  let service: SubscriptionAccessService;
  let prisma: ReturnType<typeof mockPrismaService>;

  beforeEach(async () => {
    prisma = mockPrismaService();
    const moduleRef = await Test.createTestingModule({
      providers: [SubscriptionAccessService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(SubscriptionAccessService);
  });

  describe('effectiveStatus', () => {
    it('returns EXPIRED for non-ACTIVE stored status', () => {
      const result = service.effectiveStatus({
        status: 'EXPIRED',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2099-12-31'),
      });
      expect(result).toBe('EXPIRED');
    });

    it('returns CANCELLED for cancelled stored status', () => {
      const result = service.effectiveStatus({
        status: 'CANCELLED',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2099-12-31'),
      });
      expect(result).toBe('CANCELLED');
    });

    it('returns PENDING for future start date', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      const result = service.effectiveStatus({
        status: 'ACTIVE',
        startDate: future,
        endDate: new Date('2099-12-31'),
      });
      expect(result).toBe('PENDING');
    });

    it('returns EXPIRED for past end date', () => {
      const result = service.effectiveStatus({
        status: 'ACTIVE',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2020-12-31'),
      });
      expect(result).toBe('EXPIRED');
    });

    it('returns ACTIVE for valid date range', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      const result = service.effectiveStatus({
        status: 'ACTIVE',
        startDate: past,
        endDate: future,
      });
      expect(result).toBe('ACTIVE');
    });

    it('returns EXPIRED when cancelledAt is in the past', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      const result = service.effectiveStatus({
        status: 'ACTIVE',
        startDate: past,
        endDate: future,
        cancelledAt: past,
      });
      expect(result).toBe('EXPIRED');
    });

    it('handles string dates', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1).toString();
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      const result = service.effectiveStatus({
        status: 'ACTIVE',
        startDate: new Date(Date.now() - 86400000).toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
      });
      expect(result).toBe('ACTIVE');
    });
  });

  describe('getActiveSubscriptions', () => {
    it('returns only ACTIVE subscriptions within date range', async () => {
      const past = new Date(Date.now() - 86400000);
      const future = new Date(Date.now() + 86400000);
      const activeSub = { id: 'sub-1', status: 'ACTIVE', startDate: past, endDate: future };
      prisma.subscription.findMany.mockResolvedValue([activeSub]);

      const result = await service.getActiveSubscriptions('user-1');
      expect(result).toHaveLength(1);
      expect(prisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', status: 'ACTIVE' }),
        }),
      );
    });

    it('filters out expired subscriptions even if stored as ACTIVE', async () => {
      const expired = {
        id: 'sub-1',
        status: 'ACTIVE',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2020-12-31'),
      };
      prisma.subscription.findMany.mockResolvedValue([expired]);

      const result = await service.getActiveSubscriptions('user-1');
      expect(result).toHaveLength(0);
    });

    it('returns empty array when no subscriptions', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);
      const result = await service.getActiveSubscriptions('user-1');
      expect(result).toHaveLength(0);
    });
  });

  describe('hasActiveSubscription', () => {
    it('returns true when user has active subscription', async () => {
      jest.spyOn(service, 'getActiveSubscriptions').mockResolvedValue([{ id: 'sub-1' }] as any);
      expect(await service.hasActiveSubscription('user-1')).toBe(true);
    });

    it('returns false when user has no active subscription', async () => {
      jest.spyOn(service, 'getActiveSubscriptions').mockResolvedValue([]);
      expect(await service.hasActiveSubscription('user-1')).toBe(false);
    });
  });

  describe('getAccessibleVaultIds', () => {
    it('returns unique vault ids from active subscriptions', async () => {
      const past = new Date(Date.now() - 86400000);
      const future = new Date(Date.now() + 86400000);
      prisma.subscription.findMany.mockResolvedValue([
        { id: 'sub-1', status: 'ACTIVE', startDate: past, endDate: future },
      ]);
      prisma.subscriptionVaultAccess.findMany.mockResolvedValue([
        { vaultId: 'vault-a' },
        { vaultId: 'vault-b' },
        { vaultId: 'vault-a' }, // duplicate
      ]);

      const result = await service.getAccessibleVaultIds('user-1');
      expect(result).toEqual(['vault-a', 'vault-b']);
    });

    it('returns empty array when no active subscriptions', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);
      const result = await service.getAccessibleVaultIds('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('hasVaultAccess', () => {
    it('returns true when vault is accessible', async () => {
      jest.spyOn(service, 'getAccessibleVaultIds').mockResolvedValue(['vault-a', 'vault-b']);
      expect(await service.hasVaultAccess('user-1', 'vault-a')).toBe(true);
    });

    it('returns false when vault is not accessible', async () => {
      jest.spyOn(service, 'getAccessibleVaultIds').mockResolvedValue(['vault-a']);
      expect(await service.hasVaultAccess('user-1', 'vault-b')).toBe(false);
    });
  });

  describe('getUserVaultAccess', () => {
    it('returns vault access entries from active subscriptions', async () => {
      const past = new Date(Date.now() - 86400000);
      const future = new Date(Date.now() + 86400000);
      prisma.subscription.findMany.mockResolvedValue([
        { id: 'sub-1', status: 'ACTIVE', startDate: past, endDate: future },
      ]);
      prisma.subscriptionVaultAccess.findMany.mockResolvedValue([
        { vaultId: 'vault-a', subscriptionId: 'sub-1' },
        { vaultId: 'vault-b', subscriptionId: 'sub-1' },
      ]);

      const result = await service.getUserVaultAccess('user-1');
      expect(result).toEqual([
        { vaultId: 'vault-a', subscriptionId: 'sub-1' },
        { vaultId: 'vault-b', subscriptionId: 'sub-1' },
      ]);
    });

    it('returns empty array when no active subscriptions', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);
      const result = await service.getUserVaultAccess('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('requireVaultAccess', () => {
    it('returns unauthorized for missing userId', async () => {
      const result = await service.requireVaultAccess('', 'vault-1');
      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('UNAUTHENTICATED');
    });

    it('returns unauthorized for deleted user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', deletedAt: new Date() });
      const result = await service.requireVaultAccess('user-1', 'vault-1');
      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('USER_NOT_FOUND');
    });

    it('returns unauthorized for nonexistent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.requireVaultAccess('user-1', 'vault-1');
      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('USER_NOT_FOUND');
    });

    it('returns unauthorized when no active subscriptions', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', deletedAt: null });
      prisma.subscription.findMany.mockResolvedValue([]);
      const result = await service.requireVaultAccess('user-1', 'vault-1');
      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('NO_ACTIVE_SUBSCRIPTION');
    });

    it('returns unauthorized when vault not in entitlements', async () => {
      const past = new Date(Date.now() - 86400000);
      const future = new Date(Date.now() + 86400000);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', deletedAt: null });
      prisma.subscription.findMany.mockResolvedValue([
        { id: 'sub-1', status: 'ACTIVE', startDate: past, endDate: future },
      ]);
      prisma.subscriptionVaultAccess.findFirst.mockResolvedValue(null);

      const result = await service.requireVaultAccess('user-1', 'vault-1');
      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('VAULT_NOT_IN_ENTITLEMENTS');
    });

    it('returns authorized with subscription id when vault is accessible', async () => {
      const past = new Date(Date.now() - 86400000);
      const future = new Date(Date.now() + 86400000);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', deletedAt: null });
      prisma.subscription.findMany.mockResolvedValue([
        { id: 'sub-1', status: 'ACTIVE', startDate: past, endDate: future },
      ]);
      prisma.subscriptionVaultAccess.findFirst.mockResolvedValue({
        subscriptionId: 'sub-1',
      });

      const result = await service.requireVaultAccess('user-1', 'vault-1');
      expect(result.authorized).toBe(true);
      expect(result.subscriptionId).toBe('sub-1');
    });
  });

  describe('createSubscriptionWithSnapshot', () => {
    it('creates subscription with vault access snapshot from plan', async () => {
      const plan = {
        id: 'plan-1',
        deletedAt: null,
        isActive: true,
        durationDays: 30,
        vaults: [{ vaultId: 'vault-a' }, { vaultId: 'vault-b' }],
      };
      const createdSub = {
        id: 'sub-new',
        userId: 'user-1',
        planId: 'plan-1',
        status: 'ACTIVE',
      };
      const finalSub = {
        ...createdSub,
        vaultAccess: [{ vaultId: 'vault-a' }, { vaultId: 'vault-b' }],
        plan,
      };

      prisma.subscriptionPlan.findUnique.mockResolvedValue(plan);

      const mockTx = {
        subscription: {
          create: jest.fn().mockResolvedValue(createdSub),
          findUniqueOrThrow: jest.fn().mockResolvedValue(finalSub),
        },
        subscriptionVaultAccess: {
          createMany: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      const result = await service.createSubscriptionWithSnapshot('user-1', 'plan-1');
      expect(mockTx.subscription.create).toHaveBeenCalled();
      expect(mockTx.subscriptionVaultAccess.createMany).toHaveBeenCalledWith({
        data: [
          { subscriptionId: 'sub-new', vaultId: 'vault-a' },
          { subscriptionId: 'sub-new', vaultId: 'vault-b' },
        ],
      });
      expect(result).toEqual(finalSub);
    });

    it('throws for inactive plan', async () => {
      prisma.subscriptionPlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        deletedAt: null,
        isActive: false,
        durationDays: 30,
        vaults: [],
      });
      await expect(service.createSubscriptionWithSnapshot('user-1', 'plan-1')).rejects.toThrow(
        'PLAN_NOT_AVAILABLE',
      );
    });

    it('throws for deleted plan', async () => {
      prisma.subscriptionPlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        deletedAt: new Date(),
        isActive: true,
        durationDays: 30,
        vaults: [],
      });
      await expect(service.createSubscriptionWithSnapshot('user-1', 'plan-1')).rejects.toThrow(
        'PLAN_NOT_AVAILABLE',
      );
    });

    it('creates subscription without vault access when plan has no vaults', async () => {
      const plan = {
        id: 'plan-1',
        deletedAt: null,
        isActive: true,
        durationDays: 30,
        vaults: [],
      };
      const createdSub = { id: 'sub-new', status: 'ACTIVE' };
      const finalSub = { ...createdSub, vaultAccess: [], plan };

      prisma.subscriptionPlan.findUnique.mockResolvedValue(plan);
      const mockTx = {
        subscription: {
          create: jest.fn().mockResolvedValue(createdSub),
          findUniqueOrThrow: jest.fn().mockResolvedValue(finalSub),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      const result = await service.createSubscriptionWithSnapshot('user-1', 'plan-1');
      expect(mockTx.subscription.create).toHaveBeenCalled();
      expect(result.vaultAccess).toEqual([]);
    });

    it('computes end date from plan duration when not provided', async () => {
      const startDate = new Date('2026-01-01');
      const plan = {
        id: 'plan-1',
        deletedAt: null,
        isActive: true,
        durationDays: 30,
        vaults: [],
      };
      const createdSub = { id: 'sub-new', status: 'ACTIVE' };
      const finalSub = { ...createdSub, vaultAccess: [], plan };

      prisma.subscriptionPlan.findUnique.mockResolvedValue(plan);
      const mockTx = {
        subscription: {
          create: jest.fn().mockImplementation((args: any) => {
            expect(args.data.startDate).toEqual(startDate);
            expect(args.data.endDate).toEqual(new Date(startDate.getTime() + 30 * 86400000));
            return createdSub;
          }),
          findUniqueOrThrow: jest.fn().mockResolvedValue(finalSub),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      await service.createSubscriptionWithSnapshot('user-1', 'plan-1', { startDate });
    });
  });
});
