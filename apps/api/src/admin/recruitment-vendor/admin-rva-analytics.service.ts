import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsQueryDto, DateRange } from '../analytics/dto/analytics-query.dto';

/**
 * Recruitment Vendor Access analytics.
 *
 * Every metric is computed exclusively from RVA tables (RecruitmentVendor*)
 * and RVA-scoped payments, so switching the admin vault switcher to RVA shows
 * RVA numbers only and never mixes Opportunity Vault revenue, subscriptions or
 * opportunity counts.
 */
@Injectable()
export class AdminRvaAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private getDateFilter(dto: AnalyticsQueryDto): { start: Date; end: Date } {
    const now = new Date();
    switch (dto.range) {
      case DateRange.TODAY: {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      case DateRange.SEVEN_DAYS: {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        return { start, end: now };
      }
      case DateRange.NINETY_DAYS: {
        const start = new Date(now);
        start.setDate(start.getDate() - 90);
        return { start, end: now };
      }
      case DateRange.ONE_YEAR: {
        const start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
        return { start, end: now };
      }
      case DateRange.THIS_MONTH: {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
      }
      case DateRange.CUSTOM: {
        const start = dto.startDate ? new Date(dto.startDate) : new Date(now);
        const customEnd = dto.endDate ? new Date(dto.endDate) : now;
        start.setHours(0, 0, 0, 0);
        customEnd.setHours(23, 59, 59, 999);
        return { start, end: customEnd };
      }
      case DateRange.THIRTY_DAYS:
      default: {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        return { start, end: now };
      }
    }
  }

  private timelineGranularity(dto: AnalyticsQueryDto): 'day' | 'month' {
    if (dto.range === DateRange.TODAY || dto.range === DateRange.SEVEN_DAYS) {
      return 'day';
    }
    return 'month';
  }

  async overview(dto: AnalyticsQueryDto) {
    const { start, end } = this.getDateFilter(dto);
    const activeNow = new Date();

    const [
      totalOpportunities,
      publishedOpportunities,
      draftOpportunities,
      archivedOpportunities,
      totalPlans,
      activePlans,
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      pendingSubscriptions,
      failedSubscriptions,
      cancelledSubscriptions,
      totalEnrollments,
      periodEnrollments,
      totalRevenue,
      periodRevenue,
      refunded,
    ] = await this.prisma.$transaction([
      this.prisma.recruitmentVendorOpportunity.count({ where: { deletedAt: null } }),
      this.prisma.recruitmentVendorOpportunity.count({
        where: { deletedAt: null, status: 'PUBLISHED' },
      }),
      this.prisma.recruitmentVendorOpportunity.count({
        where: { deletedAt: null, status: 'DRAFT' },
      }),
      this.prisma.recruitmentVendorOpportunity.count({
        where: { deletedAt: null, status: 'ARCHIVED' },
      }),
      this.prisma.recruitmentVendorPlan.count({ where: { deletedAt: null } }),
      this.prisma.recruitmentVendorPlan.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.recruitmentVendorSubscription.count({ where: {} }),
      this.prisma.recruitmentVendorSubscription.count({
        where: { status: 'ACTIVE', endDate: { gte: activeNow } },
      }),
      this.prisma.recruitmentVendorSubscription.count({ where: { status: 'EXPIRED' } }),
      this.prisma.recruitmentVendorSubscription.count({ where: { status: 'PENDING' } }),
      this.prisma.recruitmentVendorSubscription.count({ where: { status: 'FAILED' } }),
      this.prisma.recruitmentVendorSubscription.count({ where: { status: 'CANCELLED' } }),
      this.prisma.recruitmentVendorEnrollment.count({ where: { deletedAt: null } }),
      this.prisma.recruitmentVendorEnrollment.count({
        where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: 'SUCCESS',
          recruitmentVendorSubscriptionId: { not: null },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: 'SUCCESS',
          recruitmentVendorSubscriptionId: { not: null },
          createdAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: 'REFUNDED',
          recruitmentVendorSubscriptionId: { not: null },
        },
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);

    return {
      vault: 'recruitment-vendor-access',
      totalOpportunities,
      publishedOpportunities,
      draftOpportunities,
      archivedOpportunities,
      totalPlans,
      activePlans,
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      pendingSubscriptions,
      failedSubscriptions,
      cancelledSubscriptions,
      totalEnrollments,
      periodEnrollments,
      grossRevenue: Number(totalRevenue._sum.amount ?? 0),
      periodRevenue: Number(periodRevenue._sum.amount ?? 0),
      refundedCount: refunded._count._all,
      refundedAmount: Number(refunded._sum.amount ?? 0),
    };
  }

  async revenue(dto: AnalyticsQueryDto) {
    const { start, end } = this.getDateFilter(dto);
    const granularity = this.timelineGranularity(dto);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
        recruitmentVendorSubscriptionId: { not: null },
        createdAt: { gte: start, lte: end },
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const bucketMap = new Map<string, { revenue: number; count: number }>();
    for (const p of payments) {
      const key =
        granularity === 'day'
          ? `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}-${String(p.createdAt.getDate()).padStart(2, '0')}`
          : `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const entry = bucketMap.get(key) ?? { revenue: 0, count: 0 };
      entry.revenue += Number(p.amount);
      entry.count += 1;
      bucketMap.set(key, entry);
    }

    const timeline = Array.from(bucketMap.entries()).map(([period, data]) => ({
      period,
      revenue: data.revenue,
      paymentCount: data.count,
    }));

    const [totalRevenue] = await this.prisma.$transaction([
      this.prisma.payment.aggregate({
        where: { status: 'SUCCESS', recruitmentVendorSubscriptionId: { not: null } },
        _sum: { amount: true },
      }),
    ]);

    const periodRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      vault: 'recruitment-vendor-access',
      totalRevenue: Number(totalRevenue._sum.amount ?? 0),
      periodRevenue,
      timeline,
    };
  }

  async opportunities(dto: AnalyticsQueryDto) {
    const { start, end } = this.getDateFilter(dto);

    const [byCategory, byStatus, publishedInPeriod] = await this.prisma.$transaction([
      this.prisma.recruitmentVendorOpportunity.groupBy({
        by: ['category'],
        where: { deletedAt: null },
        _count: { _all: true },
        orderBy: { category: 'asc' } as any,
      }),
      this.prisma.recruitmentVendorOpportunity.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
        orderBy: { status: 'asc' } as any,
      }),
      this.prisma.recruitmentVendorOpportunity.count({
        where: { deletedAt: null, status: 'PUBLISHED', publishedDate: { gte: start, lte: end } },
      }),
    ]);

    return {
      vault: 'recruitment-vendor-access',
      publishedInPeriod,
      byCategory: byCategory.map((c) => ({
        category: c.category,
        count: (c._count as any)?._all ?? 0,
      })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: (s._count as any)?._all ?? 0 })),
    };
  }

  async subscriptions(dto: AnalyticsQueryDto) {
    const { start, end } = this.getDateFilter(dto);

    const [byPlan, byStatus, newInPeriod] = await this.prisma.$transaction([
      this.prisma.recruitmentVendorSubscription.groupBy({
        by: ['planId'],
        _count: { _all: true },
        orderBy: { planId: 'asc' } as any,
      }),
      this.prisma.recruitmentVendorSubscription.groupBy({
        by: ['status'],
        _count: { _all: true },
        orderBy: { status: 'asc' } as any,
      }),
      this.prisma.recruitmentVendorSubscription.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
    ]);

    const planIds = byPlan.map((p) => p.planId);
    const plans = planIds.length
      ? await this.prisma.recruitmentVendorPlan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, name: true, durationDays: true },
        })
      : [];
    const planMap = new Map(plans.map((p) => [p.id, p]));

    return {
      vault: 'recruitment-vendor-access',
      newInPeriod,
      byPlan: byPlan.map((p) => ({
        planId: p.planId,
        planName: planMap.get(p.planId)?.name ?? null,
        durationDays: planMap.get(p.planId)?.durationDays ?? null,
        count: (p._count as any)?._all ?? 0,
      })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: (s._count as any)?._all ?? 0 })),
    };
  }
}
