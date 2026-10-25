import { createHmac } from 'crypto';
import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';

// Verified LIVE allowed plan IDs (18 plans). Exclude plan_Trq9hv9Sx7SUb7.
const ALLOWED_RAZORPAY_PLAN_IDS = new Set([
  'plan_TrprBHz0jjoi8n', // Remote 1 month
  'plan_Trq1SyQAXY41Dk', // Remote 3 months
  'plan_Trq302lYgONage', // Remote 6 months (interval=1, needs review)
  'plan_Trq640n9rlsErZ', // UAE 1 month
  'plan_Trq6zC40Sdm347', // UAE 3 months
  'plan_Trq7XS96ViOi3g', // UAE 6 months
  'plan_Trq8lO4T22Txyw', // Executive 1 month
  'plan_Trq9Fqut0YQe1C', // Executive 3 months
  'plan_TrqEsP3C3DHM8t', // Executive 6 months
  'plan_TrqAUFY1Nne5YP', // Leadership 1 month
  'plan_TrqAwssJm6Zjpp', // Leadership 3 months
  'plan_TrqBEbMo8Ufv86', // Leadership 6 months
  'plan_TrqBqExlvDgwIr', // Management 1 month
  'plan_TrqC9ToKn1fapD', // Management 3 months
  'plan_TrqCfOxpdwKBgd', // Management 6 months
  'plan_TrqD5vZy7gyIbJ', // Early Career 1 month
  'plan_TrqDMHYOVHBfgK', // Early Career 3 months
  'plan_TrqDf67J70C1Pd', // Early Career 6 months
]);

const EXCLUDED_RAZORPAY_PLAN_IDS = new Set([
  'plan_Trq9hv9Sx7SUb7', // Incorrect plan - explicitly excluded
]);

@Injectable()
export class RazorpayService implements OnModuleInit {
  private razorpay: Razorpay;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      console.warn('Razorpay keys not configured - one-time payments may fail; AutoPay requires keys');
    }

    this.razorpay = new Razorpay({
      key_id: keyId || '',
      key_secret: keySecret || '',
    });
  }

  validateRazorpayPlanId(planId: string): void {
    if (!planId) {
      throw new BadRequestException('Razorpay plan ID is required');
    }
    if (EXCLUDED_RAZORPAY_PLAN_IDS.has(planId)) {
      throw new BadRequestException('This plan is not available for purchase');
    }
    if (!ALLOWED_RAZORPAY_PLAN_IDS.has(planId)) {
      throw new BadRequestException('Plan is not eligible for subscription');
    }
  }

  isPlanAllowed(planId: string): boolean {
    if (EXCLUDED_RAZORPAY_PLAN_IDS.has(planId)) {
      return false;
    }
    return ALLOWED_RAZORPAY_PLAN_IDS.has(planId);
  }

  getAllowedPlanIds(): string[] {
    return Array.from(ALLOWED_RAZORPAY_PLAN_IDS);
  }

  async createOrder(options: {
    amount: number;
    currency?: string;
    receipt: string;
    notes?: any;
  }) {
    const order = await this.razorpay.orders.create({
      amount: Math.round(options.amount * 100),
      currency: options.currency || 'INR',
      receipt: options.receipt,
      notes: options.notes,
    });
    return order;
  }

  async createPlan(options: {
    name: string;
    amount: number;
    currency: string;
    interval: number;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    description?: string;
  }) {
    const plan = await this.razorpay.plans.create({
      item: {
        name: options.name,
        amount: Math.round(options.amount * 100),
        currency: options.currency,
        description: options.description,
      },
      period: options.period,
      interval: options.interval,
    });
    return plan;
  }

  async createSubscription(options: {
    planId: string;
    totalCount: number;
    customerNotify?: boolean;
    quantity?: number;
    startAt?: number;
    expireBy?: number;
    notes?: Record<string, string | number>;
  }) {
    const subscription = await this.razorpay.subscriptions.create({
      plan_id: options.planId,
      total_count: options.totalCount,
      customer_notify: options.customerNotify ?? true,
      quantity: options.quantity ?? 1,
      start_at: options.startAt,
      expire_by: options.expireBy,
      notes: options.notes,
    });
    return subscription;
  }

  async fetchSubscription(subscriptionId: string) {
    return this.razorpay.subscriptions.fetch(subscriptionId);
  }

  async cancelSubscription(subscriptionId: string, cancelAtCycleEnd = false) {
    return this.razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
  }

  async pauseSubscription(subscriptionId: string) {
    return this.razorpay.subscriptions.pause(subscriptionId, { pause_at: 'now' });
  }

  async resumeSubscription(subscriptionId: string) {
    return this.razorpay.subscriptions.resume(subscriptionId, { resume_at: 'now' });
  }

  verifySignature({
    orderId,
    paymentId,
    signature,
  }: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    const body = orderId + '|' + paymentId;
    const expectedSignature = createHmac(
      'sha256',
      this.configService.get<string>('RAZORPAY_KEY_SECRET') || '',
    )
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || '';
    if (!webhookSecret) {
      console.warn('RAZORPAY_WEBHOOK_SECRET not configured');
      return false;
    }
    return validateWebhookSignature(rawBody, signature, webhookSecret);
  }

  getKeyId(): string {
    return this.configService.get<string>('RAZORPAY_KEY_ID') || '';
  }

  getWebhookSecret(): string {
    return this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || '';
  }
}