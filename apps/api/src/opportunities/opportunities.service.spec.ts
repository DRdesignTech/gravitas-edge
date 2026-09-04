import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionAccessService } from '../access/subscription-access.service';

function mockPrismaService() {
  return {
    opportunity: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(async (fns: any[]) => {
      const results = [];
      for (const fn of fns) results.push(await fn);
      return results;
    }),
  } as any;
}

function mockAccessService() {
  return {
    getAccessibleVaultIds: jest.fn(),
    hasVaultAccess: jest.fn(),
  } as any;
}

describe('OpportunitiesService', () => {
  let service: OpportunitiesService;
  let prisma: ReturnType<typeof mockPrismaService>;
  let access: ReturnType<typeof mockAccessService>;

  const baseOpportunity = {
    id: 'opp-1',
    title: 'Senior Dev',
    description: 'Great role',
    company: 'Acme',
    location: 'Bangalore',
    country: 'India',
    employmentType: 'FULL_TIME',
    industry: 'Tech',
    functionalArea: 'Engineering',
    minExperience: 3,
    maxExperience: 8,
    applicationUrl: 'https://apply.acme.com',
    applicationContact: 'hr@acme.com',
    source: 'linkedin',
    category: 'INDIA',
    status: 'PUBLISHED',
    publishedDate: new Date('2026-01-01'),
    expiryDate: new Date('2026-12-31'),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = mockPrismaService();
    access = mockAccessService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        OpportunitiesService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionAccessService, useValue: access },
      ],
    }).compile();
    service = moduleRef.get(OpportunitiesService);
  });

  describe('listForUser', () => {
    it('returns published non-premium opportunities for unauthenticated users', async () => {
      prisma.opportunity.findMany.mockResolvedValue([
        { ...baseOpportunity, vaults: [], experienceLevels: [], _count: { vaults: 0 } },
      ]);
      prisma.opportunity.count.mockResolvedValue(1);

      const result = await service.listForUser(undefined, { page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].isPremium).toBe(false);
      expect(access.getAccessibleVaultIds).not.toHaveBeenCalled();
    });

    it('includes premium opportunities user has access to', async () => {
      access.getAccessibleVaultIds.mockResolvedValue(['v-1']);
      prisma.opportunity.findMany.mockResolvedValue([
        {
          ...baseOpportunity,
          vaults: [{ vault: { id: 'v-1', name: 'India' } }],
          experienceLevels: [{ experienceLevel: { id: 'el-1', name: 'Career' } }],
          _count: { vaults: 1 },
        },
      ]);
      prisma.opportunity.count.mockResolvedValue(1);

      const result = await service.listForUser('user-1', { page: 1, limit: 20 });
      expect(result.items[0].isPremium).toBe(true);
      expect(result.items[0].vaults).toBeUndefined();
    });

    it('excludes premium opportunities user lacks access to', async () => {
      access.getAccessibleVaultIds.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);

      const result = await service.listForUser('user-1', { page: 1, limit: 20 });
      expect(result.items).toHaveLength(0);
      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vaults: { none: {} },
          }),
        }),
      );
    });

    it('searches by title/description/company', async () => {
      access.getAccessibleVaultIds.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);

      await service.listForUser(undefined, { page: 1, limit: 20, search: 'engineer' });
      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ title: { contains: 'engineer', mode: 'insensitive' } }]),
          }),
        }),
      );
    });

    it('filters by category', async () => {
      access.getAccessibleVaultIds.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);

      await service.listForUser(undefined, { page: 1, limit: 20, category: 'GLOBAL' });
      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'GLOBAL' }),
        }),
      );
    });

    it('filters by country', async () => {
      access.getAccessibleVaultIds.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);

      await service.listForUser(undefined, { page: 1, limit: 20, country: 'India' });
      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            country: { contains: 'India', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('filters by experience level', async () => {
      access.getAccessibleVaultIds.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);

      await service.listForUser(undefined, { page: 1, limit: 20, experienceLevelId: 'el-1' });
      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            experienceLevels: { some: { experienceLevelId: 'el-1' } },
          }),
        }),
      );
    });

    it('supports custom sort', async () => {
      access.getAccessibleVaultIds.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);

      await service.listForUser(undefined, {
        page: 1,
        limit: 20,
        sortBy: 'title',
        sortOrder: 'asc',
      });
      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { title: 'asc' } }),
      );
    });
  });

  describe('findOneForUser', () => {
    it('returns a non-premium opportunity to anyone', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({
        ...baseOpportunity,
        vaults: [],
        experienceLevels: [{ experienceLevel: { id: 'el-1', name: 'Career' } }],
      });

      const result = await service.findOneForUser('opp-1');
      expect(result.id).toBe('opp-1');
      expect(result.isPremium).toBe(false);
    });

    it('returns a premium opportunity to user with vault access', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({
        ...baseOpportunity,
        vaults: [{ vault: { id: 'v-1', name: 'India', type: 'INDIA' } }],
        experienceLevels: [],
      });
      access.hasVaultAccess.mockResolvedValue(true);

      const result = await service.findOneForUser('opp-1', 'user-1');
      expect(result.isPremium).toBe(true);
      expect(result.vaults).toHaveLength(1);
    });

    it('throws NotFoundException for premium opportunity without access', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({
        ...baseOpportunity,
        vaults: [{ vault: { id: 'v-1', name: 'India' } }],
        experienceLevels: [],
      });
      access.hasVaultAccess.mockResolvedValue(false);

      await expect(service.findOneForUser('opp-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for premium opportunity without auth', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({
        ...baseOpportunity,
        vaults: [{ vault: { id: 'v-1', name: 'India' } }],
        experienceLevels: [],
      });

      await expect(service.findOneForUser('opp-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for nonexistent opportunity', async () => {
      prisma.opportunity.findFirst.mockResolvedValue(null);
      await expect(service.findOneForUser('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
