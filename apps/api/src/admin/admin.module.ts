import { Module } from '@nestjs/common';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { AdminVaultsController } from './vaults/admin-vaults.controller';
import { AdminVaultsService } from './vaults/admin-vaults.service';
import { ExperienceLevelsController } from './experience-levels/experience-levels.controller';
import { ExperienceLevelsService } from './experience-levels/experience-levels.service';
import { SubscriptionPlansController } from './subscription-plans/subscription-plans.controller';
import { SubscriptionPlansService } from './subscription-plans/subscription-plans.service';
import { AdminSubscriptionsController } from './subscriptions/admin-subscriptions.controller';
import { AdminSubscriptionsService } from './subscriptions/admin-subscriptions.service';
import { AdminOpportunitiesController } from './opportunities/admin-opportunities.controller';
import { AdminOpportunitiesService } from './opportunities/admin-opportunities.service';
import { AuditModule } from '../audit/audit.module';
import { AccessModule } from '../access/access.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [AuditModule, AccessModule, AnalyticsModule],
  controllers: [
    AdminUsersController,
    AdminVaultsController,
    ExperienceLevelsController,
    SubscriptionPlansController,
    AdminSubscriptionsController,
    AdminOpportunitiesController,
  ],
  providers: [
    AdminUsersService,
    AdminVaultsService,
    ExperienceLevelsService,
    SubscriptionPlansService,
    AdminSubscriptionsService,
    AdminOpportunitiesService,
  ],
})
export class AdminModule {}
