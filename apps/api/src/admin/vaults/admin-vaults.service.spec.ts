import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminVaultsService } from './admin-vaults.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

function mockPrismaService() {
  return {
    vault: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    vaultExperienceLevel: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    planVault: { count: jest.fn().mockResolvedValue(0) },
    subscriptionVaultAccess: { count: jest.fn().mockResolvedValue(0) },
    opportunityVault: { count: jest.fn().mockResolvedValue(0) },
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

describe('AdminVaultsService', () => {
  let service: AdminVaultsService;
  let prisma: ReturnType<typeof mockPrismaService>;
  let audit: ReturnType<typeof mockAuditService>;

  beforeEach(async () => {
    prisma = mockPrismaService();
    audit = mockAuditService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminVaultsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get(AdminVaultsService);
  });

  describe('list', () => {
    it('returns paginated vaults', async () => {
      const vaults = [
        {
          id: 'v-1',
          name: 'India',
          experienceLevels: [{ experienceLevel: { id: 'el-1', name: 'Junior' } }],
          plans: [{ plan: { id: 'p-1', name: 'Basic', isActive: true } }],
          _count: { subscriptionAccess: 5 },
        },
      ];
      prisma.vault.findMany.mockResolvedValue(vaults);
      prisma.vault.count.mockResolvedValue(1);

      const result = await service.list({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].experienceLevels).toEqual([{ id: 'el-1', name: 'Junior' }]);
      expect(result.items[0].plans).toEqual([{ id: 'p-1', name: 'Basic', isActive: true }]);
      expect(result.meta.totalItems).toBe(1);
    });

    it('filters by status', async () => {
      prisma.vault.findMany.mockResolvedValue([]);
      prisma.vault.count.mockResolvedValue(0);
      await service.list({ page: 1, limit: 20, status: 'ACTIVE' });
      expect(prisma.vault.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'ACTIVE' }) }),
      );
    });

    it('searches by name or description', async () => {
      prisma.vault.findMany.mockResolvedValue([]);
      prisma.vault.count.mockResolvedValue(0);
      await service.list({ page: 1, limit: 20, search: 'india' });
      expect(prisma.vault.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ name: { contains: 'india', mode: 'insensitive' } }]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns vault with experience levels and plans', async () => {
      const vault = {
        id: 'v-1',
        name: 'India',
        experienceLevels: [{ experienceLevel: { id: 'el-1' } }],
        plans: [{ plan: { id: 'p-1' } }],
      };
      prisma.vault.findFirst.mockResolvedValue(vault);
      const result = await service.findOne('v-1');
      expect(result.id).toBe('v-1');
      expect(result.experienceLevels).toEqual([{ id: 'el-1' }]);
    });

    it('throws for nonexistent vault', async () => {
      prisma.vault.findFirst.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws for archived vault', async () => {
      prisma.vault.findFirst.mockResolvedValue(null);
      await expect(service.findOne('archived-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a new vault', async () => {
      prisma.vault.findUnique.mockResolvedValue(null);
      prisma.vault.create.mockResolvedValue({ id: 'v-1', name: 'India' });
      prisma.vault.findFirst.mockResolvedValue({
        id: 'v-1',
        name: 'India',
        experienceLevels: [],
        plans: [],
      });

      const result = await service.create({ name: 'India' }, 'admin-1', '127.0.0.1');
      expect(result.id).toBe('v-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'VAULT_CREATED' }),
      );
    });

    it('rejects duplicate vault name', async () => {
      prisma.vault.findUnique.mockResolvedValue({ id: 'v-1', name: 'India', deletedAt: null });
      await expect(service.create({ name: 'India' }, 'admin-1')).rejects.toThrow(ConflictException);
    });

    it('revives soft-deleted vault with same name', async () => {
      prisma.vault.findUnique.mockResolvedValue({
        id: 'v-1',
        name: 'India',
        deletedAt: new Date(),
      });
      prisma.vault.update.mockResolvedValue({ id: 'v-1', name: 'India' });
      prisma.vault.findFirst.mockResolvedValue({
        id: 'v-1',
        name: 'India',
        experienceLevels: [],
        plans: [],
      });

      const result = await service.create({ name: 'India' }, 'admin-1');
      expect(result.id).toBe('v-1');
      expect(prisma.vault.update).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates a vault', async () => {
      prisma.vault.findFirst.mockResolvedValue({ id: 'v-1', name: 'Old' });
      prisma.vault.findUnique.mockResolvedValue(null);
      prisma.vault.update.mockResolvedValue({ id: 'v-1', name: 'New' });
      prisma.vault.findFirst.mockResolvedValue({
        id: 'v-1',
        name: 'New',
        experienceLevels: [],
        plans: [],
      });

      const result = await service.update('v-1', { name: 'New' }, 'admin-1');
      expect(result.id).toBe('v-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'VAULT_UPDATED' }),
      );
    });

    it('rejects duplicate name on update', async () => {
      prisma.vault.findFirst.mockResolvedValue({ id: 'v-1', name: 'Old' });
      prisma.vault.findUnique.mockResolvedValue({ id: 'v-2', name: 'Taken' });
      await expect(service.update('v-1', { name: 'Taken' }, 'admin-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('archives a vault', async () => {
      prisma.vault.findFirst.mockResolvedValue({ id: 'v-1' });
      prisma.vault.update.mockResolvedValue({
        id: 'v-1',
        status: 'ARCHIVED',
        deletedAt: new Date(),
      });
      const result = await service.remove('v-1', 'admin-1', '127.0.0.1');
      expect(result.archived).toBe(true);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'VAULT_ARCHIVED' }),
      );
    });
  });

  describe('restore + archived visibility', () => {
    it('restores an archived vault to active', async () => {
      prisma.vault.findFirst.mockResolvedValue({
        id: 'v-1',
        name: 'India Career',
        status: 'ARCHIVED',
        deletedAt: new Date(),
        experienceLevels: [],
        plans: [],
      });
      prisma.vault.update.mockResolvedValue({ id: 'v-1', name: 'India Career', status: 'ACTIVE' });
      prisma.vault.findFirst.mockResolvedValue({
        id: 'v-1',
        name: 'India Career',
        status: 'ACTIVE',
        deletedAt: null,
        experienceLevels: [],
        plans: [],
      });

      const result = await service.restore('v-1', 'admin-1');
      expect(result.status).toBe('ACTIVE');
      expect(prisma.vault.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE', deletedAt: null }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'VAULT_RESTORED' }),
      );
    });

    it('lists archived vaults when filtering by ARCHIVED status', async () => {
      prisma.vault.findMany.mockResolvedValue([]);
      prisma.vault.count.mockResolvedValue(0);
      await service.list({ page: 1, limit: 20, status: 'ARCHIVED' });
      expect(prisma.vault.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ARCHIVED', deletedAt: { not: null } }),
        }),
      );
    });
  });

  describe('experience level linking', () => {
    it('lists experience levels for a vault', async () => {
      prisma.vault.findFirst.mockResolvedValue({ id: 'v-1' });
      prisma.vaultExperienceLevel.findMany.mockResolvedValue([
        { experienceLevel: { id: 'el-1', name: 'Junior' } },
      ]);

      const result = await service.listExperienceLevels('v-1');
      expect(result).toEqual([{ id: 'el-1', name: 'Junior' }]);
    });

    it('adds experience level to vault', async () => {
      prisma.vault.findFirst.mockResolvedValue({ id: 'v-1' });
      prisma.experienceLevel = {
        findUnique: jest.fn().mockResolvedValue({ id: 'el-1', name: 'Junior' }),
      } as any;
      prisma.vaultExperienceLevel.findUnique.mockResolvedValue(null);
      prisma.vaultExperienceLevel.create.mockResolvedValue({});
      prisma.vaultExperienceLevel.findMany.mockResolvedValue([
        { experienceLevel: { id: 'el-1', name: 'Junior' } },
      ]);

      const result = await service.addExperienceLevel('v-1', 'el-1', 'admin-1');
      expect(result).toEqual([{ id: 'el-1', name: 'Junior' }]);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'VAULT_EXPERIENCE_LEVEL_ADDED' }),
      );
    });

    it('prevents duplicate experience level linking', async () => {
      prisma.vault.findFirst.mockResolvedValue({ id: 'v-1' });
      prisma.experienceLevel = {
        findUnique: jest.fn().mockResolvedValue({ id: 'el-1', name: 'Junior' }),
      } as any;
      prisma.vaultExperienceLevel.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.addExperienceLevel('v-1', 'el-1', 'admin-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws for nonexistent experience level', async () => {
      prisma.vault.findFirst.mockResolvedValue({ id: 'v-1' });
      prisma.experienceLevel = { findUnique: jest.fn().mockResolvedValue(null) } as any;

      await expect(service.addExperienceLevel('v-1', 'bad-id', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('removes experience level from vault', async () => {
      prisma.vault.findFirst.mockResolvedValue({ id: 'v-1' });
      prisma.vaultExperienceLevel.deleteMany.mockResolvedValue({ count: 1 });
      prisma.vaultExperienceLevel.findMany.mockResolvedValue([]);

      const result = await service.removeExperienceLevel('v-1', 'el-1', 'admin-1');
      expect(result).toEqual([]);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'VAULT_EXPERIENCE_LEVEL_REMOVED' }),
      );
    });
  });
});
