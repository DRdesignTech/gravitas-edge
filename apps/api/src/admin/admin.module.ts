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
import {
  AdminCommissionsController,
  AdminReferralsController,
  AdminReferralSlabsController,
} from './referrals/admin-referrals.controller';
import { AdminReferralsService } from './referrals/admin-referrals.service';
import { AdminCouponsController } from './coupons/admin-coupons.controller';
import { AdminCouponsService } from './coupons/admin-coupons.service';
import { AdminTestimonialsController } from './testimonials/admin-testimonials.controller';
import { AdminTestimonialsService } from './testimonials/admin-testimonials.service';
import { AdminNewsletterController } from './newsletter/admin-newsletter.controller';
import { AdminNewsletterService } from './newsletter/admin-newsletter.service';
import { AdminResumesModule } from './resumes/admin-resumes.module';
import { AuditModule } from '../audit/audit.module';
import { AccessModule } from '../access/access.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminRecruitmentVendorModule } from './recruitment-vendor/admin-recruitment-vendor.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { ResumesModule } from '../resumes/resumes.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    AuditModule,
    AccessModule,
    AnalyticsModule,
    ReferralsModule,
    AdminRecruitmentVendorModule,
    ResumesModule,
    AdminResumesModule,
    PaymentsModule,
  ],
  controllers: [
    AdminUsersController,
    AdminVaultsController,
    ExperienceLevelsController,
    SubscriptionPlansController,
    AdminSubscriptionsController,
    AdminOpportunitiesController,
    AdminReferralsController,
    AdminCommissionsController,
    AdminReferralSlabsController,
    AdminCouponsController,
    AdminTestimonialsController,
    AdminNewsletterController,
  ],
  providers: [
    AdminUsersService,
    AdminVaultsService,
    ExperienceLevelsService,
    SubscriptionPlansService,
    AdminSubscriptionsService,
    AdminOpportunitiesService,
    AdminReferralsService,
    AdminCouponsService,
    AdminTestimonialsService,
    AdminNewsletterService,
  ],
})
export class AdminModule {}
