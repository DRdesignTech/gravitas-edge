import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeCouponAmounts,
  computeCouponStatus,
  COUPON_ERROR_MESSAGES,
  normalizeCouponCode,
} from './coupon.util';

function mockPrismaService() {
  return {
    subscriptionPlan: { findFirst: jest.fn() },
    coupon: { findFirst: jest.fn() },
    couponUsage: { count: jest.fn() },
  } as any;
}

function couponFixture(overrides: any = {}) {
  return {
    id: 'c1',
    code: 'SAVE20',
    description: null,
    discountType: 'PERCENTAGE',
    discountValue: 20,
    validFrom: new Date('2020-01-01T00:00:00.000Z'),
    validUntil: new Date('2030-12-31T23:59:59.999Z'),
    usageLimit: null,
    perUserUsageLimit: 1,
    appliesToAllUsers: true,
    isActive: true,
    deletedAt: null,
    plans: [],
    users: [],
    ...overrides,
  };
}

describe('CouponsService', () => {
  let service: CouponsService;
  let prisma: ReturnType<typeof mockPrismaService>;

  beforeEach(async () => {
    prisma = mockPrismaService();
    const moduleRef = await Test.createTestingModule({
      providers: [CouponsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(CouponsService);
  });

  const plan = {
    id: 'plan-1',
    name: 'Remote Access Vault · Monthly',
    price: 1499,
    currency: 'INR',
  };

  describe('validateForUser', () => {
    beforeEach(() => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue(plan);
      prisma.couponUsage.count.mockResolvedValue(0);
    });

    it('returns the server-calculated breakdown for a valid percentage coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue(couponFixture());
      const result = await service.validateForUser('u1', {
        couponCode: ' SAVE20 ',
        planId: 'plan-1',
      });

      expect(prisma.coupon.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ code: { equals: 'SAVE20', mode: 'insensitive' } }),
        }),
      );
      expect(result).toMatchObject({
        originalAmount: 1499,
        discountAmount: 299.8,
        finalAmount: 1199.2,
        currency: 'INR',
        coupon: { code: 'SAVE20', discountType: 'PERCENTAGE', discountValue: 20 },
      });
    });

    it('caps a FIXED discount at the original amount', async () => {
      prisma.coupon.findFirst.mockResolvedValue(
        couponFixture({ discountType: 'FIXED', discountValue: 9999 }),
      );
      const result = await service.validateForUser('u1', {
        couponCode: 'SAVE20',
        planId: 'plan-1',
      });
      expect(result).toMatchObject({ originalAmount: 1499, discountAmount: 1499, finalAmount: 0 });
    });

    it('throws NotFound when the plan is not purchasable', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue(null);
      await expect(
        service.validateForUser('u1', { couponCode: 'SAVE20', planId: 'plan-x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a missing/unknown coupon with COUPON_NOT_FOUND', async () => {
      prisma.coupon.findFirst.mockResolvedValue(null);
      await expect(
        service.validateForUser('u1', { couponCode: 'NOPE', planId: 'plan-1' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.validateForUser('u1', { couponCode: 'NOPE', planId: 'plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_NOT_FOUND' } });
    });

    it('rejects a disabled coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue(couponFixture({ isActive: false }));
      await expect(
        service.validateForUser('u1', { couponCode: 'SAVE20', planId: 'plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_DISABLED' } });
    });

    it('rejects a coupon whose window has not started', async () => {
      prisma.coupon.findFirst.mockResolvedValue(
        couponFixture({ validFrom: new Date('2100-01-01') }),
      );
      await expect(
        service.validateForUser('u1', { couponCode: 'SAVE20', planId: 'plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_NOT_STARTED' } });
    });

    it('rejects an expired coupon', async () => {
      prisma.coupon.findFirst.mockResolvedValue(
        couponFixture({ validUntil: new Date('2020-01-01') }),
      );
      await expect(
        service.validateForUser('u1', { couponCode: 'SAVE20', planId: 'plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_EXPIRED' } });
    });

    it('rejects a specific-users coupon for a non-eligible user', async () => {
      prisma.coupon.findFirst.mockResolvedValue(
        couponFixture({ appliesToAllUsers: false, users: [{ userId: 'other' }] }),
      );
      await expect(
        service.validateForUser('u1', { couponCode: 'SAVE20', planId: 'plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_NOT_ELIGIBLE' } });
    });

    it('accepts a specific-users coupon for an allow-listed user', async () => {
      prisma.coupon.findFirst.mockResolvedValue(
        couponFixture({ appliesToAllUsers: false, users: [{ userId: 'u1' }] }),
      );
      const result = await service.validateForUser('u1', {
        couponCode: 'SAVE20',
        planId: 'plan-1',
      });
      expect(result.finalAmount).toBeLessThan(result.originalAmount);
    });

    it('rejects a coupon that does not apply to the selected plan', async () => {
      prisma.coupon.findFirst.mockResolvedValue(couponFixture({ plans: [{ planId: 'plan-2' }] }));
      await expect(
        service.validateForUser('u1', { couponCode: 'SAVE20', planId: 'plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_WRONG_PLAN' } });
    });

    it('accepts a coupon with a plan allow-list that includes the plan', async () => {
      prisma.coupon.findFirst.mockResolvedValue(couponFixture({ plans: [{ planId: 'plan-1' }] }));
      const result = await service.validateForUser('u1', {
        couponCode: 'SAVE20',
        planId: 'plan-1',
      });
      expect(result.coupon.code).toBe('SAVE20');
    });

    it('rejects a coupon whose global usage limit is exhausted', async () => {
      prisma.coupon.findFirst.mockResolvedValue(couponFixture({ usageLimit: 5 }));
      prisma.couponUsage.count.mockResolvedValueOnce(5);
      await expect(
        service.validateForUser('u1', { couponCode: 'SAVE20', planId: 'plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_LIMIT_REACHED' } });
    });

    it('rejects a coupon when the user hit their per-user limit', async () => {
      prisma.coupon.findFirst.mockResolvedValue(couponFixture());
      prisma.couponUsage.count.mockResolvedValueOnce(8).mockResolvedValueOnce(1);
      await expect(
        service.validateForUser('u1', { couponCode: 'SAVE20', planId: 'plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_USER_LIMIT_REACHED' } });
    });

    it('accepts at the exact boundary of the per-user limit', async () => {
      prisma.coupon.findFirst.mockResolvedValue(couponFixture({ perUserUsageLimit: 2 }));
      prisma.couponUsage.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
      const result = await service.validateForUser('u1', {
        couponCode: 'SAVE20',
        planId: 'plan-1',
      });
      expect(result.finalAmount).toBe(1199.2);
    });

    it('treats a zero/negative/invalid discount configuration as unusable', async () => {
      prisma.coupon.findFirst.mockResolvedValue(couponFixture({ discountValue: 0 }));
      await expect(
        service.validateForUser('u1', { couponCode: 'SAVE20', planId: 'plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_NOT_FOUND' } });
    });

    it('rejects a percentage above 100 as a misconfiguration', async () => {
      prisma.coupon.findFirst.mockResolvedValue(couponFixture({ discountValue: 150 }));
      await expect(
        service.validateForUser('u1', { couponCode: 'SAVE20', planId: 'plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_NOT_FOUND' } });
    });
  });
});

describe('coupon.util', () => {
  describe('normalizeCouponCode', () => {
    it('trims, collapses whitespace and upper-cases', () => {
      expect(normalizeCouponCode('  save 20 ')).toBe('SAVE20');
      expect(normalizeCouponCode(null)).toBe('');
    });
  });

  describe('computeCouponAmounts', () => {
    it('rounds to 2 decimals', () => {
      expect(computeCouponAmounts('PERCENTAGE', 33.33, 1000)).toEqual({
        originalAmount: 1000,
        discountAmount: 333.3,
        finalAmount: 666.7,
      });
    });

    it('never discounts below zero for FIXED', () => {
      expect(computeCouponAmounts('FIXED', 200, 100).finalAmount).toBe(0);
      expect(computeCouponAmounts('FIXED', 200, 100).discountAmount).toBe(100);
    });

    it('caps PERCENTAGE at 100%', () => {
      expect(computeCouponAmounts('PERCENTAGE', 100, 1000)).toEqual({
        originalAmount: 1000,
        discountAmount: 1000,
        finalAmount: 0,
      });
    });
  });

  describe('computeCouponStatus', () => {
    const base = {
      isActive: true,
      validFrom: new Date('2020-01-01'),
      validUntil: new Date('2030-01-01'),
      usageLimit: 10,
      deletedAt: null,
    };
    const now = new Date('2025-01-01');

    it('orders by precedence: archived > disabled > window > limit > active', () => {
      expect(computeCouponStatus({ ...base, deletedAt: new Date() }, 0, now)).toBe('ARCHIVED');
      expect(computeCouponStatus({ ...base, isActive: false }, 0, now)).toBe('DISABLED');
      expect(computeCouponStatus({ ...base, validFrom: new Date('2050-01-01') }, 0, now)).toBe(
        'SCHEDULED',
      );
      expect(computeCouponStatus({ ...base, validUntil: new Date('2020-01-01') }, 0, now)).toBe(
        'EXPIRED',
      );
      expect(computeCouponStatus(base, 10, now)).toBe('USAGE_LIMIT_REACHED');
      expect(computeCouponStatus(base, 9, now)).toBe('ACTIVE');
      expect(computeCouponStatus({ ...base, usageLimit: null }, 1000, now)).toBe('ACTIVE');
    });
  });
});

describe('CouponsService error copy', () => {
  it('provides friendly user-facing copy for every code', () => {
    expect(COUPON_ERROR_MESSAGES.COUPON_EXPIRED).toBe('This coupon has expired.');
    expect(COUPON_ERROR_MESSAGES.COUPON_USER_LIMIT_REACHED).toBe(
      'You have already used this coupon.',
    );
  });
});
