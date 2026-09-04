import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ExperienceLevelsService } from './experience-levels.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

function mockPrismaService() {
  return {
    experienceLevel: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    vaultExperienceLevel: { count: jest.fn() },
    opportunityExperienceLevel: { count: jest.fn() },
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

describe('ExperienceLevelsService', () => {
  let service: ExperienceLevelsService;
  let prisma: ReturnType<typeof mockPrismaService>;
  let audit: ReturnType<typeof mockAuditService>;

  beforeEach(async () => {
    prisma = mockPrismaService();
    audit = mockAuditService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ExperienceLevelsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get(ExperienceLevelsService);
  });

  describe('list', () => {
    it('returns all experience levels ordered by sort order', async () => {
      prisma.experienceLevel.findMany.mockResolvedValue([
        { id: 'el-1', name: 'Junior', minYears: 0, maxYears: 2 },
        { id: 'el-2', name: 'Mid', minYears: 3, maxYears: 5 },
      ]);
      const result = await service.list();
      expect(result).toHaveLength(2);
      expect(prisma.experienceLevel.findMany).toHaveBeenCalledWith({
        orderBy: [{ sortOrder: 'asc' }, { minYears: 'asc' }],
      });
    });
  });

  describe('findOne', () => {
    it('returns experience level by id', async () => {
      prisma.experienceLevel.findUnique.mockResolvedValue({
        id: 'el-1',
        name: 'Junior',
        minYears: 0,
        maxYears: 2,
      });
      const result = await service.findOne('el-1');
      expect(result.id).toBe('el-1');
    });

    it('throws for nonexistent id', async () => {
      prisma.experienceLevel.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a new experience level', async () => {
      prisma.experienceLevel.findMany.mockResolvedValue([]);
      prisma.experienceLevel.findUnique.mockResolvedValue(null);
      prisma.experienceLevel.create.mockResolvedValue({
        id: 'el-1',
        name: 'Junior',
        slug: 'junior',
        code: 'JUNIOR',
        minYears: 0,
        maxYears: 2,
      });

      const result = await service.create({ name: 'Junior', minYears: 0, maxYears: 2 }, 'admin-1');
      expect(result.id).toBe('el-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EXPERIENCE_LEVEL_CREATED' }),
      );
    });

    it('generates slug and code from name', async () => {
      prisma.experienceLevel.findMany.mockResolvedValue([]);
      prisma.experienceLevel.findUnique.mockResolvedValue(null);
      prisma.experienceLevel.create.mockImplementation(async (args: any) => {
        expect(args.data.slug).toBe('mid-level');
        expect(args.data.code).toBe('MID-LEVEL');
        return { id: 'el-1', ...args.data };
      });

      await service.create({ name: 'Mid Level', minYears: 3, maxYears: 5 }, 'admin-1');
    });

    it('rejects overlapping range', async () => {
      prisma.experienceLevel.findMany.mockResolvedValue([
        { id: 'el-0', name: 'Existing', minYears: 0, maxYears: 5 },
      ]);
      await expect(
        service.create({ name: 'Overlap', minYears: 2, maxYears: 4 }, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects negative minYears', async () => {
      await expect(service.create({ name: 'Bad', minYears: -1 }, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects maxYears <= minYears', async () => {
      await expect(
        service.create({ name: 'Bad', minYears: 5, maxYears: 3 }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate slug', async () => {
      prisma.experienceLevel.findMany.mockResolvedValue([]);
      // slug check returns an existing level -> ConflictException
      prisma.experienceLevel.findUnique.mockResolvedValue({ id: 'el-0' });
      await expect(
        service.create({ name: 'Junior', slug: 'taken', minYears: 0 }, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('allows contiguous (non-overlapping) ranges', async () => {
      prisma.experienceLevel.findMany.mockResolvedValue([
        { id: 'el-0', name: 'Junior', minYears: 0, maxYears: 2 },
      ]);
      prisma.experienceLevel.findUnique.mockResolvedValue(null);
      prisma.experienceLevel.create.mockImplementation(async (args: any) => ({
        id: 'el-1',
        ...args.data,
      }));

      const result = await service.create({ name: 'Mid', minYears: 2, maxYears: 5 }, 'admin-1');
      expect(result.id).toBe('el-1');
    });
  });

  describe('update', () => {
    it('updates an experience level', async () => {
      prisma.experienceLevel.findUnique.mockResolvedValue({
        id: 'el-1',
        name: 'Junior',
        slug: 'junior',
        code: 'JUNIOR',
        minYears: 0,
        maxYears: 2,
      });
      // excludeId=el-1 so its own range should not be considered an overlap;
      // mock returns the "other" levels (none, since only el-1 exists)
      prisma.experienceLevel.findMany.mockResolvedValue([]);
      prisma.experienceLevel.update.mockResolvedValue({
        id: 'el-1',
        name: 'Jr',
        slug: 'junior',
        code: 'JUNIOR',
        minYears: 0,
        maxYears: 2,
      });

      const result = await service.update('el-1', { name: 'Jr' }, 'admin-1');
      expect(result.name).toBe('Jr');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EXPERIENCE_LEVEL_UPDATED' }),
      );
    });
  });

  describe('remove', () => {
    it('deletes an unreferenced experience level', async () => {
      prisma.experienceLevel.findUnique.mockResolvedValue({ id: 'el-1', name: 'Junior' });
      prisma.vaultExperienceLevel.count.mockResolvedValue(0);
      prisma.opportunityExperienceLevel.count.mockResolvedValue(0);
      prisma.experienceLevel.delete.mockResolvedValue({ id: 'el-1' });

      const result = await service.remove('el-1', 'admin-1');
      expect(result.deleted).toBe(true);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EXPERIENCE_LEVEL_DELETED' }),
      );
    });

    it('blocks deletion if referenced by vault', async () => {
      prisma.experienceLevel.findUnique.mockResolvedValue({ id: 'el-1', name: 'Junior' });
      prisma.vaultExperienceLevel.count.mockResolvedValue(1);
      prisma.opportunityExperienceLevel.count.mockResolvedValue(0);

      await expect(service.remove('el-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('blocks deletion if referenced by opportunity', async () => {
      prisma.experienceLevel.findUnique.mockResolvedValue({ id: 'el-1', name: 'Junior' });
      prisma.vaultExperienceLevel.count.mockResolvedValue(0);
      prisma.opportunityExperienceLevel.count.mockResolvedValue(1);

      await expect(service.remove('el-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('throws for nonexistent id', async () => {
      prisma.experienceLevel.findUnique.mockResolvedValue(null);
      await expect(service.remove('bad-id', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });
});
