import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SubscriptionPlansService } from './subscription-plans.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

function mockPrismaService() {
  return {
    subscriptionPlan: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    planVault: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    subscription: { count: jest.fn() },
    vault: { findFirst: jest.fn() },
    $transaction: jest.fn(async (fns: any[]) => {
      const results = [];
      for (const fn of fns) {
        results.push(await fn);
      }
      return results;
    }),
  } as any;
}

function mockAuditService() {
  return { record: jest.fn().mockResolvedValue(undefined) } as any;
}

describe('SubscriptionPlansService', () => {
  let service: SubscriptionPlansService;
  let prisma: ReturnType<typeof mockPrismaService>;
  let audit: ReturnType<typeof mockAuditService>;

  beforeEach(async () => {
    prisma = mockPrismaService();
    audit = mockAuditService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SubscriptionPlansService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get(SubscriptionPlansService);
  });

  describe('list', () => {
    it('returns paginated plans with vaults', async () => {
      prisma.subscriptionPlan.findMany.mockResolvedValue([
        {
          id: 'p-1',
          name: 'Basic',
          vaults: [{ vault: { id: 'v-1', name: 'India', type: 'INDIA', status: 'ACTIVE' } }],
          _count: { subscriptions: 3 },
        },
      ]);
      prisma.subscriptionPlan.count.mockResolvedValue(1);

      const result = await service.list({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].vaults).toEqual([
        { id: 'v-1', name: 'India', type: 'INDIA', status: 'ACTIVE' },
      ]);
      expect(result.meta.totalItems).toBe(1);
    });

    it('filters by isActive', async () => {
      prisma.subscriptionPlan.findMany.mockResolvedValue([]);
      prisma.subscriptionPlan.count.mockResolvedValue(0);
      await service.list({ page: 1, limit: 20, isActive: false });
      expect(prisma.subscriptionPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isActive: false }) }),
      );
    });

    it('searches by name', async () => {
      prisma.subscriptionPlan.findMany.mockResolvedValue([]);
      prisma.subscriptionPlan.count.mockResolvedValue(0);
      await service.list({ page: 1, limit: 20, search: 'basic' });
      expect(prisma.subscriptionPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ name: { contains: 'basic', mode: 'insensitive' } }]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns plan with vaults', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue({
        id: 'p-1',
        name: 'Basic',
        vaults: [{ vault: { id: 'v-1', name: 'India', type: 'INDIA', status: 'ACTIVE' } }],
      });
      const result = await service.findOne('p-1');
      expect(result.id).toBe('p-1');
      expect(result.vaults).toHaveLength(1);
    });

    it('throws for nonexistent plan', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a plan', async () => {
      prisma.subscriptionPlan.findUnique.mockResolvedValue(null);
      prisma.subscriptionPlan.create.mockResolvedValue({ id: 'p-1', name: 'Basic' });
      prisma.subscriptionPlan.findFirst.mockResolvedValue({
        id: 'p-1',
        name: 'Basic',
        vaults: [],
      });

      const result = await service.create(
        { name: 'Basic', price: 499, currency: 'INR', durationDays: 30 },
        'admin-1',
      );
      expect(result.id).toBe('p-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PLAN_CREATED' }),
      );
    });

    it('stores currency normalized to uppercase', async () => {
      prisma.subscriptionPlan.findUnique.mockResolvedValue(null);
      prisma.subscriptionPlan.create.mockImplementation(async (args: any) => {
        expect(args.data.currency).toBe('INR');
        return { id: 'p-1', ...args.data };
      });
      prisma.subscriptionPlan.findFirst.mockResolvedValue({ id: 'p-1', vaults: [] });

      // currency must be a valid 3-letter code, uppercase enforced on write
      await service.create(
        { name: 'Test', price: 100, currency: 'INR', durationDays: 7 },
        'admin-1',
      );
    });

    it('rejects duplicate plan name', async () => {
      prisma.subscriptionPlan.findUnique.mockResolvedValue({
        id: 'p-1',
        name: 'Basic',
        deletedAt: null,
      });
      await expect(
        service.create({ name: 'Basic', price: 499, currency: 'INR', durationDays: 30 }, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects negative price', async () => {
      await expect(
        service.create({ name: 'Bad', price: -1, currency: 'INR', durationDays: 30 }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects zero duration', async () => {
      await expect(
        service.create({ name: 'Bad', price: 100, currency: 'INR', durationDays: 0 }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid currency format', async () => {
      await expect(
        service.create(
          { name: 'Bad', price: 100, currency: 'INVALID', durationDays: 30 },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('updates a plan', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue({ id: 'p-1', name: 'Old' });
      prisma.subscriptionPlan.findUnique.mockResolvedValue(null);
      prisma.subscriptionPlan.update.mockResolvedValue({ id: 'p-1', name: 'New' });
      prisma.subscriptionPlan.findFirst.mockResolvedValue({
        id: 'p-1',
        name: 'New',
        vaults: [],
      });

      const result = await service.update('p-1', { name: 'New' }, 'admin-1');
      expect(result.id).toBe('p-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PLAN_UPDATED' }),
      );
    });
  });

  describe('remove', () => {
    it('archives a plan with no subscriptions', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue({ id: 'p-1' });
      prisma.subscription.count.mockResolvedValue(0);
      prisma.subscriptionPlan.update.mockResolvedValue({ id: 'p-1' });

      const result = await service.remove('p-1', 'admin-1');
      expect(result.archived).toBe(true);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PLAN_ARCHIVED' }),
      );
    });

    it('rejects deletion of plan with subscriptions', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue({ id: 'p-1' });
      prisma.subscription.count.mockResolvedValue(5);
      await expect(service.remove('p-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('vault linking', () => {
    it('lists vaults for a plan', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue({ id: 'p-1' });
      prisma.planVault.findMany.mockResolvedValue([
        { vault: { id: 'v-1', name: 'India', sortOrder: 0 } },
      ]);

      const result = await service.listVaults('p-1');
      expect(result).toEqual([{ id: 'v-1', name: 'India', sortOrder: 0 }]);
    });

    it('adds vault to plan', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue({ id: 'p-1' });
      prisma.vault.findFirst.mockResolvedValue({ id: 'v-1', name: 'India' });
      prisma.planVault.findUnique.mockResolvedValue(null);
      prisma.planVault.create.mockResolvedValue({});
      prisma.planVault.findMany.mockResolvedValue([{ vault: { id: 'v-1', name: 'India' } }]);

      const result = await service.addVault('p-1', 'v-1', 'admin-1');
      expect(result).toHaveLength(1);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PLAN_VAULT_ADDED' }),
      );
    });

    it('prevents duplicate vault linking', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue({ id: 'p-1' });
      prisma.vault.findFirst.mockResolvedValue({ id: 'v-1', name: 'India' });
      prisma.planVault.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.addVault('p-1', 'v-1', 'admin-1')).rejects.toThrow(ConflictException);
    });

    it('throws for nonexistent vault', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue({ id: 'p-1' });
      prisma.vault.findFirst.mockResolvedValue(null);

      await expect(service.addVault('p-1', 'bad-id', 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('removes vault from plan', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue({ id: 'p-1' });
      prisma.planVault.deleteMany.mockResolvedValue({ count: 1 });
      prisma.planVault.findMany.mockResolvedValue([]);

      const result = await service.removeVault('p-1', 'v-1', 'admin-1');
      expect(result).toEqual([]);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PLAN_VAULT_REMOVED' }),
      );
    });
  });
});
