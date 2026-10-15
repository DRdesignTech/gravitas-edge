import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RvaPricingService, RVA_PAYMENT_METADATA_KIND } from './rva-pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from '../payments/razorpay.service';

function mockPrisma(): any {
  return {
    recruitmentVendorPlan: { findFirst: jest.fn() },
    recruitmentVendorSubscription: { create: jest.fn(), findUnique: jest.fn() },
    payment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(async (cb: any) => cb(mockPrisma())),
  };
}

describe('RvaPricingService', () => {
  let service: RvaPricingService;
  let prisma: ReturnType<typeof mockPrisma>;
  let razorpay: { createOrder: jest.Mock; getKeyId: jest.Mock; verifySignature: jest.Mock };

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

  beforeEach(async () => {
    prisma = mockPrisma();
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
      expect(result.subscription?.id).toBe('rva-sub-1');
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
