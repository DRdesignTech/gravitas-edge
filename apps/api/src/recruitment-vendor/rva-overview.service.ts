import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RvaPlansService } from './rva-plans.service';
import { RvaFaqsService } from './rva-faqs.service';
import { RvaOpportunitiesService } from './rva-opportunities.service';
import { RECRUITMENT_VENDOR_CATEGORY_LABELS } from './recruitment-vendor.constants';
import { RecruitmentVendorCategory } from '@prisma/client';

/**
 * Aggregated public data for the Recruitment Vendor Access landing page:
 * categories, headline stats, free-preview opportunities, plans and FAQs.
 * Everything is sourced from the database; the page never hardcodes records.
 */
@Injectable()
export class RvaOverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: RvaPlansService,
    private readonly faqs: RvaFaqsService,
    private readonly opportunities: RvaOpportunitiesService,
  ) {}

  async getOverview(userId?: string, previewLimit = 6) {
    const [publishedCount, plans, faqs, preview] = await Promise.all([
      this.prisma.recruitmentVendorOpportunity.count({
        where: { deletedAt: null, status: 'PUBLISHED' },
      }),
      this.plans.listPublicPlans(),
      this.faqs.listPublicFaqs(),
      this.opportunities.listForUser(userId, {
        page: 1,
        limit: previewLimit,
        sortBy: 'publishedDate',
      }),
    ]);

    const categoryCounts = await this.prisma.recruitmentVendorOpportunity.groupBy({
      by: ['category'],
      where: { deletedAt: null, status: 'PUBLISHED' },
      _count: { _all: true },
    });
    const countByCategory = new Map(
      categoryCounts.map((c) => [c.category, c._count._all] as const),
    );

    const categories = (
      Object.keys(RECRUITMENT_VENDOR_CATEGORY_LABELS) as RecruitmentVendorCategory[]
    ).map((value) => ({
      value,
      label: RECRUITMENT_VENDOR_CATEGORY_LABELS[value],
      count: countByCategory.get(value) ?? 0,
    }));

    return {
      vault: 'recruitment-vendor-access',
      publishedOpportunityCount: publishedCount,
      categories,
      previewOpportunities: preview.items,
      previewMeta: preview.meta,
      plans,
      faqs,
    };
  }
}
