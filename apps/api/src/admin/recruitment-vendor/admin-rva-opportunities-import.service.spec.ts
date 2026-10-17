import { Test } from '@nestjs/testing';
import * as XLSX from 'xlsx';
import { AdminRvaOpportunitiesService } from './admin-rva-opportunities.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

function xlsxFile(rows: unknown[][]): Express.Multer.File {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Jobs');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  return { buffer, originalname: 'jobs.xlsx' } as unknown as Express.Multer.File;
}

function mockPrisma(existingJobIds: string[] = []) {
  return {
    recruitmentVendorOpportunity: {
      findMany: jest.fn(async ({ select }: { select?: Record<string, boolean> }) => {
        if (select && 'jobId' in select) return existingJobIds.map((jobId) => ({ jobId }));
        return [];
      }),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'new-id',
        ...data,
      })),
    },
  } as any;
}

describe('AdminRvaOpportunitiesService import', () => {
  let service: AdminRvaOpportunitiesService;

  const build = async (prisma: ReturnType<typeof mockPrisma>) => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminRvaOpportunitiesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();
    return moduleRef.get(AdminRvaOpportunitiesService);
  };

  describe('previewImport', () => {
    it('flags an existing Job ID and an in-file duplicate Job ID', async () => {
      const prisma = mockPrisma(['RVA-1']);
      service = await build(prisma);

      const file = xlsxFile([
        ['Title', 'Company', 'Job ID'],
        ['RFP A', 'Acme', 'RVA-1'],
        ['RFP B', 'Beta', 'RVA-2'],
        ['RFP C', 'Gamma', 'RVA-2'],
      ]);

      const preview = await service.previewImport(file, 'RFP_EOI_RFQ', 'admin-1', 'PUBLISHED');

      expect(preview.selectedCategory).toBe('RFP_EOI_RFQ');
      expect(preview.summary.total).toBe(3);
      expect(preview.summary.valid).toBe(1);
      expect(preview.summary.duplicate).toBe(2);

      const rows = preview.sheets[0].rows;
      expect(rows[0].classification).toBe('DUPLICATE');
      expect(rows[0].reason).toContain('already exists');
      expect(rows[1].classification).toBe('VALID');
      expect(rows[2].classification).toBe('DUPLICATE');
      expect(rows[2].reason).toContain('within import file');
    });

    it('marks a row without a title as invalid', async () => {
      const prisma = mockPrisma();
      service = await build(prisma);

      const file = xlsxFile([
        ['Title', 'Company'],
        ['', 'Acme'],
      ]);

      const preview = await service.previewImport(file, 'STAFFING_RPO', 'admin-1', 'PUBLISHED');
      expect(preview.summary.invalid).toBe(1);
      expect(preview.sheets[0].rows[0].reason).toContain('title');
    });

    it('lets a row category override the selected default', async () => {
      const prisma = mockPrisma();
      service = await build(prisma);

      const file = xlsxFile([
        ['Title', 'Company', 'Category'],
        ['Exec search', 'Acme', 'Executive Search'],
      ]);

      const preview = await service.previewImport(file, 'RFP_EOI_RFQ', 'admin-1', 'PUBLISHED');
      expect(preview.sheets[0].category).toBe('RFP_EOI_RFQ');
      expect(preview.sheets[0].rows[0].fields?.category).toBe('EXECUTIVE_SEARCH');
    });
  });

  describe('import', () => {
    it('creates valid rows and reports counts', async () => {
      const prisma = mockPrisma();
      service = await build(prisma);

      const file = xlsxFile([
        ['Title', 'Company', 'Job ID', 'Status'],
        ['A', 'Acme', 'RVA-100', ''],
        ['B', 'Beta', 'RVA-101', ''],
      ]);

      const result = await service.import(file, 'OTHER', 'admin-1', undefined, 'PUBLISHED');

      expect(result.imported).toBe(2);
      expect(result.failed).toBe(0);
      expect(prisma.recruitmentVendorOpportunity.create).toHaveBeenCalledTimes(2);
      const firstCall = prisma.recruitmentVendorOpportunity.create.mock.calls[0][0];
      expect(firstCall.data).toMatchObject({
        title: 'A',
        status: 'PUBLISHED',
        createdBy: 'admin-1',
      });
    });

    it('imports the canonical workbook without a Title column and a Not mentioned deadline', async () => {
      const prisma = mockPrisma();
      service = await build(prisma);

      const file = xlsxFile([
        [
          'S. No.',
          'Job ID',
          'Date',
          'Opportunity Type',
          'Organisation',
          'Industry',
          'Geography',
          'Vendor Requirement / Scope',
          'Eligibility / Vendor Criteria',
          'Deadline',
          'Contact Person',
          'Other Details',
          'How to Apply',
        ],
        [
          1,
          'RVA-500',
          '2026-01-05',
          'Recruitment and Staffing Partner Requirement',
          'Acme Corp',
          'Banking',
          'Dubai',
          'Supply 20 engineers',
          '5+ years, valid license',
          'Not mentioned',
          'hr@acme.com',
          'Ref 42',
          'Email your profile to hr@acme.com',
        ],
      ]);

      const result = await service.import(file, 'STAFFING_RPO', 'admin-1', undefined, 'PUBLISHED');
      expect(result.imported).toBe(1);
      expect(result.failed).toBe(0);

      const data = prisma.recruitmentVendorOpportunity.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        serialNo: 1,
        jobId: 'RVA-500',
        title: 'Recruitment and Staffing Partner Requirement',
        organization: 'Acme Corp',
        sector: 'Banking',
        geography: 'Dubai',
        requirements: 'Supply 20 engineers',
        eligibility: '5+ years, valid license',
        applicationContact: 'hr@acme.com',
        otherDetails: 'Ref 42',
        howToApply: 'Email your profile to hr@acme.com',
      });
      // "Not mentioned" must not be parsed into a bogus date.
      expect(data.expiryDate).toBeNull();
    });

    it('accepts an open-ended Deadline ("Immediate / Ongoing") without flagging it invalid', async () => {
      const prisma = mockPrisma();
      service = await build(prisma);

      const file = xlsxFile([
        [
          'S. No.',
          'Job ID',
          'Date',
          'Opportunity Type',
          'Organisation',
          'Industry',
          'Geography',
          'Vendor Requirement / Scope',
          'Eligibility / Vendor Criteria',
          'Deadline',
          'Contact Person',
          'Other Details',
          'How to Apply',
        ],
        [
          2,
          'RVA-501',
          '2026-01-05',
          'Recruitment and Staffing Partner Requirement',
          'Acme Corp',
          'Banking',
          'Dubai',
          'Supply 20 engineers',
          '5+ years, valid license',
          'Immediate / Ongoing',
          'hr@acme.com',
          'Ref 42',
          'Email your profile to hr@acme.com',
        ],
      ]);

      const result = await service.import(file, 'STAFFING_RPO', 'admin-1', undefined, 'PUBLISHED');
      expect(result.imported).toBe(1);
      expect(result.failed).toBe(0);

      const data = prisma.recruitmentVendorOpportunity.create.mock.calls[0][0].data;
      expect(data.expiryDate).toBeNull();
      expect(data.jobId).toBe('RVA-501');
    });
  });
});
