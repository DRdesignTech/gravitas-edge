import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RvaPricingService, RVA_PAYMENT_METADATA_KIND } from './rva-pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from '../payments/razorpay.service';
import { RvaCouponsService } from './rva-coupons.service';

function mockPrisma(): any {
  return {
    recruitmentVendorPlan: { findFirst: jest.fn() },
    recruitmentVendorSubscription: { create: jest.fn(), findUnique: jest.fn() },
    recruitmentVendorCouponUsage: { create: jest.fn(), updateMany: jest.fn() },
    payment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(async (cb: any) => cb(mockPrisma())),
  };
}

function mockRvaCoupons() {
  return {
    resolve: jest.fn(),
    reload: jest.fn(),
    lock: jest.fn().mockResolvedValue(undefined),
    assertEligible: jest.fn(),
    assertLimits: jest.fn().mockResolvedValue(undefined),
    computeAmounts: jest.fn(),
  };
}

describe('RvaPricingService', () => {
  let service: RvaPricingService;
  let prisma: ReturnType<typeof mockPrisma>;
  let razorpay: { createOrder: jest.Mock; getKeyId: jest.Mock; verifySignature: jest.Mock };
  let coupons: ReturnType<typeof mockRvaCoupons>;

  const plan = {
    id: 'rva-plan-1',
    name: 'Recruitment Vendor Access · 3 Months',
    price: 4999,
    regularPrice: 5999,
    discountPercentage: 17,
    currency: 'INR',
    durationDays: 90,
    isActive: true,
    deletedAt: null,
  };

  const rvaCoupon = {
    id: 'rva-cpn-1',
    code: 'RVA20',
    description: null,
    discountType: 'PERCENTAGE',
    discountValue: 20,
    validFrom: new Date('2020-01-01'),
    validUntil: new Date('2030-01-01'),
    usageLimit: null,
    perUserUsageLimit: 1,
    appliesToAllUsers: true,
    isActive: true,
    deletedAt: null,
    plans: [],
    users: [],
  };

  beforeEach(async () => {
    prisma = mockPrisma();
    coupons = mockRvaCoupons();
    razorpay = {
      createOrder: jest.fn().mockResolvedValue({ id: 'order_rva_1' }),
      getKeyId: jest.fn().mockReturnValue('key'),
      verifySignature: jest.fn().mockReturnValue(true),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        RvaPricingService,
        { provide: PrismaService, useValue: prisma },
        { provide: RazorpayService, useValue: razorpay },
        { provide: RvaCouponsService, useValue: coupons },
      ],
    }).compile();
    service = moduleRef.get(RvaPricingService);
  });

  describe('purchase', () => {
    it('charges the server-side plan price and tags the payment as RVA', async () => {
      prisma.recruitmentVendorPlan.findFirst.mockResolvedValue(plan);
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        razorpayOrderId: 'order_rva_1',
        amount: 4999,
        currency: 'INR',
        status: 'CREATED',
      });

      const result = await service.purchase('user-1', 'rva-plan-1');

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 4999,
            metadata: expect.objectContaining({
              kind: RVA_PAYMENT_METADATA_KIND,
              planId: 'rva-plan-1',
            }),
          }),
        }),
      );
      expect(result.amount).toBe(4999);
      expect(result.durationDays).toBe(90);
    });

    it('rejects an inactive/archived plan', async () => {
      prisma.recruitmentVendorPlan.findFirst.mockResolvedValue(null);
      await expect(service.purchase('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('ignores a blank coupon code and charges the full price', async () => {
      prisma.recruitmentVendorPlan.findFirst.mockResolvedValue(plan);
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        razorpayOrderId: 'order_rva_1',
        amount: 4999,
        currency: 'INR',
        status: 'CREATED',
      });

      await service.purchase('user-1', 'rva-plan-1', '   ');

      expect(coupons.resolve).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ amount: 4999 }) }),
      );
    });

    it('applies an RVA coupon, charges the discounted amount and reserves a usage', async () => {
      prisma.recruitmentVendorPlan.findFirst.mockResolvedValue(plan);
      coupons.resolve.mockResolvedValue(rvaCoupon);
      coupons.reload.mockResolvedValue(rvaCoupon);
      coupons.computeAmounts.mockReturnValue({
        originalAmount: 4999,
        discountAmount: 999.8,
        finalAmount: 3999.2,
      });

      const txPrisma = mockPrisma();
      txPrisma.payment.create.mockResolvedValue({
        id: 'pay-coupon',
        razorpayOrderId: 'order_rva_coupon',
        amount: 3999.2,
        currency: 'INR',
        status: 'CREATED',
      });
      txPrisma.recruitmentVendorCouponUsage.create.mockResolvedValue({});
      prisma.$transaction.mockImplementation(async (cb: any) => cb(txPrisma));

      const result = await service.purchase('user-1', 'rva-plan-1', 'rva20');

      expect(coupons.resolve).toHaveBeenCalledWith(txPrisma, 'rva20');
      expect(coupons.lock).toHaveBeenCalledWith(txPrisma, 'rva-cpn-1');
      expect(coupons.reload).toHaveBeenCalledWith(txPrisma, 'rva-cpn-1');
      expect(coupons.assertEligible).toHaveBeenCalledWith(
        rvaCoupon,
        'user-1',
        'rva-plan-1',
        expect.any(Date),
      );
      expect(coupons.assertLimits).toHaveBeenCalledWith(txPrisma, rvaCoupon, 'user-1');
      expect(razorpay.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 3999.2 }),
      );
      expect(txPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 3999.2,
            metadata: expect.objectContaining({
              couponId: 'rva-cpn-1',
              couponCode: 'RVA20',
              originalAmount: 4999,
              discountAmount: 999.8,
            }),
          }),
        }),
      );
      expect(txPrisma.recruitmentVendorCouponUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            couponId: 'rva-cpn-1',
            userId: 'user-1',
            planId: 'rva-plan-1',
            paymentId: 'pay-coupon',
            finalAmount: 3999.2,
          }),
        }),
      );
      expect(result).toMatchObject({
        amount: 3999.2,
        originalAmount: 4999,
        discountAmount: 999.8,
        coupon: { code: 'RVA20' },
      });
    });
  });

  describe('confirmPurchase', () => {
    it('creates a RecruitmentVendorSubscription (not a generic Subscription) with a duration window', async () => {
      const payment = {
        id: 'pay-1',
        userId: 'user-1',
        status: 'CREATED',
        amount: 4999,
        currency: 'INR',
        razorpayOrderId: 'order_rva_1',
        razorpayPaymentId: null,
        recruitmentVendorSubscriptionId: null,
        metadata: { kind: RVA_PAYMENT_METADATA_KIND, planId: 'rva-plan-1' },
      };
      prisma.payment.findUnique.mockResolvedValue(payment);
      prisma.recruitmentVendorPlan.findFirst.mockResolvedValue(plan);

      const txPrisma = mockPrisma();
      txPrisma.recruitmentVendorSubscription.create.mockResolvedValue({
        id: 'rva-sub-1',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(),
      });
      txPrisma.payment.update.mockResolvedValue({});
      prisma.$transaction.mockImplementation(async (cb: any) => cb(txPrisma));

      const result = await service.confirmPurchase('user-1', 'pay-1');

      expect(txPrisma.recruitmentVendorSubscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            planId: 'rva-plan-1',
            status: 'ACTIVE',
          }),
        }),
      );
      expect(txPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recruitmentVendorSubscriptionId: 'rva-sub-1',
            status: 'SUCCESS',
          }),
        }),
      );
      expect(txPrisma.recruitmentVendorCouponUsage.updateMany).toHaveBeenCalledWith({
        where: { paymentId: 'pay-1' },
        data: { recruitmentVendorSubscriptionId: 'rva-sub-1' },
      });
      expect(result.subscription?.id).toBe('rva-sub-1');
      expect(result).not.toHaveProperty('coupon');
    });

    it('links the reserved RVA coupon usage and echoes the coupon on a coupon purchase', async () => {
      const payment = {
        id: 'pay-coupon',
        userId: 'user-1',
        status: 'CREATED',
        amount: 3999.2,
        currency: 'INR',
        razorpayOrderId: 'order_rva_coupon',
        razorpayPaymentId: null,
        recruitmentVendorSubscriptionId: null,
        metadata: {
          kind: RVA_PAYMENT_METADATA_KIND,
          planId: 'rva-plan-1',
          couponId: 'rva-cpn-1',
          couponCode: 'RVA20',
          originalAmount: 4999,
          discountAmount: 999.8,
        },
      };
      prisma.payment.findUnique.mockResolvedValue(payment);
      prisma.recruitmentVendorPlan.findFirst.mockResolvedValue(plan);

      const txPrisma = mockPrisma();
      txPrisma.recruitmentVendorSubscription.create.mockResolvedValue({
        id: 'rva-sub-2',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(),
      });
      txPrisma.payment.update.mockResolvedValue({});
      txPrisma.recruitmentVendorCouponUsage.updateMany.mockResolvedValue({ count: 1 });
      prisma.$transaction.mockImplementation(async (cb: any) => cb(txPrisma));

      const result = await service.confirmPurchase('user-1', 'pay-coupon');

      expect(txPrisma.recruitmentVendorCouponUsage.updateMany).toHaveBeenCalledWith({
        where: { paymentId: 'pay-coupon' },
        data: { recruitmentVendorSubscriptionId: 'rva-sub-2' },
      });
      expect(result).toMatchObject({
        coupon: {
          id: 'rva-cpn-1',
          code: 'RVA20',
          originalAmount: 4999,
          discountAmount: 999.8,
          finalAmount: 3999.2,
        },
      });
    });
  });

  describe('getPaymentSession', () => {
    it('returns the coupon breakdown stored on an RVA coupon payment', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-coupon',
        userId: 'user-1',
        status: 'CREATED',
        amount: 3999.2,
        currency: 'INR',
        razorpayOrderId: 'order_rva_coupon',
        metadata: {
          kind: RVA_PAYMENT_METADATA_KIND,
          planId: 'rva-plan-1',
          planName: plan.name,
          durationDays: 90,
          couponCode: 'RVA20',
          originalAmount: 4999,
          discountAmount: 999.8,
        },
      });

      const result = await service.getPaymentSession('user-1', 'pay-coupon');

      expect(result).toMatchObject({
        couponCode: 'RVA20',
        originalAmount: 4999,
        discountAmount: 999.8,
        finalAmount: 3999.2,
      });
    });

    it('defaults to the charged amount when there is no coupon metadata', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        userId: 'user-1',
        status: 'CREATED',
        amount: 4999,
        currency: 'INR',
        razorpayOrderId: 'order_rva_1',
        metadata: { kind: RVA_PAYMENT_METADATA_KIND, planId: 'rva-plan-1' },
      });

      const result = await service.getPaymentSession('user-1', 'pay-1');

      expect(result).toMatchObject({
        couponCode: null,
        originalAmount: 4999,
        discountAmount: 0,
        finalAmount: 4999,
      });
    });
  });

  describe('cross-vault payment isolation', () => {
    it('rejects an Opportunity Vault payment id (no RVA kind marker)', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-generic',
        userId: 'user-1',
        status: 'CREATED',
        metadata: { planId: 'generic-plan', vaultId: 'v1' },
      });
      await expect(service.confirmPurchase('user-1', 'pay-generic')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects a payment owned by another user', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        userId: 'someone-else',
        status: 'CREATED',
        metadata: { kind: RVA_PAYMENT_METADATA_KIND, planId: 'rva-plan-1' },
      });
      await expect(service.confirmPurchase('user-1', 'pay-1')).rejects.toThrow(NotFoundException);
    });

    it('maps a discontinued plan to ConflictException', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        userId: 'user-1',
        status: 'CREATED',
        amount: 4999,
        currency: 'INR',
        razorpayOrderId: 'order_rva_1',
        razorpayPaymentId: null,
        metadata: { kind: RVA_PAYMENT_METADATA_KIND, planId: 'rva-plan-1' },
      });
      prisma.recruitmentVendorPlan.findFirst.mockResolvedValue(null);
      await expect(service.confirmPurchase('user-1', 'pay-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('verifyPayment', () => {
    it('fails the payment on an invalid signature and never activates', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        userId: 'user-1',
        status: 'CREATED',
        razorpayOrderId: 'order_rva_1',
        metadata: { kind: RVA_PAYMENT_METADATA_KIND, planId: 'rva-plan-1' },
      });
      razorpay.verifySignature.mockReturnValue(false);
      await expect(
        service.verifyPayment('user-1', {
          paymentId: 'pay-1',
          razorpay_order_id: 'order_rva_1',
          razorpay_payment_id: 'rzp-1',
          razorpay_signature: 'bad',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
      );
    });
  });
});
