import { Module } from '@nestjs/common';
import { SubscriptionAccessService } from './subscription-access.service';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [ReferralsModule],
  providers: [SubscriptionAccessService],
  exports: [SubscriptionAccessService],
})
export class AccessModule {}
