import { Module } from '@nestjs/common';
import { UserSubscriptionsController } from './user-subscriptions.controller';
import { UserSubscriptionsService } from './user-subscriptions.service';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [AccessModule],
  controllers: [UserSubscriptionsController],
  providers: [UserSubscriptionsService],
})
export class SubscriptionsModule {}
