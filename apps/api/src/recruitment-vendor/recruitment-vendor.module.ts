import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { RvaAccessService } from './rva-access.service';
import { RvaPlansService } from './rva-plans.service';
import { RvaPricingService } from './rva-pricing.service';
import { RvaSubscriptionsService } from './rva-subscriptions.service';
import { RvaEnrollmentService } from './rva-enrollment.service';
import { RvaFaqsService } from './rva-faqs.service';
import { RvaOverviewService } from './rva-overview.service';
import { RvaOpportunitiesService } from './rva-opportunities.service';
import { RvaOpportunitiesController } from './rva-opportunities.controller';
import { RvaPublicController } from './rva-public.controller';

@Module({
  imports: [PaymentsModule],
  controllers: [RvaPublicController, RvaOpportunitiesController],
  providers: [
    RvaAccessService,
    RvaPlansService,
    RvaPricingService,
    RvaSubscriptionsService,
    RvaEnrollmentService,
    RvaFaqsService,
    RvaOverviewService,
    RvaOpportunitiesService,
  ],
  exports: [RvaAccessService],
})
export class RecruitmentVendorModule {}
