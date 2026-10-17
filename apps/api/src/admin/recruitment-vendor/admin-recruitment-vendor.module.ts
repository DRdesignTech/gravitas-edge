import { Module } from '@nestjs/common';
import { AuditModule } from '../../audit/audit.module';
import { AdminRvaMetaController } from './admin-rva-meta.controller';
import { AdminRvaOpportunitiesController } from './admin-rva-opportunities.controller';
import { AdminRvaOpportunitiesService } from './admin-rva-opportunities.service';
import { AdminRvaPlansController } from './admin-rva-plans.controller';
import { AdminRvaPlansService } from './admin-rva-plans.service';
import { AdminRvaFaqsController } from './admin-rva-faqs.controller';
import { AdminRvaFaqsService } from './admin-rva-faqs.service';
import { AdminRvaSubscriptionsController } from './admin-rva-subscriptions.controller';
import { AdminRvaSubscriptionsService } from './admin-rva-subscriptions.service';
import { AdminRvaAnalyticsController } from './admin-rva-analytics.controller';
import { AdminRvaAnalyticsService } from './admin-rva-analytics.service';
import { AdminRvaCouponsController } from './admin-rva-coupons.controller';
import { AdminRvaCouponsService } from './admin-rva-coupons.service';

@Module({
  imports: [AuditModule],
  controllers: [
    AdminRvaMetaController,
    AdminRvaOpportunitiesController,
    AdminRvaPlansController,
    AdminRvaFaqsController,
    AdminRvaSubscriptionsController,
    AdminRvaAnalyticsController,
    AdminRvaCouponsController,
  ],
  providers: [
    AdminRvaOpportunitiesService,
    AdminRvaPlansService,
    AdminRvaFaqsService,
    AdminRvaSubscriptionsService,
    AdminRvaAnalyticsService,
    AdminRvaCouponsService,
  ],
})
export class AdminRecruitmentVendorModule {}
