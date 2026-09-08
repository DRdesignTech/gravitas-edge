import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminReferralsService } from './admin-referrals.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

function mockAudit() {
  return { record: jest.fn().mockResolvedValue(undefined) } as any;
}

function mockPrisma() {
  const referral = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  const referralCommission = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  const referralSlab = { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() };
  return {
    referral,
    referralCommission,
    referralSlab,
    $transaction: jest.fn(async (fns: any[]) => Promise.all(fns)),
  };
}

describe('AdminReferralsService', () => {
  let service: AdminReferralsService;
  let prisma: ReturnType<typeof mockPrisma>;
  let audit: ReturnType<typeof mockAudit>;

  const baseReferral = {
    id: 'ref-1',
    referrerId: 'referrer-1',
    referredUserId: 'user-2',
    code: 'REF-6Q3MX7K2TY',
    status: 'PENDING',
    createdAt: new Date(),
    referrer: { id: 'referrer-1', email: 'a@x.com', referralCode: 'REF-6Q3MX7K2TY' },
    referredUser: { id: 'user-2', email: 'b@x.com', status: 'ACTIVE' },
    commissions: [],
  };

  beforeEach(async () => {
    prisma = mockPrisma();
    audit = mockAudit();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminReferralsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get(AdminReferralsService);
  });

  describe('listReferrals', () => {
    it('returns paginated referrals', async () => {
      prisma.referral.findMany.mockResolvedValue([baseReferral]);
      prisma.referral.count.mockResolvedValue(1);

      const result = await service.listReferrals({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
    });

    it('filters by status', async () => {
      prisma.referral.findMany.mockResolvedValue([]);
      prisma.referral.count.mockResolvedValue(0);

      await service.listReferrals({ status: 'SUCCESSFUL' });
      expect(prisma.referral.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'SUCCESSFUL' }) }),
      );
    });

    it('searches by referrer/referred email or full name', async () => {
      prisma.referral.findMany.mockResolvedValue([]);
      prisma.referral.count.mockResolvedValue(0);

      await service.listReferrals({ search: 'amit@foo.com' });
      const where = (prisma.referral.findMany as jest.Mock).mock.calls[0][0].where;
      expect(Array.isArray(where.OR)).toBe(true);
      expect(where.OR.some((c: any) => c.referrer)).toBe(true);
      expect(where.OR.some((c: any) => c.referredUser)).toBe(true);
      expect(where.OR.some((c: any) => c.code)).toBe(true);
    });

    it('filters by createdAt date range', async () => {
      prisma.referral.findMany.mockResolvedValue([]);
      prisma.referral.count.mockResolvedValue(0);

      await service.listReferrals({ fromDate: '2026-01-01', toDate: '2026-01-31' });
      const where = (prisma.referral.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.createdAt).toEqual({ gte: new Date('2026-01-01'), lte: new Date('2026-01-31') });
    });
  });

  describe('suspendReferral', () => {
    it('suspends a referral and records audit', async () => {
      prisma.referral.findFirst.mockResolvedValue(baseReferral);
      prisma.referral.update.mockResolvedValue({ ...baseReferral, status: 'SUSPENDED' });

      const result = await service.suspendReferral('ref-1', { reason: 'Fraud' }, 'admin-1', 'ip');
      expect(prisma.referral.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SUSPENDED', suspendedReason: 'Fraud' }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REFERRAL_SUSPENDED' }),
      );
      expect(result.status).toBe('SUSPENDED');
    });

    it('rejects suspending a successful referral', async () => {
      prisma.referral.findFirst.mockResolvedValue({ ...baseReferral, status: 'SUCCESSFUL' });
      await expect(
        service.suspendReferral('ref-1', { reason: 'Fraud' }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws for a missing referral', async () => {
      prisma.referral.findFirst.mockResolvedValue(null);
      await expect(service.suspendReferral('missing', { reason: 'x' }, 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listCommissions', () => {
    it('returns paginated commissions', async () => {
      prisma.referralCommission.findMany.mockResolvedValue([{ id: 'comm-1', status: 'PENDING' }]);
      prisma.referralCommission.count.mockResolvedValue(1);

      const result = await service.listCommissions({ page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
    });

    it('searches commissions by referrer/referred email or code', async () => {
      prisma.referralCommission.findMany.mockResolvedValue([]);
      prisma.referralCommission.count.mockResolvedValue(0);

      await service.listCommissions({ search: 'amit@foo.com' });
      const where = (prisma.referralCommission.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.referral).toBeDefined();
      expect(Array.isArray(where.referral.OR)).toBe(true);
    });
  });

  describe('commission workflow', () => {
    const commission = {
      id: 'comm-1',
      referralId: 'ref-1',
      subscriptionId: 'sub-1',
      status: 'PENDING',
      referral: { ...baseReferral },
      subscription: { id: 'sub-1', status: 'ACTIVE', plan: { id: 'plan-1', name: 'Basic' } },
    };

    it('approves a PENDING commission', async () => {
      prisma.referralCommission.findUnique.mockResolvedValue(commission);
      prisma.referralCommission.update.mockResolvedValue({ ...commission, status: 'APPROVED' });
      prisma.referralCommission.findUnique.mockResolvedValueOnce(commission).mockResolvedValueOnce({
        ...commission,
        status: 'APPROVED',
        approvedDate: new Date(),
      });

      const result = await service.approveCommission('comm-1', {}, 'admin-1', 'ip');
      expect(prisma.referralCommission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED', approvedDate: expect.any(Date) }),
        }),
      );
      expect(result.status).toBe('APPROVED');
    });

    it('rejects a non-PENDING commission approval', async () => {
      prisma.referralCommission.findUnique.mockResolvedValue({ ...commission, status: 'PAID' });
      await expect(service.approveCommission('comm-1', {}, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('marks a commission as paid with a payout reference', async () => {
      prisma.referralCommission.findUnique.mockResolvedValue(commission);
      prisma.referralCommission.update.mockResolvedValue({ ...commission, status: 'PAID' });
      prisma.referralCommission.findUnique
        .mockResolvedValueOnce({ ...commission, status: 'APPROVED' })
        .mockResolvedValueOnce({
          ...commission,
          status: 'PAID',
          paidDate: new Date(),
          payoutReference: 'UTR-123',
        });

      const result = await service.payCommission(
        'comm-1',
        { payoutReference: 'UTR-123' },
        'admin-1',
      );
      expect(prisma.referralCommission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAID', payoutReference: 'UTR-123' }),
        }),
      );
      expect(result.status).toBe('PAID');
    });

    it('rejects canceling a paid commission', async () => {
      prisma.referralCommission.findUnique.mockResolvedValue({ ...commission, status: 'PAID' });
      await expect(service.cancelCommission('comm-1', {}, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateSlab', () => {
    const slab = {
      id: 'slab-1',
      minReferrals: 1,
      maxReferrals: 5,
      commissionPercentage: { toString: () => '5' },
      isActive: true,
    };

    it('updates slab fields', async () => {
      prisma.referralSlab.findUnique.mockResolvedValue(slab);
      prisma.referralSlab.findMany.mockResolvedValue([]);
      prisma.referralSlab.update.mockResolvedValue({ ...slab, commissionPercentage: 10 });

      const result = await service.updateSlab('slab-1', { commissionPercentage: 10 }, 'admin-1');
      expect(result.commissionPercentage).toBe(10);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REFERRAL_SLAB_UPDATED' }),
      );
    });

    it('rejects minReferrals greater than maxReferrals', async () => {
      prisma.referralSlab.findUnique.mockResolvedValue(slab);
      await expect(
        service.updateSlab('slab-1', { minReferrals: 20, maxReferrals: 10 }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects overlapping slab ranges', async () => {
      prisma.referralSlab.findUnique.mockResolvedValue(slab);
      prisma.referralSlab.findMany.mockResolvedValue([
        { id: 'slab-2', minReferrals: 4, maxReferrals: 10 },
      ]);
      await expect(service.updateSlab('slab-1', { maxReferrals: 8 }, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects an out-of-range commission percentage', async () => {
      prisma.referralSlab.findUnique.mockResolvedValue(slab);
      await expect(
        service.updateSlab('slab-1', { commissionPercentage: 150 }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
