import { Test } from '@nestjs/testing';
import { RvaAccessService } from './rva-access.service';
import { PrismaService } from '../prisma/prisma.service';

function mockPrisma() {
  return {
    recruitmentVendorSubscription: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  } as any;
}

describe('RvaAccessService', () => {
  let service: RvaAccessService;
  let prisma: ReturnType<typeof mockPrisma>;

  beforeEach(async () => {
    prisma = mockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [RvaAccessService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(RvaAccessService);
  });

  describe('effectiveStatus', () => {
    it('returns stored status when not ACTIVE', () => {
      expect(
        service.effectiveStatus({
          status: 'EXPIRED',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2099-01-01'),
        }),
      ).toBe('EXPIRED');
    });

    it('returns PENDING when start date is in the future', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      expect(
        service.effectiveStatus({ status: 'ACTIVE', startDate: future, endDate: future }),
      ).toBe('PENDING');
    });

    it('returns EXPIRED when end date has passed', () => {
      expect(
        service.effectiveStatus({
          status: 'ACTIVE',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-12-31'),
        }),
      ).toBe('EXPIRED');
    });

    it('returns ACTIVE within the valid window', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      expect(service.effectiveStatus({ status: 'ACTIVE', startDate: past, endDate: future })).toBe(
        'ACTIVE',
      );
    });
  });

  describe('getActiveSubscriptions', () => {
    it('only queries RecruitmentVendorSubscription (never the generic Subscription)', async () => {
      prisma.recruitmentVendorSubscription.findMany.mockResolvedValue([]);
      await service.getActiveSubscriptions('user-1');
      expect(prisma.recruitmentVendorSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', status: 'ACTIVE' }),
        }),
      );
    });

    it('filters out rows whose date window has passed', async () => {
      prisma.recruitmentVendorSubscription.findMany.mockResolvedValue([
        {
          id: 's1',
          status: 'ACTIVE',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-12-31'),
        },
      ]);
      const result = await service.getActiveSubscriptions('user-1');
      expect(result).toHaveLength(0);
    });
  });

  describe('requireAccess', () => {
    it('rejects unauthenticated callers', async () => {
      const result = await service.requireAccess(undefined);
      expect(result).toEqual({ authorized: false, reason: 'UNAUTHENTICATED' });
    });

    it('rejects when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.requireAccess('user-1');
      expect(result).toEqual({ authorized: false, reason: 'USER_NOT_FOUND' });
    });

    it('rejects when the user has no active RVA subscription', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', deletedAt: null });
      prisma.recruitmentVendorSubscription.findMany.mockResolvedValue([]);
      const result = await service.requireAccess('user-1');
      expect(result).toEqual({ authorized: false, reason: 'NO_ACTIVE_SUBSCRIPTION' });
    });

    it('authorizes only via an active RVA subscription', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', deletedAt: null });
      const past = new Date();
      past.setDate(past.getDate() - 1);
      const future = new Date();
      future.setDate(future.getDate() + 10);
      prisma.recruitmentVendorSubscription.findMany.mockResolvedValue([
        { id: 'rva-sub-1', status: 'ACTIVE', startDate: past, endDate: future },
      ]);
      const result = await service.requireAccess('user-1');
      expect(result).toEqual({ authorized: true, subscriptionId: 'rva-sub-1' });
    });
  });
});
