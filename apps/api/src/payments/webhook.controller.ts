import { Controller, Post, Req, Res, Header, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { WebhookService } from './webhook.service';
import { RazorpayService } from './razorpay.service';
import { RawBodyRequest } from './webhook.middleware';
import { Public } from '../common/decorators/public.decorator';

@Public()
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly razorpayService: RazorpayService,
  ) {}

  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/json')
  async handleRazorpayWebhook(@Req() req: RawBodyRequest, @Res() res: Response): Promise<void> {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = req.rawBody?.toString('utf8') || '';

    this.logger.log(`Received Razorpay webhook, signature: ${signature ? 'present' : 'missing'}`);

    if (!signature) {
      this.logger.warn('Missing x-razorpay-signature header');
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing signature' });
      return;
    }

    if (!rawBody) {
      this.logger.warn('Missing raw body');
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing raw body' });
      return;
    }

    // Verify webhook signature
    const isValid = this.razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.warn('Invalid webhook signature');
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid signature' });
      return;
    }

    try {
      const event = JSON.parse(rawBody) as any;
      await this.webhookService.handleWebhook(event);
      res.status(HttpStatus.OK).json({ status: 'ok' });
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Webhook processing failed' });
    }
  }
}
