import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RazorpayService } from './razorpay.service';

const mockRazorpayInstance = {
  orders: {
    create: jest.fn(),
  },
  plans: {
    create: jest.fn(),
  },
  subscriptions: {
    create: jest.fn(),
    fetch: jest.fn(),
    cancel: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
  },
};

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => mockRazorpayInstance);
});

jest.mock('razorpay/dist/utils/razorpay-utils', () => ({
  validateWebhookSignature: jest.fn(),
}));

const mockConfigService = {
  get: jest.fn(),
};

describe('RazorpayService', () => {
  let service: RazorpayService;
  let mockValidateWebhookSignature: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_key';
      if (key === 'RAZORPAY_KEY_SECRET') return 'test_secret';
      if (key === 'RAZORPAY_WEBHOOK_SECRET') return 'whsec_test';
      return undefined;
    });

    const module = await Test.createTestingModule({
      providers: [
        RazorpayService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(RazorpayService);
    // Initialize the Razorpay instance
    await service.onModuleInit();
    mockValidateWebhookSignature = require('razorpay/dist/utils/razorpay-utils').validateWebhookSignature;
  });

  describe('verifySignature', () => {
    it('returns true for valid signature', () => {
      const orderId = 'order_123';
      const paymentId = 'pay_123';
      const secret = 'test_secret';
      
      const crypto = require('crypto');
      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

      const result = service.verifySignature({ orderId, paymentId, signature: expectedSignature });
      expect(result).toBe(true);
    });

    it('returns false for invalid signature', () => {
      const result = service.verifySignature({
        orderId: 'order_123',
        paymentId: 'pay_123',
        signature: 'invalid_signature',
      });
      expect(result).toBe(false);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('returns true when validateWebhookSignature returns true', () => {
      mockValidateWebhookSignature.mockReturnValue(true);
      
      const result = service.verifyWebhookSignature('{"event":"test"}', 'valid_signature');
      expect(result).toBe(true);
      expect(mockValidateWebhookSignature).toHaveBeenCalledWith('{"event":"test"}', 'valid_signature', 'whsec_test');
    });

    it('returns false when validateWebhookSignature returns false', () => {
      mockValidateWebhookSignature.mockReturnValue(false);
      
      const result = service.verifyWebhookSignature('{"event":"test"}', 'invalid_signature');
      expect(result).toBe(false);
    });

    it('returns false and warns when webhook secret is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'RAZORPAY_WEBHOOK_SECRET') return '';
        return 'test_value';
      });
      
      const module = await Test.createTestingModule({
        providers: [
          RazorpayService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      
      const newService = module.get(RazorpayService);
      const result = newService.verifyWebhookSignature('{"event":"test"}', 'signature');
      expect(result).toBe(false);
    });
  });

  describe('createOrder', () => {
    it('creates order with correct parameters', async () => {
      mockRazorpayInstance.orders.create.mockResolvedValue({ id: 'order_123' });
      
      const result = await service.createOrder({
        amount: 1499,
        currency: 'INR',
        receipt: 'receipt_123',
        notes: { planId: 'plan_1' },
      });
      
      expect(mockRazorpayInstance.orders.create).toHaveBeenCalledWith({
        amount: 149900,
        currency: 'INR',
        receipt: 'receipt_123',
        notes: { planId: 'plan_1' },
      });
      expect(result.id).toBe('order_123');
    });
  });

  describe('createPlan', () => {
    it('creates plan with correct parameters', async () => {
      mockRazorpayInstance.plans.create.mockResolvedValue({ id: 'plan_123' });
      
      const result = await service.createPlan({
        name: 'Test Plan',
        amount: 1499,
        currency: 'INR',
        interval: 1,
        period: 'monthly',
        description: 'Test description',
      });
      
      expect(mockRazorpayInstance.plans.create).toHaveBeenCalledWith({
        item: {
          name: 'Test Plan',
          amount: 149900,
          currency: 'INR',
          description: 'Test description',
        },
        period: 'monthly',
        interval: 1,
      });
      expect(result.id).toBe('plan_123');
    });
  });

  describe('createSubscription', () => {
    it('creates subscription with correct parameters', async () => {
      mockRazorpayInstance.subscriptions.create.mockResolvedValue({ 
        id: 'sub_123',
        short_url: 'https://rzp.io/i/test',
        charge_at: Math.floor(Date.now() / 1000) + 86400,
      });
      
      const result = await service.createSubscription({
        planId: 'plan_123',
        totalCount: 0,
        customerNotify: true,
        notes: { userId: 'user_1' },
      });
      
      expect(mockRazorpayInstance.subscriptions.create).toHaveBeenCalledWith({
        plan_id: 'plan_123',
        total_count: 0,
        customer_notify: true,
        quantity: 1,
        notes: { userId: 'user_1' },
      });
      expect(result.id).toBe('sub_123');
    });
  });

  describe('fetchSubscription', () => {
    it('fetches subscription by id', async () => {
      mockRazorpayInstance.subscriptions.fetch.mockResolvedValue({ id: 'sub_123' });
      
      const result = await service.fetchSubscription('sub_123');
      expect(mockRazorpayInstance.subscriptions.fetch).toHaveBeenCalledWith('sub_123');
      expect(result.id).toBe('sub_123');
    });
  });

  describe('cancelSubscription', () => {
    it('cancels subscription', async () => {
      mockRazorpayInstance.subscriptions.cancel.mockResolvedValue({ id: 'sub_123', status: 'cancelled' });
      
      const result = await service.cancelSubscription('sub_123', false);
      expect(mockRazorpayInstance.subscriptions.cancel).toHaveBeenCalledWith('sub_123', false);
      expect(result.status).toBe('cancelled');
    });
  });

  describe('pauseSubscription', () => {
    it('pauses subscription', async () => {
      mockRazorpayInstance.subscriptions.pause.mockResolvedValue({ id: 'sub_123', status: 'halted' });
      
      const result = await service.pauseSubscription('sub_123');
      expect(mockRazorpayInstance.subscriptions.pause).toHaveBeenCalledWith('sub_123', { pause_at: 'now' });
      expect(result.status).toBe('halted');
    });
  });

  describe('resumeSubscription', () => {
    it('resumes subscription', async () => {
      mockRazorpayInstance.subscriptions.resume.mockResolvedValue({ id: 'sub_123', status: 'active' });
      
      const result = await service.resumeSubscription('sub_123');
      expect(mockRazorpayInstance.subscriptions.resume).toHaveBeenCalledWith('sub_123', { resume_at: 'now' });
      expect(result.status).toBe('active');
    });
  });

  describe('getKeyId', () => {
    it('returns key id from config', () => {
      expect(service.getKeyId()).toBe('rzp_test_key');
    });
  });
});