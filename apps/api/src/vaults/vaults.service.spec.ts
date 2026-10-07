import { Test } from '@nestjs/testing';
import { VaultsService } from './vaults.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionAccessService } from '../access/subscription-access.service';

function mockPrismaService() {
  return {
    vault: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  } as any;
}

function mockAccessService() {
  return {
    getAccessibleVaultIds: jest.fn(),
  } as any;
}

describe('VaultsService', () => {
  let service: VaultsService;
  let prisma: ReturnType<typeof mockPrismaService>;
  let access: ReturnType<typeof mockAccessService>;

  const baseVaults = [
    {
      id: 'v-1',
      name: 'India',
      description: 'India vault',
      type: 'INDIA',
      experienceLevels: [
        { experienceLevel: { id: 'el-1', name: 'Junior', minYears: 0, maxYears: 2 } },
      ],
    },
    {
      id: 'v-2',
      name: 'Global',
      description: 'Global vault',
      type: 'GLOBAL',
      experienceLevels: [],
    },
  ];

  beforeEach(async () => {
    prisma = mockPrismaService();
    access = mockAccessService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        VaultsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionAccessService, useValue: access },
      ],
    }).compile();
    service = moduleRef.get(VaultsService);
  });

  describe('listForUser', () => {
    it('marks locked vaults and hides experience levels', async () => {
      prisma.vault.findMany.mockResolvedValue(baseVaults);
      access.getAccessibleVaultIds.mockResolvedValue(['v-1']);

      const result = await service.listForUser('user-1');
      expect(result).toHaveLength(2);

      const india = result.find((v: any) => v.id === 'v-1')!;
      expect(india.locked).toBe(false);
      expect(india.experienceLevels).toHaveLength(1);

      const global = result.find((v: any) => v.id === 'v-2')!;
      expect(global.locked).toBe(true);
      expect(global.experienceLevels).toEqual([]);
    });

    it('marks all vaults as locked for unauthenticated user', async () => {
      prisma.vault.findMany.mockResolvedValue(baseVaults);

      const result = await service.listForUser();
      expect(result.every((v: any) => v.locked)).toBe(true);
      expect(result.every((v: any) => v.experienceLevels.length === 0)).toBe(true);
    });

    it('returns safe metadata for locked vaults (no premium content)', async () => {
      prisma.vault.findMany.mockResolvedValue(baseVaults);
      access.getAccessibleVaultIds.mockResolvedValue([]);

      const result = await service.listForUser('user-1');
      for (const vault of result) {
        expect(vault).toHaveProperty('id');
        expect(vault).toHaveProperty('name');
        expect(vault).toHaveProperty('description');
        expect(vault).toHaveProperty('type');
        expect(vault).toHaveProperty('locked');
        if (vault.locked) {
          expect(vault.experienceLevels).toEqual([]);
        }
      }
    });

    it('marks all vaults as unlocked when user has access to all', async () => {
      prisma.vault.findMany.mockResolvedValue(baseVaults);
      access.getAccessibleVaultIds.mockResolvedValue(['v-1', 'v-2']);

      const result = await service.listForUser('user-1');
      expect(result.every((v: any) => v.locked === false)).toBe(true);
    });
  });

  describe('findOneForUser', () => {
    it('returns an unlocked vault with experience levels for an authorized user', async () => {
      prisma.vault.findFirst.mockResolvedValue(baseVaults[0]);
      access.getAccessibleVaultIds.mockResolvedValue(['v-1']);

      const result = await service.findOneForUser('v-1', 'user-1');
      expect(result).toEqual({
        id: 'v-1',
        name: 'India',
        description: 'India vault',
        type: 'INDIA',
        locked: false,
        experienceLevels: [{ id: 'el-1', name: 'Junior', minYears: 0, maxYears: 2 }],
      });
    });

    it('returns safe metadata (no experience levels) for an unauthorized user', async () => {
      prisma.vault.findFirst.mockResolvedValue(baseVaults[0]);
      access.getAccessibleVaultIds.mockResolvedValue([]);

      const result = await service.findOneForUser('v-1', 'user-1');
      expect(result).toEqual({
        id: 'v-1',
        name: 'India',
        description: 'India vault',
        type: 'INDIA',
        locked: true,
        experienceLevels: [],
      });
    });

    it('returns locked metadata for unauthenticated users', async () => {
      prisma.vault.findFirst.mockResolvedValue(baseVaults[1]);

      const result = await service.findOneForUser('v-2');
      expect(result.locked).toBe(true);
      expect(result.experienceLevels).toEqual([]);
    });

    it('throws NotFoundException when the vault does not exist', async () => {
      prisma.vault.findFirst.mockResolvedValue(null);

      await expect(service.findOneForUser('missing')).rejects.toThrow('Vault not found');
    });
  });
});
