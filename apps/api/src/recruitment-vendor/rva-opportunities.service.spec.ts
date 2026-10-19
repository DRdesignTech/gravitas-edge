import { Test } from '@nestjs/testing';
import { RvaOpportunitiesService } from './rva-opportunities.service';
import { RvaAccessService } from './rva-access.service';
import { PrismaService } from '../prisma/prisma.service';

const baseOpp = {
  id: 'opp-1',
  serialNo: 7,
  jobId: 'RVA-1',
  referenceId: null,
  title: 'RFP for staffing partner',
  role: 'Account Manager',
  sector: 'Staffing',
  category: 'RFP_EOI_RFQ',
  company: 'Acme',
  organization: 'Acme Pvt Ltd',
  budget: 'INR 10,00,000',
  salary: null,
  commercialValue: null,
  location: 'Dubai',
  geography: 'Middle East',
  country: 'UAE',
  experienceText: '5+ years',
  minExperience: 5,
  maxExperience: 15,
  eligibility: 'Registered staffing firm',
  qualification: 'Valid trade license',
  requirements: 'UAE labour law compliance',
  otherDetails: 'Deadline 30 Nov',
  description: 'Long description',
  howToApply: 'Email procurement@acme.com',
  applicationUrl: 'https://acme.com/apply',
  applicationContact: 'procurement@acme.com',
  source: 'client-portal',
  publishedDate: new Date('2026-10-01'),
  expiryDate: new Date('2026-12-01'),
  createdAt: new Date('2026-10-01'),
  status: 'PUBLISHED',
  createdBy: null,
  updatedAt: new Date(),
  deletedAt: null,
};

function mockPrisma() {
  return {
    recruitmentVendorOpportunity: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    user: { findUnique: jest.fn() },
    recruitmentVendorSubscription: { findMany: jest.fn() },
  } as any;
}

describe('RvaOpportunitiesService', () => {
  let service: RvaOpportunitiesService;
  let prisma: ReturnType<typeof mockPrisma>;
  let access: RvaAccessService;

  beforeEach(async () => {
    prisma = mockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RvaOpportunitiesService,
        RvaAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(RvaOpportunitiesService);
    access = moduleRef.get(RvaAccessService);
  });

  it('masks protected fields for a public visitor without access', async () => {
    prisma.recruitmentVendorOpportunity.findFirst.mockResolvedValue(baseOpp);
    jest
      .spyOn(access, 'requireAccess')
      .mockResolvedValue({ authorized: false, reason: 'UNAUTHENTICATED' });

    const dto = await service.findOneForUser('opp-1', undefined);

    expect(dto.isFullAccess).toBe(false);
    expect(dto.applicationContact).toBeUndefined();
    expect(dto.howToApply).toBeUndefined();
    expect(dto.otherDetails).toBeUndefined();
    expect(dto.qualification).toBeUndefined();
    expect(dto.lockedPreview).toBeDefined();
    expect(dto.lockedPreview?.applicationContact).not.toBe('procurement@acme.com');
    expect(dto.lockedPreview?.applicationContact).toMatch(/^p.*m$/);
  });

  it('exposes the first ten workbook columns (incl. requirements/eligibility) to public visitors', async () => {
    prisma.recruitmentVendorOpportunity.findFirst.mockResolvedValue(baseOpp);
    jest
      .spyOn(access, 'requireAccess')
      .mockResolvedValue({ authorized: false, reason: 'UNAUTHENTICATED' });

    const dto = await service.findOneForUser('opp-1', undefined);

    expect(dto.serialNo).toBe(7);
    expect(dto.jobId).toBe('RVA-1');
    expect(dto.title).toBe('RFP for staffing partner');
    expect(dto.organization).toBe('Acme Pvt Ltd');
    expect(dto.sector).toBe('Staffing');
    expect(dto.geography).toBe('Middle East');
    expect(dto.requirements).toBe('UAE labour law compliance');
    expect(dto.eligibility).toBe('Registered staffing firm');
    expect(dto.expiryDate).toEqual(new Date('2026-12-01'));
    // Field 8/9 never live inside the locked teaser.
    expect(JSON.stringify(dto.lockedPreview)).not.toContain('UAE labour law compliance');
    expect(JSON.stringify(dto.lockedPreview)).not.toContain('Registered staffing firm');
  });

  it('returns full protected fields when the caller has an active RVA entitlement', async () => {
    prisma.recruitmentVendorOpportunity.findFirst.mockResolvedValue(baseOpp);
    jest
      .spyOn(access, 'requireAccess')
      .mockResolvedValue({ authorized: true, subscriptionId: 'sub-1' });

    const dto = await service.findOneForUser('opp-1', 'user-1');

    expect(dto.isFullAccess).toBe(true);
    expect(dto.applicationContact).toBe('procurement@acme.com');
    expect(dto.otherDetails).toBe('Deadline 30 Nov');
    expect(dto.howToApply).toBe('Email procurement@acme.com');
    expect(dto.qualification).toBe('Valid trade license');
    expect(dto.requirements).toBe('UAE labour law compliance');
    expect(dto.eligibility).toBe('Registered staffing firm');
    expect(dto.lockedPreview).toBeUndefined();
  });

  it('never leaks protected values from the listing to unauthenticated callers', async () => {
    prisma.recruitmentVendorOpportunity.findMany.mockResolvedValue([baseOpp]);
    prisma.recruitmentVendorOpportunity.count.mockResolvedValue(1);
    jest
      .spyOn(access, 'requireAccess')
      .mockResolvedValue({ authorized: false, reason: 'UNAUTHENTICATED' });

    const result = await service.listForUser({ page: 1, limit: 20 });
    const item = result.items[0];
    expect(item.isFullAccess).toBe(false);
    expect(item.applicationContact).toBeUndefined();
    expect(JSON.stringify(item)).not.toContain('procurement@acme.com');
  });

  it('never returns protected fields from the listing even for an entitled RVA subscriber', async () => {
    prisma.recruitmentVendorOpportunity.findMany.mockResolvedValue([baseOpp]);
    prisma.recruitmentVendorOpportunity.count.mockResolvedValue(1);
    const requireAccess = jest
      .spyOn(access, 'requireAccess')
      .mockResolvedValue({ authorized: true, subscriptionId: 'sub-1' });

    const result = await service.listForUser({ page: 1, limit: 20 });
    const item = result.items[0];

    expect(item.isFullAccess).toBe(false);
    expect(item.applicationContact).toBeUndefined();
    expect(item.otherDetails).toBeUndefined();
    expect(item.howToApply).toBeUndefined();
    expect(item.qualification).toBeUndefined();
    expect(item.description).toBeUndefined();
    expect(item.applicationUrl).toBeUndefined();
    expect(item.source).toBeUndefined();
    expect(item.lockedPreview).toBeDefined();
    const serialized = JSON.stringify(item);
    expect(serialized).not.toContain('procurement@acme.com');
    expect(serialized).not.toContain('Deadline 30 Nov');
    expect(serialized).not.toContain('Email procurement@acme.com');
    expect(serialized).not.toContain('https://acme.com/apply');
    // The listing is a pure directory: no entitlement lookup happens at all.
    expect(requireAccess).not.toHaveBeenCalled();
    // The always-visible directory columns are still present.
    expect(item.jobId).toBe('RVA-1');
    expect(item.requirements).toBe('UAE labour law compliance');
    expect(item.eligibility).toBe('Registered staffing firm');
  });
});
