import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionAccessService } from '../../access/subscription-access.service';
import { ReferralsService } from '../../referrals/referrals.service';

function mockPrismaService() {
  return {
    subscription: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(async (fns: any[]) => {
      const results = [];
      for (const fn of fns) {
        results.push(await fn);
      }
      return results;
    }),
  } as any;
}

function mockAccessService() {
  return {
    effectiveStatus: jest.fn(),
  } as any;
}

function mockReferralsService() {
  return {
    handleSubscriptionActivated: jest.fn().mockResolvedValue(undefined),
  } as any;
}

describe('AdminSubscriptionsService', () => {
  let service: AdminSubscriptionsService;
  let prisma: ReturnType<typeof mockPrismaService>;
  let access: ReturnType<typeof mockAccessService>;

  const baseSub = {
    id: 'sub-1',
    userId: 'user-1',
    status: 'ACTIVE',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    createdAt: new Date(),
    cancelledAt: null,
    user: { id: 'user-1', email: 'user@example.com' },
    plan: { id: 'plan-1', name: 'Basic', price: 499, currency: 'INR' },
    vaultAccess: [{ vaultId: 'v-1' }],
  };

  beforeEach(async () => {
    prisma = mockPrismaService();
    access = mockAccessService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminSubscriptionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionAccessService, useValue: access },
        { provide: ReferralsService, useValue: mockReferralsService() },
      ],
    }).compile();
    service = moduleRef.get(AdminSubscriptionsService);
  });

  describe('list', () => {
    it('returns paginated subscriptions', async () => {
      prisma.subscription.findMany.mockResolvedValue([baseSub]);
      prisma.subscription.count.mockResolvedValue(1);
      access.effectiveStatus.mockReturnValue('ACTIVE');

      const result = await service.list({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].effectiveStatus).toBe('ACTIVE');
      expect(result.items[0].vaultAccessCount).toBe(1);
      expect(result.meta.totalItems).toBe(1);
    });

    it('filters by userId', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);
      prisma.subscription.count.mockResolvedValue(0);

      await service.list({ userId: 'user-1' });
      expect(prisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
      );
    });

    it('filters by status', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);
      prisma.subscription.count.mockResolvedValue(0);

      await service.list({ status: 'ACTIVE' });
      expect(prisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'ACTIVE' }) }),
      );
    });

    it('paginates correctly', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);
      prisma.subscription.count.mockResolvedValue(0);

      await service.list({ page: 2, limit: 10 });
      expect(prisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe('findOne', () => {
    it('returns subscription with vault access details', async () => {
      const fullSub = {
        ...baseSub,
        plan: {
          id: 'plan-1',
          name: 'Basic',
          description: 'Basic plan',
          price: 499,
          currency: 'INR',
          durationDays: 30,
        },
        vaultAccess: [{ vaultId: 'v-1', vault: { id: 'v-1', name: 'India' } }],
      };
      prisma.subscription.findUnique.mockResolvedValue(fullSub);
      access.effectiveStatus.mockReturnValue('ACTIVE');

      const result = await service.findOne('sub-1');
      expect(result.id).toBe('sub-1');
      expect(result.effectiveStatus).toBe('ACTIVE');
      expect(result.vaultAccess).toHaveLength(1);
    });

    it('throws for nonexistent subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
