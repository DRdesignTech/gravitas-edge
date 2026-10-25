import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PricingService, OneTimePurchaseResult, RecurringPurchaseResult } from './pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionAccessService } from '../access/subscription-access.service';
import { CouponsService } from '../coupons/coupons.service';
import { RazorpayService } from '../payments/razorpay.service';
import { SubscriptionStatus } from '@prisma/client';

function mockPrismaService() {
  return {
    vault: { findMany: jest.fn() },
    subscriptionPlan: { findFirst: jest.fn() },
    payment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    subscription: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    couponUsage: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
  } as any;
}

function catalogRow(vault: any, plans: any[]) {
  return {
    id: vault.id,
    name: vault.name,
    description: vault.description,
    status: 'ACTIVE',
    deletedAt: null,
    plans: plans.map((p) => ({
      plan: { ...p, price: p.price, currency: 'INR', isActive: true, deletedAt: null },
    })),
  };
}

describe('PricingService', () => {
  let service: PricingService;
  let prisma: ReturnType<typeof mockPrismaService>;
  let access: { createSubscriptionWithSnapshot: jest.Mock };

  beforeEach(async () => {
    prisma = mockPrismaService();
    access = { createSubscriptionWithSnapshot: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionAccessService, useValue: access },
        { provide: CouponsService, useValue: {} },
        {
          provide: RazorpayService,
          useValue: {
            createOrder: jest.fn().mockResolvedValue({ id: 'order_abc' }),
            getKeyId: jest.fn().mockReturnValue('key'),
            verifySignature: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();
    service = moduleRef.get(PricingService);
  });

  describe('getPublicPricing', () => {
    const plans = () => [
      {
        id: 'p1',
        name: 'Remote Access Vault · Monthly',
        durationDays: 30,
        price: 1499,
        regularPrice: 1999,
        discountPercentage: 25,
      },
      {
        id: 'p2',
        name: 'Remote Access Vault · 3 Months',
        durationDays: 90,
        price: 4999,
        regularPrice: 5999,
        discountPercentage: 17,
      },
      {
        id: 'p3',
        name: 'Remote Access Vault · 6 Months',
        durationDays: 180,
        price: 10299,
        regularPrice: 11999,
        discountPercentage: 14,
      },
    ];
    const vaults = [
      catalogRow({ id: 'v1', name: 'Remote Access Vault', description: 'd1' }, plans()),
      catalogRow({ id: 'v2', name: 'UAE & Global Access Vault', description: 'd2' }, [
        {
          id: 'p4',
          name: 'UAE & Global Access Vault · Monthly',
          durationDays: 30,
          price: 1999,
          regularPrice: 2499,
          discountPercentage: 20,
        },
        {
          id: 'p5',
          name: 'UAE & Global Access Vault · 3 Months',
          durationDays: 90,
          price: 5999,
          regularPrice: 7499,
          discountPercentage: 20,
        },
        {
          id: 'p6',
          name: 'UAE & Global Access Vault · 6 Months',
          durationDays: 180,
          price: 11999,
          regularPrice: 14999,
          discountPercentage: 20,
        },
      ]),
      catalogRow({ id: 'v3', name: 'Legacy Vault', description: 'old' }, [plans()[0]]),
    ];

    it('returns only catalog vaults with full pricing per plan', async () => {
      prisma.vault.findMany.mockResolvedValue(vaults);
      const result = await service.getPublicPricing();
      expect(result).toHaveLength(2);
      expect(result[0].vault.name).toBe('Remote Access Vault');
      expect(result[0].plans).toEqual([
        {
          id: 'p1',
          name: 'Remote Access Vault · Monthly',
          price: 1499,
          regularPrice: 1999,
          discountedPrice: 1499,
          discountPercentage: 25,
          currency: 'INR',
          durationDays: 30,
          durationLabel: 'Monthly',
        },
        {
          id: 'p2',
          name: 'Remote Access Vault · 3 Months',
          price: 4999,
          regularPrice: 5999,
          discountedPrice: 4999,
          discountPercentage: 17,
          currency: 'INR',
          durationDays: 90,
          durationLabel: '3 Months',
        },
        {
          id: 'p3',
          name: 'Remote Access Vault · 6 Months',
          price: 10299,
          regularPrice: 11999,
          discountedPrice: 10299,
          discountPercentage: 14,
          currency: 'INR',
          durationDays: 180,
          durationLabel: '6 Months',
        },
      ]);
      expect(result[1].plans[0].regularPrice).toBe(2499);
      expect(result[1].plans[0].discountedPrice).toBe(1999);
    });

    it('excludes vaults with no active plans', async () => {
      prisma.vault.findMany.mockResolvedValue([
        catalogRow({ id: 'v1', name: 'Remote Access Vault', description: '' }, []),
      ]);
      const result = await service.getPublicPricing();
      expect(result).toHaveLength(0);
    });
  });

  describe('purchase', () => {
    const plan = {
      id: 'plan-1',
      name: 'Remote Access Vault · Monthly',
      price: 1499,
      regularPrice: 1999,
      discountPercentage: 25,
      currency: 'INR',
      durationDays: 30,
      vaults: [{ vault: { id: 'v1', name: 'Remote Access Vault' } }],
    };

    it('creates a CREATED payment for the exact server-side price', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue(plan);
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        razorpayOrderId: 'order_abc',
        amount: 1499,
        currency: 'INR',
        status: 'CREATED',
      });

      const result = await service.purchase('user-1', { planId: 'plan-1', vaultId: 'v1' }) as OneTimePurchaseResult;
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            amount: 1499,
            status: 'CREATED',
            metadata: expect.objectContaining({ planId: 'plan-1', vaultId: 'v1' }),
          }),
        }),
      );
      expect(result.amount).toBe(1499);
      expect(result.orderId).toBe('order_abc');
      expect(result.vaultName).toBe('Remote Access Vault');
    });

    it('charges the discounted price, never the regular (list) price', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue(plan);
      prisma.payment.create.mockImplementation(async (args: any) => {
        expect(args.data.amount).toBe(1499);
        expect(args.data.amount).not.toBe(1999);
        expect(args.data.metadata).not.toMatchObject({ regularPrice: expect.anything() });
        return {
          id: 'pay-1',
          razorpayOrderId: 'order_abc',
          amount: args.data.amount,
          currency: 'INR',
          status: 'CREATED',
        };
      });

      const result = await service.purchase('user-1', { planId: 'plan-1' });
      expect(result.amount).toBe(1499);
    });

    it('auto-selects the vault when the plan has exactly one vault and no vaultId given', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue(plan);
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        razorpayOrderId: 'order_abc',
        amount: 1499,
        currency: 'INR',
        status: 'CREATED',
      });
      const result = await service.purchase('user-1', { planId: 'plan-1' });
      expect(result.vaultId).toBe('v1');
    });

    it('throws NotFound for an inactive or archived plan', async () => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue(null);
      await expect(service.purchase('user-1', { planId: 'plan-x' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects a vaultId that does not belong to the plan when the plan has multiple vaults', async () => {
      const multi = {
        ...plan,
        vaults: [
          { vault: { id: 'v1', name: 'Remote Access Vault' } },
          { vault: { id: 'v2', name: 'Other Vault' } },
        ],
      };
      prisma.subscriptionPlan.findFirst.mockResolvedValue(multi);
      await expect(
        service.purchase('user-1', { planId: 'plan-1', vaultId: 'v-other' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmPurchase', () => {
    const payment = {
      id: 'pay-1',
      userId: 'user-1',
      status: 'CREATED',
      amount: 1499,
      currency: 'INR',
      razorpayOrderId: 'order_abc',
      razorpayPaymentId: null,
      webhookEvent: null,
      subscriptionId: null,
      subscription: null,
      metadata: { planId: 'plan-1', vaultId: 'v1', planName: 'Remote Access Vault · Monthly' },
    };
    const subscription = {
      id: 'sub-1',
      plan: {
        id: 'plan-1',
        name: 'Remote Access Vault · Monthly',
        price: 1499,
        currency: 'INR',
        durationDays: 30,
      },
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(),
      createdAt: new Date(),
      cancelledAt: null,
      vaultAccess: [{ vaultId: 'v1', vault: { id: 'v1', name: 'Remote Access Vault' } }],
    };

    it('confirms a CREATED payment and activates the subscription exactly once', async () => {
      prisma.payment.findUnique.mockResolvedValue(payment);
      access.createSubscriptionWithSnapshot.mockResolvedValue(subscription);
      prisma.payment.update.mockResolvedValue({ ...payment, status: 'SUCCESS' });

      const result = await service.confirmPurchase('user-1', { paymentId: 'pay-1' });
      expect(access.createSubscriptionWithSnapshot).toHaveBeenCalledWith(
        'user-1',
        'plan-1',
        expect.objectContaining({ status: 'ACTIVE', paymentReference: 'order_abc' }),
      );
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SUCCESS',
            subscriptionId: 'sub-1',
            webhookEvent: 'payment.confirmed',
          }),
        }),
      );
      expect(result.payment.status).toBe('SUCCESS');
      expect(result.subscription!.vaultAccess).toEqual([
        { vaultId: 'v1', vaultName: 'Remote Access Vault' },
      ]);
    });

    it('is idempotent: does not re-activate for an already-confirmed payment', async () => {
      const confirmed = {
        ...payment,
        status: 'SUCCESS',
        subscriptionId: 'sub-1',
        subscription: null,
      };
      prisma.payment.findUnique.mockResolvedValue(confirmed);
      prisma.subscription.findUnique.mockResolvedValue(subscription);

      const result = await service.confirmPurchase('user-1', { paymentId: 'pay-1' });
      expect(access.createSubscriptionWithSnapshot).not.toHaveBeenCalled();
      expect(result.subscription!.id).toBe('sub-1');
    });

    it('throws NotFound when the payment belongs to another user', async () => {
      prisma.payment.findUnique.mockResolvedValue(payment);
      await expect(service.confirmPurchase('user-2', { paymentId: 'pay-1' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects confirming a failed or refunded payment', async () => {
      prisma.payment.findUnique.mockResolvedValue({ ...payment, status: 'FAILED' });
      await expect(service.confirmPurchase('user-1', { paymentId: 'pay-1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('maps an unavailable plan to ConflictException', async () => {
      prisma.payment.findUnique.mockResolvedValue(payment);
      access.createSubscriptionWithSnapshot.mockRejectedValue(new Error('PLAN_NOT_AVAILABLE'));
      await expect(service.confirmPurchase('user-1', { paymentId: 'pay-1' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getPaymentSession', () => {
    const payment = {
      id: 'pay-1',
      userId: 'user-1',
      status: 'CREATED',
      amount: 1199,
      currency: 'INR',
      razorpayOrderId: 'order_abc',
      metadata: {
        planId: 'plan-1',
        planName: 'Remote Access Vault · Monthly',
        vaultId: 'v1',
        vaultName: 'Remote Access Vault',
        durationDays: 30,
        couponCode: 'SAVE10',
        originalAmount: 1499,
        discountAmount: 300,
      },
    };

    it('returns the server-side breakdown from the frozen payment metadata', async () => {
      prisma.payment.findUnique.mockResolvedValue({ ...payment, subscription: null });
      const result = await service.getPaymentSession('user-1', 'pay-1');
      expect(result).toEqual(
        expect.objectContaining({
          paymentId: 'pay-1',
          orderId: 'order_abc',
          status: 'CREATED',
          amount: 1199,
          currency: 'INR',
          planId: 'plan-1',
          planName: 'Remote Access Vault · Monthly',
          vaultId: 'v1',
          vaultName: 'Remote Access Vault',
          durationDays: 30,
          couponCode: 'SAVE10',
          originalAmount: 1499,
          discountAmount: 300,
          finalAmount: 1199,
          keyId: 'key',
        }),
      );
    });

    it('derives zero discount when the session has no coupon', async () => {
      prisma.payment.findUnique.mockResolvedValue({ ...payment, metadata: { planId: 'plan-1' }, subscription: null });
      const result = await service.getPaymentSession('user-1', 'pay-1');
      expect(result.originalAmount).toBe(1199);
      expect(result.discountAmount).toBe(0);
      expect(result.finalAmount).toBe(1199);
    });

    it('throws NotFound when the payment belongs to another user', async () => {
      prisma.payment.findUnique.mockResolvedValue(payment);
      await expect(service.getPaymentSession('user-2', 'pay-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFound for a missing payment', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.getPaymentSession('user-1', 'pay-x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('failPayment', () => {
    const payment = {
      id: 'pay-1',
      userId: 'user-1',
      status: 'CREATED',
      amount: 1499,
      currency: 'INR',
      razorpayOrderId: 'order_abc',
      metadata: {},
    };

    it('marks an owned CREATED payment as FAILED', async () => {
      prisma.payment.findUnique.mockResolvedValue(payment);
      const result = await service.failPayment('user-1', 'pay-1');
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED', webhookEvent: 'payment.failed' }),
        }),
      );
      expect(result).toEqual({ paymentId: 'pay-1', status: 'FAILED' });
    });

    it('is idempotent for an already-failed payment and does not re-write', async () => {
      prisma.payment.findUnique.mockResolvedValue({ ...payment, status: 'FAILED' });
      const result = await service.failPayment('user-1', 'pay-1');
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(result.status).toBe('FAILED');
    });

    it('throws NotFound when the payment belongs to another user', async () => {
      prisma.payment.findUnique.mockResolvedValue(payment);
      await expect(service.failPayment('user-2', 'pay-1')).rejects.toThrow(NotFoundException);
    });

    it('rejects failing a payment that has already succeeded', async () => {
      prisma.payment.findUnique.mockResolvedValue({ ...payment, status: 'SUCCESS' });
      await expect(service.failPayment('user-1', 'pay-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('purchaseRecurring (AutoPay)', () => {
    const plan = {
      id: 'plan-1',
      name: 'Remote Access Vault · Monthly',
      price: 1499,
      regularPrice: 1999,
      discountPercentage: 25,
      currency: 'INR',
      durationDays: 30,
      razorpayPlanId: 'plan_TrprBHz0jjoi8n',
      vaults: [{ vault: { id: 'v1', name: 'Remote Access Vault' } }],
    };

    const mockRazorpaySubscription = {
      id: 'sub_razorpay_123',
      short_url: 'https://rzp.io/i/test123',
      charge_at: Math.floor(Date.now() / 1000) + 86400,
    };

    beforeEach(() => {
      prisma.subscriptionPlan.findFirst.mockResolvedValue(plan);
      prisma.subscription.findFirst.mockResolvedValue(null); // no existing active recurring
      prisma.subscription.create.mockResolvedValue({
        id: 'sub-local-1',
        userId: 'user-1',
        planId: plan.id,
        status: SubscriptionStatus.PENDING,
        razorpaySubscriptionId: mockRazorpaySubscription.id,
        autoRenew: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000),
      });
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        razorpaySubscriptionId: mockRazorpaySubscription.id,
        amount: plan.price,
        currency: plan.currency,
        status: 'CREATED',
      });
    });

    it('creates a recurring purchase with valid Razorpay plan ID', async () => {
      const razorpayService = {
        createSubscription: jest.fn().mockResolvedValue(mockRazorpaySubscription),
        validateRazorpayPlanId: jest.fn(),
        getKeyId: jest.fn().mockReturnValue('key'),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          PricingService,
          { provide: PrismaService, useValue: prisma },
          { provide: SubscriptionAccessService, useValue: access },
          { provide: CouponsService, useValue: {} },
          { provide: RazorpayService, useValue: razorpayService },
        ],
      }).compile();
      const recurringService = moduleRef.get(PricingService);

      const result = await recurringService.purchase('user-1', { planId: 'plan-1', recurring: true }) as RecurringPurchaseResult;

      expect(razorpayService.validateRazorpayPlanId).toHaveBeenCalledWith('plan_TrprBHz0jjoi8n');
      expect(razorpayService.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          planId: 'plan_TrprBHz0jjoi8n',
          totalCount: 999,
          customerNotify: true,
        }),
      );
      expect(result.recurring).toBe(true);
      expect(result.razorpaySubscriptionId).toBe('sub_razorpay_123');
      expect(result.shortUrl).toBe('https://rzp.io/i/test123');
      expect(result.paymentId).toBe('pay-1');
    });

    it('rejects recurring purchase when plan has no razorpayPlanId', async () => {
      const planWithoutRazorpay = { ...plan, razorpayPlanId: null };
      prisma.subscriptionPlan.findFirst.mockResolvedValue(planWithoutRazorpay);

      const razorpayService = {
        createSubscription: jest.fn(),
        validateRazorpayPlanId: jest.fn(),
        getKeyId: jest.fn().mockReturnValue('key'),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          PricingService,
          { provide: PrismaService, useValue: prisma },
          { provide: SubscriptionAccessService, useValue: access },
          { provide: CouponsService, useValue: {} },
          { provide: RazorpayService, useValue: razorpayService },
        ],
      }).compile();
      const recurringService = moduleRef.get(PricingService);

      await expect(recurringService.purchase('user-1', { planId: 'plan-1', recurring: true })).rejects.toThrow(
        BadRequestException,
      );
      expect(razorpayService.validateRazorpayPlanId).not.toHaveBeenCalled();
    });

    it('rejects recurring purchase for explicitly excluded plan (plan_Trq9hv9Sx7SUb7)', async () => {
      const excludedPlan = { ...plan, razorpayPlanId: 'plan_Trq9hv9Sx7SUb7' };
      prisma.subscriptionPlan.findFirst.mockResolvedValue(excludedPlan);

      const razorpayService = {
        createSubscription: jest.fn(),
        validateRazorpayPlanId: jest.fn(),
        getKeyId: jest.fn().mockReturnValue('key'),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          PricingService,
          { provide: PrismaService, useValue: prisma },
          { provide: SubscriptionAccessService, useValue: access },
          { provide: CouponsService, useValue: {} },
          { provide: RazorpayService, useValue: razorpayService },
        ],
      }).compile();
      const recurringService = moduleRef.get(PricingService);

      await expect(recurringService.purchase('user-1', { planId: 'plan-1', recurring: true })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects recurring purchase for blocked Remote 6-month plan (plan_Trq302lYgONage)', async () => {
      const blockedPlan = { ...plan, razorpayPlanId: 'plan_Trq302lYgONage' };
      prisma.subscriptionPlan.findFirst.mockResolvedValue(blockedPlan);

      const razorpayService = {
        createSubscription: jest.fn(),
        validateRazorpayPlanId: jest.fn(),
        getKeyId: jest.fn().mockReturnValue('key'),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          PricingService,
          { provide: PrismaService, useValue: prisma },
          { provide: SubscriptionAccessService, useValue: access },
          { provide: CouponsService, useValue: {} },
          { provide: RazorpayService, useValue: razorpayService },
        ],
      }).compile();
      const recurringService = moduleRef.get(PricingService);

      await expect(recurringService.purchase('user-1', { planId: 'plan-1', recurring: true })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects recurring purchase when user already has active AutoPay for same plan', async () => {
      prisma.subscription.findFirst.mockResolvedValueOnce(null) // existingActiveRecurring check
        .mockResolvedValueOnce({ id: 'existing-sub', status: SubscriptionStatus.ACTIVE }); // existingActiveSub check

      const razorpayService = {
        createSubscription: jest.fn(),
        validateRazorpayPlanId: jest.fn(),
        getKeyId: jest.fn().mockReturnValue('key'),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          PricingService,
          { provide: PrismaService, useValue: prisma },
          { provide: SubscriptionAccessService, useValue: access },
          { provide: CouponsService, useValue: {} },
          { provide: RazorpayService, useValue: razorpayService },
        ],
      }).compile();
      const recurringService = moduleRef.get(PricingService);

      await expect(recurringService.purchase('user-1', { planId: 'plan-1', recurring: true })).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects coupon code for recurring purchase', async () => {
      const razorpayService = {
        createSubscription: jest.fn(),
        validateRazorpayPlanId: jest.fn(),
        getKeyId: jest.fn().mockReturnValue('key'),
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          PricingService,
          { provide: PrismaService, useValue: prisma },
          { provide: SubscriptionAccessService, useValue: access },
          { provide: CouponsService, useValue: {} },
          { provide: RazorpayService, useValue: razorpayService },
        ],
      }).compile();
      const recurringService = moduleRef.get(PricingService);

      await expect(
        recurringService.purchase('user-1', { planId: 'plan-1', recurring: true, couponCode: 'SAVE10' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
