import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminOpportunitiesService } from './admin-opportunities.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

function mockPrismaService(): any {
  return {
    opportunity: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    opportunityVault: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    opportunityExperienceLevel: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    vault: { findMany: jest.fn() },
    experienceLevel: { findMany: jest.fn() },
    $transaction: jest.fn(async (fns: any) => {
      if (typeof fns === 'function') return fns(mockPrismaService());
      const results = [];
      for (const fn of fns) results.push(await fn);
      return results;
    }),
  } as any;
}

function mockAuditService() {
  return { record: jest.fn().mockResolvedValue(undefined) } as any;
}

describe('AdminOpportunitiesService', () => {
  let service: AdminOpportunitiesService;
  let prisma: ReturnType<typeof mockPrismaService>;
  let audit: ReturnType<typeof mockAuditService>;

  beforeEach(async () => {
    prisma = mockPrismaService();
    audit = mockAuditService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminOpportunitiesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get(AdminOpportunitiesService);
  });

  describe('list', () => {
    it('returns paginated opportunities with normalized relations', async () => {
      prisma.opportunity.findMany.mockResolvedValue([
        {
          id: 'opp-1',
          title: 'Senior Dev',
          status: 'PUBLISHED',
          category: 'INDIA',
          vaults: [{ vault: { id: 'v-1', name: 'India', type: 'INDIA' } }],
          experienceLevels: [
            { experienceLevel: { id: 'el-1', name: 'Career', minYears: 0, maxYears: 5 } },
          ],
          creator: { id: 'admin-1', email: 'admin@test.com' },
          _count: { vaults: 1, experienceLevels: 1 },
        },
      ]);
      prisma.opportunity.count.mockResolvedValue(1);

      const result = await service.list({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].vaults).toEqual([{ id: 'v-1', name: 'India', type: 'INDIA' }]);
      expect(result.items[0].experienceLevels).toEqual([
        { id: 'el-1', name: 'Career', minYears: 0, maxYears: 5 },
      ]);
      expect(result.meta.totalItems).toBe(1);
    });

    it('filters by status', async () => {
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);
      await service.list({ page: 1, limit: 20, status: 'DRAFT' });
      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'DRAFT' }) }),
      );
    });

    it('filters by category', async () => {
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);
      await service.list({ page: 1, limit: 20, category: 'GLOBAL' });
      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ category: 'GLOBAL' }) }),
      );
    });

    it('searches by title/description/company', async () => {
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);
      await service.list({ page: 1, limit: 20, search: 'engineer' });
      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ title: { contains: 'engineer', mode: 'insensitive' } }]),
          }),
        }),
      );
    });

    it('filters by experience level', async () => {
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);
      await service.list({ page: 1, limit: 20, experienceLevelId: 'el-1' });
      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            experienceLevels: { some: { experienceLevelId: 'el-1' } },
          }),
        }),
      );
    });

    it('filters by date range', async () => {
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);
      await service.list({
        page: 1,
        limit: 20,
        publishedAfter: '2026-01-01',
        publishedBefore: '2026-12-31',
      });
      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            publishedDate: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-12-31'),
            },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns an opportunity with relations', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({
        id: 'opp-1',
        title: 'Senior Dev',
        vaults: [{ vault: { id: 'v-1', name: 'India' } }],
        experienceLevels: [{ experienceLevel: { id: 'el-1', name: 'Career' } }],
        creator: { id: 'admin-1', email: 'admin@test.com' },
      });
      const result = await service.findOne('opp-1');
      expect(result.id).toBe('opp-1');
      expect(result.vaults).toHaveLength(1);
    });

    it('throws for nonexistent opportunity', async () => {
      prisma.opportunity.findFirst.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates an opportunity without vaults', async () => {
      prisma.opportunity.create.mockResolvedValue({
        id: 'opp-1',
        title: 'Dev',
        vaults: [],
        experienceLevels: [],
      });

      const result = await service.create({ title: 'Dev', category: 'INDIA' }, 'admin-1');
      expect(result.id).toBe('opp-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'OPPORTUNITY_CREATED' }),
      );
    });

    it('creates with vault and experience level links', async () => {
      prisma.vault.findMany.mockResolvedValue([{ id: 'v-1' }]);
      prisma.experienceLevel.findMany.mockResolvedValue([{ id: 'el-1' }]);
      prisma.opportunity.create.mockResolvedValue({
        id: 'opp-1',
        title: 'Dev',
        vaults: [{ vault: { id: 'v-1', name: 'India' } }],
        experienceLevels: [{ experienceLevel: { id: 'el-1', name: 'Career' } }],
      });

      const result = await service.create(
        { title: 'Dev', category: 'INDIA', vaultIds: ['v-1'], experienceLevelIds: ['el-1'] },
        'admin-1',
      );
      expect(result.vaults).toHaveLength(1);
    });

    it('rejects invalid vault IDs', async () => {
      prisma.vault.findMany.mockResolvedValue([]);

      await expect(
        service.create({ title: 'Dev', category: 'INDIA', vaultIds: ['bad-vault'] }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid experience level IDs', async () => {
      prisma.vault.findMany.mockResolvedValue([{ id: 'v-1' }]);
      prisma.experienceLevel.findMany.mockResolvedValue([]);

      await expect(
        service.create(
          {
            title: 'Dev',
            category: 'INDIA',
            vaultIds: ['v-1'],
            experienceLevelIds: ['bad-el'],
          },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets publishedDate when status is PUBLISHED', async () => {
      prisma.opportunity.create.mockImplementation(async (args: any) => {
        expect(args.data.publishedDate).toBeInstanceOf(Date);
        expect(args.data.status).toBe('PUBLISHED');
        return { id: 'opp-1', ...args.data, vaults: [], experienceLevels: [] };
      });

      await service.create({ title: 'Dev', category: 'INDIA', status: 'PUBLISHED' }, 'admin-1');
    });
  });

  describe('update', () => {
    it('updates an opportunity', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({
        id: 'opp-1',
        title: 'Old',
        publishedDate: null,
      });
      prisma.opportunity.update.mockResolvedValue({
        id: 'opp-1',
        title: 'New',
        vaults: [],
        experienceLevels: [],
      });

      const result = await service.update('opp-1', { title: 'New' }, 'admin-1');
      expect(result.id).toBe('opp-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'OPPORTUNITY_UPDATED' }),
      );
    });

    it('replaces vault links on update', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1', publishedDate: null });
      prisma.vault.findMany.mockResolvedValue([{ id: 'v-2' }]);
      prisma.opportunityVault.deleteMany.mockResolvedValue({ count: 0 });
      prisma.opportunityVault.createMany.mockResolvedValue({ count: 1 });
      prisma.opportunity.update.mockResolvedValue({
        id: 'opp-1',
        vaults: [{ vault: { id: 'v-2', name: 'Global' } }],
        experienceLevels: [],
      });

      await service.update('opp-1', { vaultIds: ['v-2'] }, 'admin-1');
      expect(prisma.opportunityVault.deleteMany).toHaveBeenCalledWith({
        where: { opportunityId: 'opp-1' },
      });
    });

    it('sets publishedDate when changing status to PUBLISHED', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({
        id: 'opp-1',
        publishedDate: null,
      });
      prisma.opportunity.update.mockImplementation(async (args: any) => {
        if (args.data.status === 'PUBLISHED') {
          expect(args.data.publishedDate).toBeInstanceOf(Date);
        }
        return { id: 'opp-1', ...args.data, vaults: [], experienceLevels: [] };
      });

      await service.update('opp-1', { status: 'PUBLISHED' }, 'admin-1');
    });

    it('throws for nonexistent opportunity', async () => {
      prisma.opportunity.findFirst.mockResolvedValue(null);
      await expect(service.update('bad-id', { title: 'X' }, 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects invalid vault IDs on update', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1', publishedDate: null });
      prisma.vault.findMany.mockResolvedValue([]);

      await expect(service.update('opp-1', { vaultIds: ['bad-vault'] }, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('archives an opportunity', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({
        id: 'opp-1',
        title: 'Dev',
        category: 'INDIA',
      });
      prisma.opportunity.update.mockResolvedValue({ id: 'opp-1' });

      const result = await service.remove('opp-1', 'admin-1');
      expect(result.archived).toBe(true);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'OPPORTUNITY_ARCHIVED' }),
      );
    });

    it('throws for nonexistent opportunity', async () => {
      prisma.opportunity.findFirst.mockResolvedValue(null);
      await expect(service.remove('bad-id', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });
});
