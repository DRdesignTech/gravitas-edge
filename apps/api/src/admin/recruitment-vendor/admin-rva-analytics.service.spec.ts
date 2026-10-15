import { Test } from '@nestjs/testing';
import { AdminRvaAnalyticsService } from './admin-rva-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DateRange } from '../analytics/dto/analytics-query.dto';

function mockPrisma(): any {
  return {
    recruitmentVendorOpportunity: {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    recruitmentVendorPlan: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    recruitmentVendorSubscription: {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    recruitmentVendorEnrollment: { count: jest.fn().mockResolvedValue(0) },
    payment: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 }, _count: { _all: 0 } }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe('AdminRvaAnalyticsService', () => {
  let service: AdminRvaAnalyticsService;
  let prisma: ReturnType<typeof mockPrisma>;

  beforeEach(async () => {
    prisma = mockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [AdminRvaAnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AdminRvaAnalyticsService);
  });

  it('only aggregates RVA-scoped payments (never generic Opportunity Vault revenue)', async () => {
    await service.overview({ range: DateRange.THIRTY_DAYS });
    const calls = prisma.payment.aggregate.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    for (const [args] of calls) {
      expect(args.where.recruitmentVendorSubscriptionId).toEqual({ not: null });
    }
  });

  it('revenue timeline only reads RVA payments', async () => {
    await service.revenue({ range: DateRange.SEVEN_DAYS });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ recruitmentVendorSubscriptionId: { not: null } }),
      }),
    );
  });

  it('overview reports RVA counts exclusively from RecruitmentVendor tables', async () => {
    const result = await service.overview({ range: DateRange.THIRTY_DAYS });
    expect(result.vault).toBe('recruitment-vendor-access');
    expect(prisma.recruitmentVendorOpportunity.count).toHaveBeenCalled();
    expect(prisma.recruitmentVendorSubscription.count).toHaveBeenCalled();
  });
});
