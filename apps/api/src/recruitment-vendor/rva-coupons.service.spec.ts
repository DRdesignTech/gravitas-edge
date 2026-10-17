import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RvaCouponsService } from './rva-coupons.service';
import { PrismaService } from '../prisma/prisma.service';

function mockPrismaService() {
  return {
    recruitmentVendorPlan: { findFirst: jest.fn() },
    recruitmentVendorCoupon: { findFirst: jest.fn(), findMany: jest.fn() },
    recruitmentVendorCouponUsage: { count: jest.fn() },
  } as any;
}

function couponFixture(overrides: any = {}) {
  return {
    id: 'rc1',
    code: 'RVA20',
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

describe('RvaCouponsService', () => {
  let service: RvaCouponsService;
  let prisma: ReturnType<typeof mockPrismaService>;

  beforeEach(async () => {
    prisma = mockPrismaService();
    const moduleRef = await Test.createTestingModule({
      providers: [RvaCouponsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(RvaCouponsService);
  });

  const plan = {
    id: 'rva-plan-1',
    name: 'Recruitment Vendor Access · Monthly',
    price: 4999,
    currency: 'INR',
  };

  describe('validateForUser', () => {
    beforeEach(() => {
      prisma.recruitmentVendorPlan.findFirst.mockResolvedValue(plan);
      prisma.recruitmentVendorCouponUsage.count.mockResolvedValue(0);
    });

    it('reads only the RVA plan and RVA coupon tables', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(couponFixture());
      await service.validateForUser('u1', { couponCode: 'RVA20', planId: 'rva-plan-1' });

      expect(prisma.recruitmentVendorPlan.findFirst).toHaveBeenCalled();
      expect(prisma.recruitmentVendorCoupon.findFirst).toHaveBeenCalled();
      expect(prisma.recruitmentVendorCouponUsage.count).toHaveBeenCalled();
    });

    it('returns the server-calculated breakdown for a valid percentage coupon', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(couponFixture());
      const result = await service.validateForUser('u1', {
        couponCode: ' rva20 ',
        planId: 'rva-plan-1',
      });

      expect(prisma.recruitmentVendorCoupon.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ code: { equals: 'RVA20', mode: 'insensitive' } }),
        }),
      );
      expect(result).toMatchObject({
        originalAmount: 4999,
        discountAmount: 999.8,
        finalAmount: 3999.2,
        currency: 'INR',
        planId: 'rva-plan-1',
        planName: plan.name,
        coupon: { code: 'RVA20', discountType: 'PERCENTAGE', discountValue: 20 },
      });
    });

    it('caps a FIXED discount at the original amount', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(
        couponFixture({ discountType: 'FIXED', discountValue: 99999 }),
      );
      const result = await service.validateForUser('u1', {
        couponCode: 'RVA20',
        planId: 'rva-plan-1',
      });
      expect(result).toMatchObject({ originalAmount: 4999, discountAmount: 4999, finalAmount: 0 });
    });

    it('throws NotFound when the RVA plan is not purchasable', async () => {
      prisma.recruitmentVendorPlan.findFirst.mockResolvedValue(null);
      await expect(
        service.validateForUser('u1', { couponCode: 'RVA20', planId: 'rva-plan-x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a missing/unknown coupon with COUPON_NOT_FOUND', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(null);
      await expect(
        service.validateForUser('u1', { couponCode: 'NOPE', planId: 'rva-plan-1' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.validateForUser('u1', { couponCode: 'NOPE', planId: 'rva-plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_NOT_FOUND' } });
    });

    it('rejects a disabled coupon', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(
        couponFixture({ isActive: false }),
      );
      await expect(
        service.validateForUser('u1', { couponCode: 'RVA20', planId: 'rva-plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_DISABLED' } });
    });

    it('rejects a coupon whose window has not started', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(
        couponFixture({ validFrom: new Date('2100-01-01') }),
      );
      await expect(
        service.validateForUser('u1', { couponCode: 'RVA20', planId: 'rva-plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_NOT_STARTED' } });
    });

    it('rejects an expired coupon', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(
        couponFixture({ validUntil: new Date('2020-01-01') }),
      );
      await expect(
        service.validateForUser('u1', { couponCode: 'RVA20', planId: 'rva-plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_EXPIRED' } });
    });

    it('rejects a specific-users coupon for a non-eligible user', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(
        couponFixture({ appliesToAllUsers: false, users: [{ userId: 'other' }] }),
      );
      await expect(
        service.validateForUser('u1', { couponCode: 'RVA20', planId: 'rva-plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_NOT_ELIGIBLE' } });
    });

    it('accepts a specific-users coupon for an allow-listed user', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(
        couponFixture({ appliesToAllUsers: false, users: [{ userId: 'u1' }] }),
      );
      const result = await service.validateForUser('u1', {
        couponCode: 'RVA20',
        planId: 'rva-plan-1',
      });
      expect(result.finalAmount).toBeLessThan(result.originalAmount);
    });

    it('rejects a coupon that does not apply to the selected RVA plan', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(
        couponFixture({ plans: [{ planId: 'rva-plan-2' }] }),
      );
      await expect(
        service.validateForUser('u1', { couponCode: 'RVA20', planId: 'rva-plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_WRONG_PLAN' } });
    });

    it('accepts a coupon with a plan allow-list that includes the plan', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(
        couponFixture({ plans: [{ planId: 'rva-plan-1' }] }),
      );
      const result = await service.validateForUser('u1', {
        couponCode: 'RVA20',
        planId: 'rva-plan-1',
      });
      expect(result.coupon.code).toBe('RVA20');
    });

    it('rejects a coupon whose global usage limit is exhausted', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(couponFixture({ usageLimit: 5 }));
      prisma.recruitmentVendorCouponUsage.count.mockResolvedValueOnce(5);
      await expect(
        service.validateForUser('u1', { couponCode: 'RVA20', planId: 'rva-plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_LIMIT_REACHED' } });
    });

    it('rejects a coupon when the user hit their per-user limit', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(couponFixture());
      prisma.recruitmentVendorCouponUsage.count.mockResolvedValueOnce(8).mockResolvedValueOnce(1);
      await expect(
        service.validateForUser('u1', { couponCode: 'RVA20', planId: 'rva-plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_USER_LIMIT_REACHED' } });
    });

    it('accepts at the exact boundary of the per-user limit', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(
        couponFixture({ perUserUsageLimit: 2 }),
      );
      prisma.recruitmentVendorCouponUsage.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
      const result = await service.validateForUser('u1', {
        couponCode: 'RVA20',
        planId: 'rva-plan-1',
      });
      expect(result.finalAmount).toBe(3999.2);
    });

    it('treats a zero/negative/invalid discount configuration as unusable', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(
        couponFixture({ discountValue: 0 }),
      );
      await expect(
        service.validateForUser('u1', { couponCode: 'RVA20', planId: 'rva-plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_NOT_FOUND' } });
    });

    it('rejects a percentage above 100 as a misconfiguration', async () => {
      prisma.recruitmentVendorCoupon.findFirst.mockResolvedValue(
        couponFixture({ discountValue: 150 }),
      );
      await expect(
        service.validateForUser('u1', { couponCode: 'RVA20', planId: 'rva-plan-1' }),
      ).rejects.toMatchObject({ response: { code: 'COUPON_NOT_FOUND' } });
    });
  });

  describe('listAvailableForUser', () => {
    it('throws NotFound when the RVA plan is not purchasable', async () => {
      prisma.recruitmentVendorPlan.findFirst.mockResolvedValue(null);
      await expect(service.listAvailableForUser('u1', 'rva-plan-x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns only the coupons this user can redeem against the plan', async () => {
      prisma.recruitmentVendorPlan.findFirst.mockResolvedValue(plan);
      prisma.recruitmentVendorCouponUsage.count.mockResolvedValue(0);
      prisma.recruitmentVendorCoupon.findMany.mockResolvedValue([
        couponFixture({ id: 'ok', code: 'OK10', discountValue: 10 }),
        couponFixture({ id: 'wrongPlan', code: 'WRONG', plans: [{ planId: 'other' }] }),
        couponFixture({
          id: 'otherUser',
          code: 'MINE',
          appliesToAllUsers: false,
          users: [{ userId: 'someone' }],
        }),
      ]);

      const result = await service.listAvailableForUser('u1', 'rva-plan-1');

      expect(prisma.recruitmentVendorCoupon.findMany).toHaveBeenCalled();
      expect(result.planId).toBe('rva-plan-1');
      expect(result.currency).toBe('INR');
      expect(result.originalAmount).toBe(4999);
      expect(result.coupons.map((c) => c.coupon.code)).toEqual(['OK10']);
    });

    it('never returns coupons the user has exhausted', async () => {
      prisma.recruitmentVendorPlan.findFirst.mockResolvedValue(plan);
      prisma.recruitmentVendorCoupon.findMany.mockResolvedValue([couponFixture({ id: 'used' })]);
      prisma.recruitmentVendorCouponUsage.count.mockResolvedValue(1);

      const result = await service.listAvailableForUser('u1', 'rva-plan-1');
      expect(result.coupons).toEqual([]);
    });
  });
});
