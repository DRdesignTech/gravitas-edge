import { createHmac } from 'crypto';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';

@Injectable()
export class RazorpayService implements OnModuleInit {
  private razorpay: Razorpay;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      console.warn('Razorpay keys not configured');
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  async createOrder(options: {
    amount: number; // INR (converted to paise server-side)
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

  getKeyId(): string {
    return this.configService.get<string>('RAZORPAY_KEY_ID') || '';
  }
}
