import { Module } from '@nestjs/common';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';

/**
 * User-facing coupon validation. Shared with the purchase flow
 * (SubscriptionsModule) so eligibility rules and discount math live in exactly
 * one place - the backend.
 */
@Module({
  controllers: [CouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
