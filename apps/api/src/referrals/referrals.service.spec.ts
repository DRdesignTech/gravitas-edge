import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReferralsService } from './referrals.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

function mockConfig() {
  return {
    get: jest.fn((key: string) =>
      key === 'REFERRAL_BASE_URL' ? 'http://localhost:3000' : undefined,
    ),
  } as any;
}

function mockAudit() {
  return { record: jest.fn().mockResolvedValue(undefined) } as any;
}

function mockPrisma() {
  const referral = {
    findFirst: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };
  const referralCommission = {
    count: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    create: jest.fn(),
  };
  const referralSlab = { findFirst: jest.fn() };
  const user = { findUnique: jest.fn(), update: jest.fn() };
  const subscription = { findUnique: jest.fn() };
  return {
    user,
    referral,
    referralCommission,
    referralSlab,
    subscription,
    $transaction: jest.fn(async (arg: any) => {
      if (typeof arg === 'function') {
        return await arg({ referral, referralSlab, referralCommission, user });
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg;
    }),
  };
}

describe('ReferralsService', () => {
  let service: ReferralsService;
  let prisma: ReturnType<typeof mockPrisma>;
  let audit: ReturnType<typeof mockAudit>;

  const user = { id: 'user-1', referralCode: 'REF-6Q3MX7K2TY' };

  beforeEach(async () => {
    prisma = mockPrisma();
    audit = mockAudit();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: mockConfig() },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get(ReferralsService);
  });

  describe('ensureReferralCode', () => {
    it('returns existing code and link without regenerating', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      const result = await service.ensureReferralCode('user-1');
      expect(result.referralCode).toBe('REF-6Q3MX7K2TY');
      expect(result.referralLink).toContain('http://localhost:3000?ref=REF-6Q3MX7K2TY');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('generates and persists a new code when the user has none', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', referralCode: null })
        .mockResolvedValue(null);
      const result = await service.ensureReferralCode('user-1');
      expect(result.referralCode).toMatch(/^REF-[A-Z2-9]{10}$/);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('throws when the user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.ensureReferralCode('missing')).rejects.toThrow('User not found');
    });
  });

  describe('attributeReferralInTx', () => {
    it('creates a PENDING referral linking referrer to referred user', async () => {
      const tx = {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'referrer-1', status: 'ACTIVE', deletedAt: null }),
        },
        referral: { create: jest.fn().mockResolvedValue({ id: 'ref-1' }) },
      };
      const result = await service.attributeReferralInTx(tx as any, 'REF-6Q3MX7K2TY', 'user-2');
      expect(tx.referral.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING', referredUserId: 'user-2' }),
        }),
      );
      expect(result).toEqual({ id: 'ref-1' });
    });

    it('returns null when no referral code is provided', async () => {
      const result = await service.attributeReferralInTx({} as any, '', 'user-2');
      expect(result).toBeNull();
    });

    it('rejects self-referral', async () => {
      const tx = {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'user-2', status: 'ACTIVE', deletedAt: null }),
        },
        referral: { create: jest.fn() },
      };
      await expect(
        service.attributeReferralInTx(tx as any, 'REF-6Q3MX7K2TY', 'user-2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects unknown or inactive referral codes', async () => {
      const tx = {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'referrer-1', status: 'INACTIVE', deletedAt: null }),
        },
        referral: { create: jest.fn() },
      };
      await expect(
        service.attributeReferralInTx(tx as any, 'REF-UNKNOWN99', 'user-2'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleSubscriptionActivated', () => {
    const subscription = {
      id: 'sub-1',
      userId: 'user-2',
      status: 'ACTIVE',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      plan: { id: 'plan-1', price: 499, name: 'Basic' },
      payments: [{ status: 'SUCCESS' }],
      commissions: [],
    };

    it('creates a PENDING commission with slab percentage when subscription is active', async () => {
      prisma.subscription = { findUnique: jest.fn().mockResolvedValue(subscription) };
      prisma.referral.findFirst.mockResolvedValue({
        id: 'ref-1',
        referrerId: 'referrer-1',
        referredUserId: 'user-2',
        status: 'PENDING',
      });
      prisma.referral.count.mockResolvedValue(0);
      prisma.referralSlab.findFirst.mockResolvedValue({
        id: 'slab-1',
        commissionPercentage: 10,
      });
      prisma.referralCommission.create.mockResolvedValue({
        id: 'comm-1',
        commissionAmount: { toString: () => '49.9' },
      });

      await service.handleSubscriptionActivated('sub-1');

      expect(prisma.referralCommission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING',
            referralId: 'ref-1',
            subscriptionId: 'sub-1',
          }),
        }),
      );
      const call = (prisma.referralCommission.create as jest.Mock).mock.calls[0][0];
      expect(call.data.commissionAmount.toString()).toBe('49.9');
    });

    it('skips when subscription is not ACTIVE', async () => {
      prisma.subscription = {
        findUnique: jest.fn().mockResolvedValue({ ...subscription, status: 'CANCELLED' }),
      };
      await service.handleSubscriptionActivated('sub-1');
      expect(prisma.referralCommission.create).not.toHaveBeenCalled();
    });

    it('skips when subscription has a refunded/failed payment', async () => {
      prisma.subscription = {
        findUnique: jest
          .fn()
          .mockResolvedValue({ ...subscription, payments: [{ status: 'REFUNDED' }] }),
      };
      await service.handleSubscriptionActivated('sub-1');
      expect(prisma.referralCommission.create).not.toHaveBeenCalled();
    });

    it('skips when no PENDING referral exists for the user', async () => {
      prisma.subscription = { findUnique: jest.fn().mockResolvedValue(subscription) };
      prisma.referral.findFirst.mockResolvedValue(null);
      await service.handleSubscriptionActivated('sub-1');
      expect(prisma.referralCommission.create).not.toHaveBeenCalled();
    });

    it('marks referral SUCCESSFUL but does not create a commission when no slab matches', async () => {
      prisma.subscription = { findUnique: jest.fn().mockResolvedValue(subscription) };
      prisma.referral.findFirst.mockResolvedValue({
        id: 'ref-1',
        referrerId: 'referrer-1',
        referredUserId: 'user-2',
        status: 'PENDING',
      });
      prisma.referral.count.mockResolvedValue(0);
      prisma.referralSlab.findFirst.mockResolvedValue(null);

      await service.handleSubscriptionActivated('sub-1');

      expect(prisma.referral.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'SUCCESSFUL' }) }),
      );
      expect(prisma.referralCommission.create).not.toHaveBeenCalled();
    });
  });

  describe('getCommissionStatistics', () => {
    it('aggregates commission counts and totals', async () => {
      prisma.referralCommission.count.mockResolvedValue(1);
      prisma.referralCommission.aggregate.mockResolvedValue({
        _sum: { commissionAmount: { toString: () => '49.9' } },
      });

      const result = await service.getCommissionStatistics('user-1');
      expect(result.counts.total).toBe(1);
      expect(result.totalCommissionAmount).toBe('49.9');
    });
  });
});
