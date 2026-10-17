import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionAccessService } from '../access/subscription-access.service';
import { maskProtectedValue } from '@job-portal/shared';

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
    qualification: 'B.Tech',
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

  function premiumOpportunity(vaultIds: string[]) {
    return {
      ...baseOpportunity,
      vaults: vaultIds.map((id) => ({
        vault: { id, name: id, type: 'INDIA' },
      })),
      experienceLevels: [{ experienceLevel: { id: 'el-1', name: 'Career' } }],
    };
  }

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
    it('returns published non-premium opportunities to unauthenticated users (full access)', async () => {
      prisma.opportunity.findMany.mockResolvedValue([
        { ...baseOpportunity, vaults: [], experienceLevels: [] },
      ]);
      prisma.opportunity.count.mockResolvedValue(1);

      const result = await service.listForUser(undefined, { page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].isPremium).toBe(false);
      expect(result.items[0].isFullAccess).toBe(true);
      expect(result.items[0].description).toBe('Great role');
      expect(access.getAccessibleVaultIds).not.toHaveBeenCalled();
    });

    it('returns premium opportunities with full access when user has the vault', async () => {
      access.getAccessibleVaultIds.mockResolvedValue(['v-1']);
      prisma.opportunity.findMany.mockResolvedValue([premiumOpportunity(['v-1'])]);
      prisma.opportunity.count.mockResolvedValue(1);

      const result = await service.listForUser('user-1', { page: 1, limit: 20 });
      expect(result.items[0].isPremium).toBe(true);
      expect(result.items[0].isFullAccess).toBe(true);
      expect(result.items[0].applicationContact).toBe('hr@acme.com');
      expect(result.items[0].vaults).toEqual([{ id: 'v-1', name: 'v-1', type: 'INDIA' }]);
    });

    it('shows premium opportunities as locked teasers to users without access', async () => {
      access.getAccessibleVaultIds.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([premiumOpportunity(['v-1'])]);
      prisma.opportunity.count.mockResolvedValue(1);

      const result = await service.listForUser('user-1', { page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].isPremium).toBe(true);
      expect(result.items[0].isFullAccess).toBe(false);
      expect(result.items[0].description).toBeUndefined();
      expect(result.items[0].qualification).toBeUndefined();
      expect(result.items[0].applicationContact).toBeUndefined();
      expect(result.items[0].vaults).toEqual([{ id: 'v-1', name: 'v-1', type: 'INDIA' }]);
    });

    it('returns masked lockedPreview teasers (never originals) for locked premium jobs', async () => {
      access.getAccessibleVaultIds.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([premiumOpportunity(['v-1'])]);
      prisma.opportunity.count.mockResolvedValue(1);

      const result = await service.listForUser('user-1', { page: 1, limit: 20 });
      const item = result.items[0];
      const preview = item.lockedPreview;
      expect(preview).toBeDefined();
      expect(preview?.otherDetails).toBe(`G${'*'.repeat(8)}e`);
      expect(preview?.qualification).toBe('B****h');
      expect(preview?.howToApply).toBe(`h${'*'.repeat(20)}m`);
      expect(preview?.applicationContact).toBe(`h${'*'.repeat(9)}m`);
    });

    it('does not apply vault restriction to the list query (teasers are returned)', async () => {
      access.getAccessibleVaultIds.mockResolvedValue(['v-1']);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);

      await service.listForUser('user-1', { page: 1, limit: 20 });
      const whereArgs = prisma.opportunity.findMany.mock.calls[0][0].where;
      expect(whereArgs.vaults).toBeUndefined();
    });

    it('never returns draft (or archived/expired) opportunities to any user', async () => {
      // Draft management correctness depends on the public list filtering by
      // exactly PUBLISHED + not-deleted, so a saved Draft can never leak out.
      access.getAccessibleVaultIds.mockResolvedValue(['v-1']);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);

      await service.listForUser('user-1', { page: 1, limit: 20 });

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            status: 'PUBLISHED',
          }),
        }),
      );
      // The count used for pagination must apply the exact same filter so a
      // draft cannot affect page totals.
      expect(prisma.opportunity.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null, status: 'PUBLISHED' } }),
      );
    });

    it('searches by title/description/company and sector+location', async () => {
      access.getAccessibleVaultIds.mockResolvedValue(['v-1']);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);

      await service.listForUser(undefined, { page: 1, limit: 20, search: 'engineer' });
      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { title: { contains: 'engineer', mode: 'insensitive' } },
                  { location: { contains: 'engineer', mode: 'insensitive' } },
                  { industry: { contains: 'engineer', mode: 'insensitive' } },
                  { jobId: { contains: 'engineer', mode: 'insensitive' } },
                ]),
              }),
            ]),
          }),
        }),
      );
    });

    it('ANDs multiple search keywords across fields', async () => {
      access.getAccessibleVaultIds.mockResolvedValue(['v-1']);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);

      await service.listForUser(undefined, {
        page: 1,
        limit: 20,
        search: 'dubai engineer 500000',
      });

      const where = prisma.opportunity.findMany.mock.calls[0][0].where;
      expect(where.AND).toHaveLength(3);
      for (const [i, term] of ['dubai', 'engineer', '500000'].entries()) {
        expect(where.AND[i].OR).toEqual(
          expect.arrayContaining([{ location: { contains: term, mode: 'insensitive' } }]),
        );
      }
    });

    it('returns the Job ID on public opportunities', async () => {
      prisma.opportunity.findMany.mockResolvedValue([
        { ...baseOpportunity, jobId: 'JOB-2026-0001', vaults: [], experienceLevels: [] },
      ]);
      prisma.opportunity.count.mockResolvedValue(1);

      const result = await service.listForUser(undefined, { page: 1, limit: 20 });
      expect(result.items[0].jobId).toBe('JOB-2026-0001');
    });

    it('serializes a missing Job ID as null', async () => {
      prisma.opportunity.findMany.mockResolvedValue([
        { ...baseOpportunity, jobId: null, vaults: [], experienceLevels: [] },
      ]);
      prisma.opportunity.count.mockResolvedValue(1);

      const result = await service.listForUser(undefined, { page: 1, limit: 20 });
      expect(result.items[0].jobId).toBeNull();
    });

    it('filters jobs by vault', async () => {
      access.getAccessibleVaultIds.mockResolvedValue(['v-1']);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);

      await service.listForUser(undefined, { page: 1, limit: 20, vaultId: 'v-9' });
      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vaults: { some: { vaultId: 'v-9' } },
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

    it('returns pagination metadata', async () => {
      access.getAccessibleVaultIds.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([
        { ...baseOpportunity, vaults: [], experienceLevels: [] },
      ]);
      prisma.opportunity.count.mockResolvedValue(25);

      const result = await service.listForUser(undefined, { page: 2, limit: 20 });
      expect(result.meta).toEqual({
        page: 2,
        limit: 20,
        totalItems: 25,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });
  });

  describe('findOneForUser', () => {
    it('returns a non-premium opportunity to anyone (full access)', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({
        ...baseOpportunity,
        vaults: [],
        experienceLevels: [{ experienceLevel: { id: 'el-1', name: 'Career' } }],
      });

      const result = await service.findOneForUser('opp-1');
      expect(result.id).toBe('opp-1');
      expect(result.isPremium).toBe(false);
      expect(result.isFullAccess).toBe(true);
      expect(result.applicationContact).toBe('hr@acme.com');
    });

    it('returns full details to a subscriber with the correct vault', async () => {
      prisma.opportunity.findFirst.mockResolvedValue(premiumOpportunity(['v-1']));
      access.getAccessibleVaultIds.mockResolvedValue(['v-1']);

      const result = await service.findOneForUser('opp-1', 'user-1');
      expect(result.isPremium).toBe(true);
      expect(result.isFullAccess).toBe(true);
      expect(result.description).toBe('Great role');
      expect(result.qualification).toBe('B.Tech');
      expect(result.applicationContact).toBe('hr@acme.com');
      expect(result.lockedPreview).toBeUndefined();
      expect(result.vaults).toHaveLength(1);
    });

    it('returns basic info (no full description) for a premium job without auth', async () => {
      prisma.opportunity.findFirst.mockResolvedValue(premiumOpportunity(['v-1']));

      const result = await service.findOneForUser('opp-1');
      expect(result.isPremium).toBe(true);
      expect(result.isFullAccess).toBe(false);
      expect(result.description).toBeUndefined();
    });

    it('never leaks the contact email for a locked premium job', async () => {
      prisma.opportunity.findFirst.mockResolvedValue(premiumOpportunity(['v-1']));
      access.getAccessibleVaultIds.mockResolvedValue([]);

      const result = await service.findOneForUser('opp-1', 'user-1');
      expect(result.isFullAccess).toBe(false);
      expect(result.applicationContact).toBeUndefined();
      expect(result.applicationUrl).toBeUndefined();
      expect(result.description).toBeUndefined();
      expect(result.source).toBeUndefined();
      expect(result.lockedPreview).toBeDefined();
      expect(result.lockedPreview?.qualification).toBe('B****h');
      expect(result.lockedPreview?.otherDetails).toBe(`G${'*'.repeat(8)}e`);
      expect(result.lockedPreview?.howToApply).toBe(`h${'*'.repeat(20)}m`);
      expect(result.lockedPreview?.applicationContact).toBe(`h${'*'.repeat(9)}m`);
    });

    it('does not unlock a premium job from another vault (vault A sub vs vault B job)', async () => {
      prisma.opportunity.findFirst.mockResolvedValue(premiumOpportunity(['v-2']));
      access.getAccessibleVaultIds.mockResolvedValue(['v-1']);

      const result = await service.findOneForUser('opp-1', 'user-1');
      expect(result.isPremium).toBe(true);
      expect(result.isFullAccess).toBe(false);
      expect(result.applicationContact).toBeUndefined();
    });

    it('locks a premium job when subscriptions are expired (no accessible vaults)', async () => {
      prisma.opportunity.findFirst.mockResolvedValue(premiumOpportunity(['v-1']));
      access.getAccessibleVaultIds.mockResolvedValue([]);

      const result = await service.findOneForUser('opp-1', 'user-1');
      expect(result.isFullAccess).toBe(false);
      expect(result.description).toBeUndefined();
    });

    it('grants full access when the user holds ANY of the job vaults', async () => {
      prisma.opportunity.findFirst.mockResolvedValue(premiumOpportunity(['v-1', 'v-2']));
      access.getAccessibleVaultIds.mockResolvedValue(['v-2']);

      const result = await service.findOneForUser('opp-1', 'user-1');
      expect(result.isFullAccess).toBe(true);
      expect(result.applicationContact).toBe('hr@acme.com');
    });

    it('throws NotFoundException for a nonexistent opportunity', async () => {
      prisma.opportunity.findFirst.mockResolvedValue(null);
      await expect(service.findOneForUser('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('never returns a draft opportunity by id (404 for drafts)', async () => {
      prisma.opportunity.findFirst.mockResolvedValue(null);

      await expect(service.findOneForUser('opp-draft', 'user-1')).rejects.toThrow(
        NotFoundException,
      );

      // The detail query must filter on PUBLISHED + not-deleted, not merely on id.
      expect(prisma.opportunity.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'opp-draft', deletedAt: null, status: 'PUBLISHED' },
        }),
      );
    });
  });

  describe('maskProtectedValue (shared utility)', () => {
    it('preserves empty/null/undefined values', () => {
      expect(maskProtectedValue(null)).toBeNull();
      expect(maskProtectedValue(undefined)).toBeNull();
      expect(maskProtectedValue('')).toBe('');
    });

    it('returns short values unchanged', () => {
      expect(maskProtectedValue('A')).toBe('A');
      expect(maskProtectedValue('AB')).toBe('AB');
    });

    it('masks the middle of longer values, keeping first and last character', () => {
      expect(maskProtectedValue('Manager')).toBe('M*****r');
      expect(maskProtectedValue('B.Tech')).toBe('B****h');
      expect(maskProtectedValue('Recruitment Team')).toBe('R**************m');
      expect(maskProtectedValue('Delhi')).toBe('D***i');
      expect(maskProtectedValue('hr@acme.com')).toBe(`h${'*'.repeat(9)}m`);
      expect(maskProtectedValue('https://apply.acme.com')).toBe(`h${'*'.repeat(20)}m`);
    });
  });
});
