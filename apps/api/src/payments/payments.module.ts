import { Module } from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [AccessModule],
  controllers: [WebhookController],
  providers: [RazorpayService, WebhookService],
  exports: [RazorpayService, WebhookService],
})
export class PaymentsModule {}
