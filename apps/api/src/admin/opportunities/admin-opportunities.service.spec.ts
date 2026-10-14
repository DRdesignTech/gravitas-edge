import { readFileSync } from 'fs';
import { join } from 'path';
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { AdminOpportunitiesService } from './admin-opportunities.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

function mockPrismaService(): any {
  return {
    opportunity: {
      findMany: jest.fn().mockResolvedValue([]),
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
    vault: { findMany: jest.fn(), findFirst: jest.fn() },
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

    it('filters by vault', async () => {
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(0);
      await service.list({ page: 1, limit: 20, vaultId: 'vault-1' });
      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vaults: { some: { vaultId: 'vault-1' } },
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
    it('requires at least one vault assignment', async () => {
      await expect(
        service.create({ title: 'Dev', category: 'INDIA' } as any, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.opportunity.create).not.toHaveBeenCalled();
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
      prisma.vault.findMany.mockResolvedValue([{ id: 'v-1' }]);
      prisma.opportunity.create.mockImplementation(async (args: any) => {
        expect(args.data.publishedDate).toBeInstanceOf(Date);
        expect(args.data.status).toBe('PUBLISHED');
        return { id: 'opp-1', ...args.data, vaults: [], experienceLevels: [] };
      });

      await service.create(
        { title: 'Dev', category: 'INDIA', status: 'PUBLISHED', vaultIds: ['v-1'] } as any,
        'admin-1',
      );
    });

    it('persists a trimmed Job ID', async () => {
      prisma.vault.findMany.mockResolvedValue([{ id: 'v-1' }]);
      prisma.opportunity.create.mockImplementation(async (args: any) => {
        expect(args.data.jobId).toBe('JOB-2026-0001');
        return { id: 'opp-1', ...args.data, vaults: [], experienceLevels: [] };
      });

      await service.create(
        {
          title: 'Dev',
          category: 'INDIA',
          jobId: '  JOB-2026-0001  ',
          vaultIds: ['v-1'],
        } as any,
        'admin-1',
      );
      expect(prisma.opportunity.create).toHaveBeenCalled();
    });

    it('stores a blank Job ID as null', async () => {
      prisma.vault.findMany.mockResolvedValue([{ id: 'v-1' }]);
      prisma.opportunity.create.mockImplementation(async (args: any) => {
        expect(args.data.jobId).toBeNull();
        return { id: 'opp-1', ...args.data, vaults: [], experienceLevels: [] };
      });

      await service.create(
        { title: 'Dev', category: 'INDIA', jobId: '   ', vaultIds: ['v-1'] } as any,
        'admin-1',
      );
    });

    it('translates a Job ID unique violation into a friendly error', async () => {
      prisma.vault.findMany.mockResolvedValue([{ id: 'v-1' }]);
      prisma.opportunity.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['jobId'] },
        }),
      );

      await expect(
        service.create(
          { title: 'Dev', category: 'INDIA', jobId: 'JOB-1', vaultIds: ['v-1'] } as any,
          'admin-1',
        ),
      ).rejects.toThrow('Job ID already exists');
    });

    it('rethrows non-Job-ID create errors untouched', async () => {
      prisma.vault.findMany.mockResolvedValue([{ id: 'v-1' }]);
      const boom = new Error('db exploded');
      prisma.opportunity.create.mockRejectedValue(boom);

      await expect(
        service.create({ title: 'Dev', category: 'INDIA', vaultIds: ['v-1'] } as any, 'admin-1'),
      ).rejects.toThrow('db exploded');
    });

    it('never sends a serialNo on create (the database assigns it)', async () => {
      prisma.vault.findMany.mockResolvedValue([{ id: 'v-1' }]);
      prisma.opportunity.create.mockImplementation(async (args: any) => {
        expect(args.data.serialNo).toBeUndefined();
        return { id: 'opp-1', ...args.data, vaults: [], experienceLevels: [] };
      });

      await service.create(
        { title: 'Dev', category: 'INDIA', vaultIds: ['v-1'] } as any,
        'admin-1',
      );
      expect(prisma.opportunity.create).toHaveBeenCalled();
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

    it('publishes a draft in place: status only, no duplicate, data preserved', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({
        id: 'opp-draft',
        title: 'Draft Role',
        description: 'not yet public',
        company: 'Acme',
        status: 'DRAFT',
        publishedDate: null,
        category: 'INDIA',
      });
      prisma.opportunity.update.mockImplementation(async (args: any) => {
        // Publishing must only flip the status (+ backfill publishedDate); it
        // must not touch or wipe any existing field.
        expect(args.data).toEqual(
          expect.objectContaining({ status: 'PUBLISHED', publishedDate: expect.any(Date) }),
        );
        return { id: 'opp-draft', ...args.data, vaults: [], experienceLevels: [] };
      });

      await service.update('opp-draft', { status: 'PUBLISHED' }, 'admin-1');

      // Publish goes through update - never creates a new row (no duplicate).
      expect(prisma.opportunity.create).not.toHaveBeenCalled();
      // The title/company on the row are untouched.
      const updateArgs = prisma.opportunity.update.mock.calls[0][0];
      expect(updateArgs).toEqual(expect.objectContaining({ where: { id: 'opp-draft' } }));
      expect(updateArgs.data.title).toBeUndefined();
      expect(updateArgs.data.description).toBeUndefined();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'OPPORTUNITY_UPDATED', entityId: 'opp-draft' }),
      );
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

    it('updates the Job ID when provided', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1', publishedDate: null });
      prisma.opportunity.update.mockImplementation(async (args: any) => {
        expect(args.data.jobId).toBe('JOB-42');
        return { id: 'opp-1', ...args.data, vaults: [], experienceLevels: [] };
      });

      await service.update('opp-1', { jobId: ' JOB-42 ' } as any, 'admin-1');
    });

    it('clears the Job ID when set to blank', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1', publishedDate: null });
      prisma.opportunity.update.mockImplementation(async (args: any) => {
        expect(args.data.jobId).toBeNull();
        return { id: 'opp-1', ...args.data, vaults: [], experienceLevels: [] };
      });

      await service.update('opp-1', { jobId: '' } as any, 'admin-1');
    });

    it('leaves the Job ID untouched when omitted', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1', publishedDate: null });
      prisma.opportunity.update.mockImplementation(async (args: any) => {
        expect('jobId' in args.data).toBe(false);
        return { id: 'opp-1', ...args.data, vaults: [], experienceLevels: [] };
      });

      await service.update('opp-1', { title: 'New' }, 'admin-1');
    });

    it('translates a Job ID unique violation on update into a friendly error', async () => {
      prisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1', publishedDate: null });
      prisma.opportunity.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: 'Opportunity_jobId_key' },
        }),
      );

      await expect(service.update('opp-1', { jobId: 'JOB-1' } as any, 'admin-1')).rejects.toThrow(
        'Job ID already exists',
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

  describe('import & preview', () => {
    const csvFile = (content: string) =>
      ({
        originalname: 'jobs.csv',
        buffer: Buffer.from(content),
        size: content.length,
      }) as Express.Multer.File;

    const xlsxFile = (
      sheets: Array<{ name: string; rows: (string | null)[][] }>,
      originalname = 'jobs.xlsx',
    ): Express.Multer.File => {
      const workbook = XLSX.utils.book_new();
      for (const sheet of sheets) {
        const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
        XLSX.utils.book_append_sheet(workbook, ws, sheet.name);
      }
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      return { originalname, buffer, size: buffer.length } as Express.Multer.File;
    };

    const canonicalVaults = [
      { id: 'remote', name: 'Remote Access Vault', type: 'INTERNATIONAL' },
      { id: 'uae', name: 'UAE & Global Access Vault', type: 'MIDDLE_EAST' },
      { id: 'executive', name: 'Executive Access Vault', type: 'INDIA' },
      { id: 'leadership', name: 'Leadership Access Vault', type: 'INDIA' },
      { id: 'management', name: 'Management Access Vault', type: 'INDIA' },
      { id: 'early', name: 'Early Career Access Vault', type: 'INDIA' },
    ];

    beforeEach(() => {
      prisma.vault.findFirst.mockResolvedValue(canonicalVaults[0]);
      prisma.vault.findMany.mockResolvedValue(canonicalVaults);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.opportunity.create.mockResolvedValue({ id: 'opp-imported', title: 'Imported' });
    });

    it('rejects a nonexistent vault', async () => {
      prisma.vault.findFirst.mockResolvedValue(null);
      await expect(
        service.previewImport(csvFile('Title\nDev'), 'bad-vault', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('previews rows as VALID without persisting anything', async () => {
      prisma.vault.findFirst.mockResolvedValue({
        id: 'vault-uae',
        name: 'UAE & GCC Access',
        type: 'MIDDLE_EAST',
      });
      const file = csvFile(
        'Title,Salary,Experience,Location\nSenior DevOps,Up to AED 7000 monthly,5+ years,Dubai',
      );
      const result = await service.previewImport(file, 'vault-uae', 'admin-1');

      expect(result.sourceType).toBe('csv');
      expect(result.selectedVault.id).toBe('vault-uae');
      const sheet = result.sheets[0];
      expect(sheet.sheetName).toBe('(CSV file)');
      expect(sheet.summary.valid).toBe(1);
      expect(sheet.rows[0].classification).toBe('VALID');
      expect(sheet.rows[0].fields?.salary).toBe('Up to AED 7000 monthly');
      expect(sheet.rows[0].fields?.experienceText).toBe('5+ years');
      expect(sheet.rows[0].fields?.minExperience).toBe(5);
      expect(sheet.rows[0].fields?.category).toBe('MIDDLE_EAST');
      expect(sheet.rows[0].fields?.status).toBe('PUBLISHED');
      expect(prisma.opportunity.create).not.toHaveBeenCalled();
    });

    it('classifies duplicates against existing rows in the selected vault', async () => {
      prisma.opportunity.findMany.mockResolvedValue([
        { title: 'Duplicate Dev', externalRef: null },
      ]);
      const file = csvFile('Title\nDuplicate Dev\nFresh Role');
      const result = await service.previewImport(file, 'vault-uae', 'admin-1');

      const dup = result.sheets[0].rows.find((r) => r.title === 'Duplicate Dev');
      expect(dup?.classification).toBe('DUPLICATE');
      expect(dup?.reason).toBe('Duplicate job already exists in vault');
      expect(result.sheets[0].summary.duplicate).toBe(1);
    });

    it('flags repeated titles within the same file', async () => {
      const file = csvFile('Title\nRepeat Role\nRepeat Role');
      const result = await service.previewImport(file, 'vault-uae', 'admin-1');

      const matches = result.sheets[0].rows.filter((r) => r.title === 'Repeat Role');
      expect(matches[0].classification).toBe('VALID');
      expect(matches[1].classification).toBe('DUPLICATE');
      expect(matches[1].reason).toBe('Duplicate job within import file');
    });

    it('surfaces the parsed Job ID in the preview payload', async () => {
      const file = csvFile('Title,Job ID\nRole A,JOB-2026-0001');
      const result = await service.previewImport(file, 'vault-uae', 'admin-1');

      expect(result.sheets[0].rows[0].classification).toBe('VALID');
      expect(result.sheets[0].rows[0].fields?.jobId).toBe('JOB-2026-0001');
    });

    it('ignores the file\'s "S. No." column (serial numbers are auto-assigned)', async () => {
      const file = csvFile('S. No.,Title,Location\n37,Role A,Dubai');
      const result = await service.previewImport(file, 'vault-uae', 'admin-1');

      const row = result.sheets[0].rows[0];
      expect(row.classification).toBe('VALID');
      expect(row.fields?.externalRef).toBeUndefined();
      expect(row.fields?.serialNo).toBeUndefined();
    });

    it('flags a Job ID that already exists globally as DUPLICATE', async () => {
      // collectExistingJobIds() reads every stored Job ID across all vaults.
      prisma.opportunity.findMany.mockResolvedValue([{ jobId: 'JOB-2026-0001' }]);
      const file = csvFile('Title,Job ID\nRole A,JOB-2026-0001');
      const result = await service.previewImport(file, 'vault-uae', 'admin-1');

      const row = result.sheets[0].rows[0];
      expect(row.classification).toBe('DUPLICATE');
      expect(row.reason).toBe('Job ID already exists');
      expect(result.sheets[0].summary.valid).toBe(0);
    });

    it('flags a Job ID repeated within the same import file', async () => {
      const file = csvFile('Title,Job ID\nRole A,JOB-7\nRole B,JOB-7');
      const result = await service.previewImport(file, 'vault-uae', 'admin-1');

      const rows = result.sheets[0].rows;
      expect(rows[0].classification).toBe('VALID');
      expect(rows[1].classification).toBe('DUPLICATE');
      expect(rows[1].reason).toBe('Duplicate Job ID within import file');
    });

    it('does not let a rejected row consume its Job ID for later valid rows', async () => {
      // First row carries an unparseable date (INVALID); the second carries the
      // same Job ID and must still import cleanly because the invalid row
      // reserves nothing.
      const file = csvFile(
        'Title,Job ID,Date\nBad Role,JOB-9,not-a-date\nReal Role,JOB-9,2026-01-01',
      );
      const result = await service.previewImport(file, 'vault-uae', 'admin-1');

      const rows = result.sheets[0].rows;
      expect(rows[0].classification).toBe('INVALID');
      expect(rows[1].classification).toBe('VALID');
      expect(rows[1].fields?.jobId).toBe('JOB-9');
    });

    const engineerExistingJob = {
      title: 'Software Engineer',
      company: 'Acme Corp',
      location: 'Dubai',
      country: 'UAE',
      salary: 'AED 20000 monthly',
      experienceText: '5+ years',
      minExperience: 5,
      maxExperience: null,
      industry: 'IT',
      functionalArea: 'Engineering',
      employmentType: 'FULL_TIME',
      qualification: 'B.Tech',
      description: 'Build and maintain APIs',
      applicationUrl: 'https://acme.test/apply',
      applicationContact: 'hr@acme.test',
      externalRef: '101',
      status: 'PUBLISHED',
    };

    const engineerCsvHeader =
      'Title,Company,Location,Country,Salary,Experience,Industry,Functional Area,Employment Type,Qualification,Other Details,How to Apply,How to Apply Email,S. No.';

    it('marks a completely identical job as DUPLICATE even with formatting differences', async () => {
      prisma.opportunity.findMany.mockResolvedValue([{ ...engineerExistingJob }]);
      const file = csvFile(
        engineerCsvHeader +
          '\nsoftware   ENGINEER,Acme  Corp.,dubai,UAE,AED 20000 monthly,5 years,it,engineering,Full Time,b.tech,BUILD AND MAINTAIN APIs,https://acme.test/apply,hr@acme.test,101',
      );

      const result = await service.previewImport(file, 'vault-uae', 'admin-1');

      const row = result.sheets[0].rows[0];
      expect(row.classification).toBe('DUPLICATE');
      expect(row.reason).toBe('Duplicate job already exists in vault');
      expect(result.sheets[0].summary.duplicate).toBe(1);
      expect(result.sheets[0].summary.valid).toBe(0);
    });

    it('does not mark a job duplicate when only the title matches but the company differs', async () => {
      prisma.opportunity.findMany.mockResolvedValue([{ ...engineerExistingJob }]);
      const file = csvFile('Title,Company,Location\nSoftware Engineer,Globex,Dubai');

      const result = await service.previewImport(file, 'vault-uae', 'admin-1');

      expect(result.sheets[0].rows[0].classification).toBe('VALID');
      expect(result.sheets[0].summary.duplicate).toBe(0);
      expect(result.sheets[0].summary.valid).toBe(1);
    });

    it('does not mark a job duplicate when title and company match but the location differs', async () => {
      prisma.opportunity.findMany.mockResolvedValue([{ ...engineerExistingJob }]);
      const file = csvFile('Title,Company,Location\nSoftware Engineer,Acme Corp,Tokyo');

      const result = await service.previewImport(file, 'vault-uae', 'admin-1');

      expect(result.sheets[0].rows[0].classification).toBe('VALID');
      expect(result.sheets[0].summary.duplicate).toBe(0);
    });

    it('does not mark a job duplicate when salary, experience or other details differ', async () => {
      prisma.opportunity.findMany.mockResolvedValue([{ ...engineerExistingJob }]);
      const file = csvFile(
        'Title,Company,Location,Salary,Experience,Other Details\n' +
          'Software Engineer,Acme Corp,Dubai,AED 30000 monthly,5+ years,Build and maintain APIs\n' +
          'Software Engineer,Acme Corp,Dubai,AED 20000 monthly,8+ years,Build and maintain APIs\n' +
          'Software Engineer,Acme Corp,Dubai,AED 20000 monthly,5+ years,Operate the data platform\n',
      );

      const result = await service.previewImport(file, 'vault-uae', 'admin-1');

      expect(result.sheets[0].summary.valid).toBe(3);
      expect(result.sheets[0].summary.duplicate).toBe(0);
      for (const row of result.sheets[0].rows) {
        expect(row.classification).toBe('VALID');
      }
    });

    it('does not mark different jobs with similar titles as duplicates', async () => {
      prisma.opportunity.findMany.mockResolvedValue([{ ...engineerExistingJob }]);
      const file = csvFile('Title,Company,Location\nSenior Software Engineer,Acme Corp,Dubai');

      const result = await service.previewImport(file, 'vault-uae', 'admin-1');

      expect(result.sheets[0].rows[0].classification).toBe('VALID');
      expect(result.sheets[0].summary.duplicate).toBe(0);
    });

    it('marks the exact same job imported twice within the file as DUPLICATE', async () => {
      const row =
        'Software Engineer,Acme Corp,Dubai,AED 20000 monthly,5+ years,Build and maintain APIs,101';
      const file = csvFile(
        'Title,Company,Location,Salary,Experience,Other Details,S. No.\n' + row + '\n' + row,
      );

      const result = await service.previewImport(file, 'vault-uae', 'admin-1');

      expect(result.sheets[0].rows[0].classification).toBe('VALID');
      expect(result.sheets[0].rows[1].classification).toBe('DUPLICATE');
      expect(result.sheets[0].rows[1].reason).toBe('Duplicate job within import file');
      expect(result.sheets[0].summary.duplicate).toBe(1);
      expect(result.sheets[0].summary.valid).toBe(1);
    });

    it('applies the same duplicate logic during import: only the matching row fails', async () => {
      // Route writes through this same mock so create() calls are observable.
      prisma.$transaction = jest.fn(async (cbOrFns: any) =>
        typeof cbOrFns === 'function' ? cbOrFns(prisma as any) : [],
      );
      prisma.opportunity.findMany.mockResolvedValue([{ ...engineerExistingJob }]);
      prisma.opportunity.create.mockResolvedValue({ id: 'opp-new', title: 'Data Scientist' });
      const file = csvFile(
        'Title,Company,Location,Salary,Experience,Other Details,S. No.\n' +
          'Software Engineer,Acme Corp,Dubai,AED 20000 monthly,5+ years,Build and maintain APIs,101\n' +
          'Data Scientist,Globex,Remote,AED 25000 monthly,3+ years,Build ML pipelines,102',
      );

      const result = await service.import(file, 'vault-uae', 'admin-1');

      expect(result.imported).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toEqual([
        expect.objectContaining({
          row: 2,
          title: 'Software Engineer',
          error: 'Duplicate job already exists in vault',
        }),
      ]);
      expect(prisma.opportunity.create).toHaveBeenCalledTimes(1);
    });

    it('does not let archived or expired jobs block a genuinely new posting', async () => {
      prisma.opportunity.findMany.mockResolvedValue([
        { title: 'Software Engineer', status: 'ARCHIVED' },
        { title: 'Data Analyst', status: 'EXPIRED' },
      ]);
      const file = csvFile('Title,Location\nSoftware Engineer,Dubai\nData Analyst,Dubai');

      const result = await service.previewImport(file, 'vault-uae', 'admin-1');

      expect(result.sheets[0].summary.valid).toBe(2);
      expect(result.sheets[0].summary.duplicate).toBe(0);
      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { notIn: ['ARCHIVED', 'EXPIRED'] } }),
        }),
      );
    });

    it('marks rows missing a title as INVALID and ignores empty rows', async () => {
      const file = csvFile('Title,Salary\nAlpha,100\n,Beta\n,');
      const result = await service.previewImport(file, 'vault-uae', 'admin-1');

      const invalid = result.sheets[0].rows.find((r) => r.classification === 'INVALID');
      const skipped = result.sheets[0].rows.find((r) => r.classification === 'SKIPPED');
      expect(invalid?.reason).toBe('Missing required field: title');
      expect(skipped).toBeUndefined();
      expect(result.sheets[0].summary.invalid).toBe(1);
      expect(result.sheets[0].summary.skipped).toBe(0);
    });

    it('imports valid rows into the vault and ignores empty rows', async () => {
      const file = csvFile('Title\nGood Job\n,');
      const result = await service.import(file, 'vault-uae', 'admin-1');

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'OPPORTUNITY_IMPORT', entityType: 'Opportunity' }),
      );
    });

    it('saves imported rows as DRAFT when defaultStatus is DRAFT', async () => {
      // Route the import transaction through this same mock so the writes are
      // observable (the default mock hands transactions a throwaway client).
      prisma.$transaction = jest.fn(async (cbOrFns: any) =>
        typeof cbOrFns === 'function' ? cbOrFns(prisma as any) : [],
      );
      const created: any[] = [];
      prisma.opportunity.create.mockImplementation(async (args: any) => {
        created.push(args.data);
        return { id: 'opp-imported', ...args.data };
      });

      const file = csvFile(
        'Title,Salary,Location\nImported Draft,1000,Dubai\nSecond Draft,2000,Remote',
      );
      const result = await service.import(file, 'remote', 'admin-1', undefined, 'DRAFT');

      expect(result.imported).toBe(2);
      expect(created).toHaveLength(2);
      for (const data of created) {
        expect(data.status).toBe('DRAFT');
        // A draft is not yet public: it must not carry a publishedDate so the
        // normal PUBLISHED filter keeps it off the public site until published.
        expect(data.publishedDate).toBeNull();
      }
    });

    it('truncates to latest 500 rows when file exceeds import limit', async () => {
      const header = 'Title\n';
      const fill = Array.from({ length: 501 }, (_, i) => `Job ${i}`).join('\n');
      const result = await service.previewImport(csvFile(header + fill), 'vault-uae', 'admin-1');
      expect(result.sheets[0].summary.total).toBe(500);
    });

    it('single-sheet workbooks import into the selected destination vault regardless of name', async () => {
      const file = xlsxFile([
        {
          name: 'Whatever',
          rows: [
            ['Role', 'Salary', 'Location', 'Experience'],
            ['Remote Role', '1000', 'Remote', '5+ years'],
          ],
        },
      ]);
      const result = await service.previewImport(file, 'remote', 'admin-1');
      expect(result.sourceType).toBe('xlsx');
      expect(result.sheets).toHaveLength(1);
      const sheet = result.sheets[0];
      expect(sheet.matchStatus).toBe('matched');
      expect(sheet.vault?.id).toBe('remote');
      expect(sheet.summary.valid).toBe(1);
    });

    it('maps each keyword-named sheet of "For Sparsh (1).xlsx" to the matching vault', async () => {
      const file = {
        originalname: 'For Sparsh (1).xlsx',
        buffer: readFileSync(join(__dirname, '../../../test/fixtures/For Sparsh (1).xlsx')),
        size: 0,
      } as Express.Multer.File;

      const result = await service.previewImport(file, 'remote', 'admin-1');

      expect(result.sourceType).toBe('xlsx');
      expect(result.sheets).toHaveLength(7);
      expect(result.matchedSheets.map((s) => s.vaultName)).toEqual([
        'Remote Access Vault',
        'UAE & Global Access Vault',
        'Executive Access Vault',
        'Leadership Access Vault',
        'Management Access Vault',
        'Early Career Access Vault',
      ]);

      const bySheet = Object.fromEntries(result.sheets.map((s) => [s.sheetName, s]));

      expect(bySheet['Vaults & Prices']?.matchStatus).toBe('meta');
      expect(bySheet['Vaults & Prices']?.reason).toContain('does not contain job data');
      expect(result.unmatchedSheets.map((s) => s.sheetName)).toContain('Vaults & Prices');

      expect(bySheet['Remote Access']?.vault?.id).toBe('remote');
      expect(bySheet['UAE & Global']?.vault?.id).toBe('uae');
      expect(bySheet['Executive']?.vault?.id).toBe('executive');
      expect(bySheet['Leadership']?.vault?.id).toBe('leadership');
      expect(bySheet['Management']?.vault?.id).toBe('management');
      expect(bySheet['Early Career']?.vault?.id).toBe('early');

      expect(bySheet['Remote Access']?.summary.valid).toBe(74);
      expect(bySheet['Executive']?.summary.valid).toBe(143);
      // "S. No." is no longer a content field, so rows that differ only by their
      // spreadsheet serial now collapse into duplicates.
      expect(bySheet['Management']?.summary.valid).toBe(224);
      expect(bySheet['UAE & Global']?.summary.valid).toBe(176);
    });

    it('skips a job sheet with no matching vault and keeps processing the rest', async () => {
      const file = xlsxFile([
        {
          name: 'Executive',
          rows: [
            ['Role', 'Salary', 'Location', 'Experience'],
            ['CXO Role', '5000', 'Dubai', '10+ years'],
          ],
        },
        {
          name: 'Sales',
          rows: [
            ['Role', 'Salary', 'Location', 'Experience'],
            ['Account Executive', '3000', 'Remote', '3+ years'],
          ],
        },
      ]);

      const result = await service.previewImport(file, 'executive', 'admin-1');

      expect(result.sheets).toHaveLength(2);
      const sales = result.sheets.find((s) => s.sheetName === 'Sales');
      expect(sales?.status).toBe('SKIPPED');
      expect(sales?.matchStatus).toBe('unmatched');
      expect(sales?.reason).toContain('Could not find a matching vault for sheet "Sales"');
      expect(result.unmatchedSheets.find((s) => s.sheetName === 'Sales')?.reason).toContain(
        'No opportunity data from this sheet will be imported',
      );

      const executive = result.sheets.find((s) => s.sheetName === 'Executive');
      expect(executive?.summary.valid).toBe(1);
      expect(result.matchedSheets.map((s) => s.sheetName)).toContain('Executive');
    });

    it('reports ambiguous matches instead of guessing', async () => {
      prisma.vault.findMany.mockResolvedValue([
        { id: 'erp', name: 'Executive ERP Vault', type: 'INDIA' },
        { id: 'crm', name: 'Executive CRM Vault', type: 'INDIA' },
      ]);
      prisma.vault.findFirst.mockResolvedValue({
        id: 'erp',
        name: 'Executive ERP Vault',
        type: 'INDIA',
      });

      const file = xlsxFile([
        {
          name: 'Executive',
          rows: [
            ['Role', 'Salary', 'Location', 'Experience'],
            ['ERP Lead', '4000', 'Remote', '8+ years'],
          ],
        },
        {
          name: 'Sales',
          rows: [
            ['Role', 'Salary', 'Location', 'Experience'],
            ['Account Executive', '3000', 'Remote', '3+ years'],
          ],
        },
      ]);

      const result = await service.previewImport(file, 'erp', 'admin-1');
      const executive = result.sheets.find((s) => s.sheetName === 'Executive');
      expect(executive?.status).toBe('SKIPPED');
      expect(executive?.matchStatus).toBe('ambiguous');
      expect(executive?.reason).toContain('matches multiple vaults');
    });

    it('throws a descriptive error when nothing in the workbook can be imported', async () => {
      const file = xlsxFile([
        {
          name: 'Sales',
          rows: [
            ['Role', 'Salary', 'Location', 'Experience'],
            ['Account Executive', '3000', 'Remote', '3+ years'],
          ],
        },
        {
          name: 'Finance',
          rows: [
            ['Role', 'Salary', 'Location', 'Experience'],
            ['CFO', '8000', 'Remote', '12+ years'],
          ],
        },
      ]);

      await expect(service.import(file, 'vault-uae', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.import(file, 'vault-uae', 'admin-1')).rejects.toThrow(
        /Could not find a matching vault for sheet "Sales"/,
      );
    });

    it('skips an unmatched sheet even when it is included in the selections', async () => {
      const file = xlsxFile([
        {
          name: 'Executive',
          rows: [
            ['Role', 'Salary', 'Location', 'Experience'],
            ['CXO Role', '5000', 'Dubai', '10+ years'],
          ],
        },
        {
          name: 'Sales',
          rows: [
            ['Role', 'Salary', 'Location', 'Experience'],
            ['Account Executive', '3000', 'Remote', '3+ years'],
          ],
        },
      ]);

      const result = await service.import(file, 'executive', 'admin-1', undefined, 'PUBLISHED', [
        { sheetName: 'Sales', include: true },
      ]);

      expect(result.imported).toBe(1);
      expect(result.sheets).toEqual(
        expect.arrayContaining([expect.objectContaining({ sheetName: 'Executive', imported: 1 })]),
      );
      expect(result.sheets.find((s) => s.sheetName === 'Sales')).toBeUndefined();
    });

    it('skips a matched sheet the admin excludes', async () => {
      const file = xlsxFile([
        {
          name: 'Executive',
          rows: [
            ['Role', 'Salary', 'Location', 'Experience'],
            ['CXO Role', '5000', 'Dubai', '10+ years'],
          ],
        },
        {
          name: 'Leadership',
          rows: [
            ['Role', 'Salary', 'Location', 'Experience'],
            ['Director Role', '6000', 'Remote', '8+ years'],
          ],
        },
      ]);

      const result = await service.import(file, 'executive', 'admin-1', undefined, 'PUBLISHED', [
        { sheetName: 'Executive', include: false },
      ]);

      expect(result.imported).toBe(1);
      const executive = result.sheets.find((s) => s.sheetName === 'Executive');
      expect(executive).toBeUndefined();
      const leadership = result.sheets.find((s) => s.sheetName === 'Leadership');
      expect(leadership?.imported).toBe(1);
    });

    it('imports every matched sheet into its own vault when no selections are given', async () => {
      const file = xlsxFile([
        {
          name: 'Executive',
          rows: [
            ['Role', 'Salary', 'Location', 'Experience'],
            ['CXO Role', '5000', 'Dubai', '10+ years'],
          ],
        },
        {
          name: 'Management',
          rows: [
            ['Role', 'Salary', 'Location', 'Experience'],
            ['Manager Role', '4000', 'Remote', '5+ years'],
          ],
        },
      ]);

      const result = await service.import(file, 'executive', 'admin-1');

      expect(result.imported).toBe(2);
      expect(result.sheets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ sheetName: 'Executive', vaultName: 'Executive Access Vault' }),
          expect.objectContaining({
            sheetName: 'Management',
            vaultName: 'Management Access Vault',
          }),
        ]),
      );
    });

    it('rejects selections referencing unknown sheets', async () => {
      const file = csvFile('Title\nDev');
      await expect(
        service.import(file, 'vault-uae', 'admin-1', undefined, 'PUBLISHED', [
          { sheetName: 'Nope', include: false },
        ]),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
