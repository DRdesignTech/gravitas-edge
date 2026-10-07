import { Module } from '@nestjs/common';
import { UserSubscriptionsController } from './user-subscriptions.controller';
import { UserSubscriptionsService } from './user-subscriptions.service';
import { PricingService } from './pricing.service';
import { AccessModule } from '../access/access.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [AccessModule, CouponsModule],
  controllers: [UserSubscriptionsController],
  providers: [UserSubscriptionsService, PricingService],
})
export class SubscriptionsModule {}
