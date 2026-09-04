import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserSubscriptionsService } from './user-subscriptions.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionAccessService } from '../access/subscription-access.service';

function mockPrismaService() {
  return {
    subscription: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  } as any;
}

function mockAccessService() {
  return {
    effectiveStatus: jest.fn(),
  } as any;
}

describe('UserSubscriptionsService', () => {
  let service: UserSubscriptionsService;
  let prisma: ReturnType<typeof mockPrismaService>;
  let access: ReturnType<typeof mockAccessService>;

  const baseSub = {
    id: 'sub-1',
    status: 'ACTIVE',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    createdAt: new Date(),
    cancelledAt: null,
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

  beforeEach(async () => {
    prisma = mockPrismaService();
    access = mockAccessService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserSubscriptionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionAccessService, useValue: access },
      ],
    }).compile();
    service = moduleRef.get(UserSubscriptionsService);
  });

  describe('listMine', () => {
    it('returns serialized subscriptions without security fields', async () => {
      prisma.subscription.findMany.mockResolvedValue([baseSub]);
      const result = await service.listMine('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sub-1');
      expect(result[0].plan.name).toBe('Basic');
      expect(result[0].vaultAccess).toEqual([{ vaultId: 'v-1', vaultName: 'India' }]);
    });

    it('returns empty array when user has no subscriptions', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);
      const result = await service.listMine('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('findMine', () => {
    it('returns a single subscription by id (IDOR protected)', async () => {
      prisma.subscription.findFirst.mockResolvedValue(baseSub);
      const result = await service.findMine('user-1', 'sub-1');
      expect(result.id).toBe('sub-1');
    });

    it('throws for nonexistent subscription', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      await expect(service.findMine('user-1', 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('enforces ownership (IDOR prevention)', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);
      await expect(service.findMine('user-2', 'sub-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listActive', () => {
    it('returns only currently active subscriptions', async () => {
      prisma.subscription.findMany.mockResolvedValue([baseSub]);
      access.effectiveStatus.mockReturnValue('ACTIVE');

      const result = await service.listActive('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
      expect(result[0].effectiveStatus).toBe('ACTIVE');
    });

    it('filters out expired subscriptions', async () => {
      const expired = {
        ...baseSub,
        startDate: new Date('2020-01-01'),
        endDate: new Date('2020-12-31'),
      };
      prisma.subscription.findMany.mockResolvedValue([expired]);
      access.effectiveStatus.mockReturnValue('EXPIRED');

      const result = await service.listActive('user-1');
      expect(result).toHaveLength(0);
    });

    it('filters out pending subscriptions', async () => {
      prisma.subscription.findMany.mockResolvedValue([baseSub]);
      access.effectiveStatus.mockReturnValue('PENDING');

      const result = await service.listActive('user-1');
      expect(result).toHaveLength(0);
    });

    it('returns empty array when no active subscriptions', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);
      const result = await service.listActive('user-1');
      expect(result).toEqual([]);
    });
  });
});
