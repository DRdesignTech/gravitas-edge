import { Injectable } from '@nestjs/common';
import { CommissionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsQueryDto, DateRange } from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
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

  /** Bump the interval of the monthly timeline bucket to match a short range. */
  private timelineGranularity(dto: AnalyticsQueryDto): 'day' | 'month' {
    if (dto.range === DateRange.TODAY || dto.range === DateRange.SEVEN_DAYS) {
      return 'day';
    }
    return 'month';
  }

  async overview(dto: AnalyticsQueryDto) {
    const { start, end } = this.getDateFilter(dto);
    const activeSubsDate = new Date();

    const [
      totalUsers,
      newUsers,
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      pendingSubscriptions,
      failedSubscriptions,
      totalOpportunities,
      publishedOpportunities,
      totalPlans,
      activePlans,
      totalVaults,
      activeVaults,
      totalRevenue,
      periodRevenue,
      refunded,
      referralRegistrations,
      periodReferralRegistrations,
      successfulReferrals,
      pendingReferrals,
      totalCommissions,
      periodCommissions,
      totalResumes,
      periodResumes,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      }),
      this.prisma.subscription.count({ where: {} }),
      this.prisma.subscription.count({
        where: { status: 'ACTIVE', endDate: { gte: activeSubsDate } },
      }),
      this.prisma.subscription.count({ where: { status: 'EXPIRED' } }),
      this.prisma.subscription.count({ where: { status: 'CANCELLED' } }),
      this.prisma.subscription.count({ where: { status: 'PENDING' } }),
      this.prisma.subscription.count({ where: { status: 'FAILED' } }),
      this.prisma.opportunity.count({ where: { deletedAt: null } }),
      this.prisma.opportunity.count({
        where: { deletedAt: null, status: 'PUBLISHED' },
      }),
      this.prisma.subscriptionPlan.count({ where: { deletedAt: null } }),
      this.prisma.subscriptionPlan.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.vault.count({ where: { deletedAt: null } }),
      this.prisma.vault.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCESS', createdAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'REFUNDED' },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.referral.count({ where: { deletedAt: null } }),
      this.prisma.referral.count({
        where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      }),
      this.prisma.referral.count({
        where: { deletedAt: null, status: 'SUCCESSFUL' },
      }),
      this.prisma.referral.count({
        where: { deletedAt: null, status: 'PENDING' },
      }),
      this.prisma.referralCommission.aggregate({
        where: { status: { notIn: ['CANCELLED', 'REJECTED'] } },
        _sum: { commissionAmount: true },
      }),
      this.prisma.referralCommission.aggregate({
        where: {
          status: { notIn: ['CANCELLED', 'REJECTED'] },
          createdAt: { gte: start, lte: end },
        },
        _sum: { commissionAmount: true },
      }),
      this.prisma.resume.count({ where: { deletedAt: null } }),
      this.prisma.resume.count({
        where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      }),
    ]);

    return {
      totalUsers,
      newUsers,
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      pendingSubscriptions,
      failedSubscriptions,
      totalOpportunities,
      publishedOpportunities,
      totalPlans,
      activePlans,
      totalVaults,
      activeVaults,
      grossRevenue: Number(totalRevenue._sum.amount ?? 0),
      monthlyRevenue: Number(periodRevenue._sum.amount ?? 0),
      refundedCount: refunded._count._all,
      refundedAmount: Number(refunded._sum.amount ?? 0),
      referralRegistrations,
      periodReferralRegistrations,
      successfulReferrals,
      pendingReferrals,
      totalCommissions: Number(totalCommissions._sum.commissionAmount ?? 0),
      periodCommissions: Number(periodCommissions._sum.commissionAmount ?? 0),
      totalResumes,
      periodResumes,
    };
  }

  async revenue(dto: AnalyticsQueryDto) {
    const { start, end } = this.getDateFilter(dto);
    const granularity = this.timelineGranularity(dto);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
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

    const [totalRevenue, refunded] = await this.prisma.$transaction([
      this.prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'REFUNDED' },
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);

    const periodRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      totalRevenue: Number(totalRevenue._sum.amount ?? 0),
      periodRevenue,
      refundedCount: refunded._count._all,
      refundedAmount: Number(refunded._sum.amount ?? 0),
      timeline,
    };
  }

  async vaults(dto: AnalyticsQueryDto) {
    const { start, end } = this.getDateFilter(dto);

    const vaults = await this.prisma.vault.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    });

    const [purchasesByVault, activeUsersByVault, payments] = await this.prisma.$transaction([
      // Purchases in period per vault (all subscriptions created in range).
      this.prisma.subscriptionVaultAccess.groupBy({
        by: ['vaultId'],
        where: { subscription: { createdAt: { gte: start, lte: end } } },
        orderBy: { vaultId: 'asc' },
        _count: { _all: true },
      }),
      // Currently active users per vault (subscription status ACTIVE + within validity).
      this.prisma.subscriptionVaultAccess.groupBy({
        by: ['vaultId'],
        orderBy: { vaultId: 'asc' },
        where: {
          subscription: { status: 'ACTIVE', endDate: { gte: new Date() } },
        },
        _count: { _all: true },
      }),
      // Successful payments in period with their vault access, for revenue attribution.
      this.prisma.payment.findMany({
        where: {
          status: 'SUCCESS',
          subscription: {
            createdAt: { gte: start, lte: end },
          },
        },
        select: {
          amount: true,
          subscription: {
            select: {
              vaultAccess: { select: { vaultId: true } },
            },
          },
        },
      }),
    ]);

    const purchasesMap = new Map<string, number>();
    for (const row of purchasesByVault as { vaultId: string; _count: { _all: number } }[]) {
      purchasesMap.set(row.vaultId, row._count._all);
    }
    const activeUsersMap = new Map<string, number>();
    for (const row of activeUsersByVault as { vaultId: string; _count: { _all: number } }[]) {
      activeUsersMap.set(row.vaultId, row._count._all);
    }
    const revenueMap = new Map<string, number>();
    for (const p of payments) {
      const amount = Number(p.amount);
      for (const va of p.subscription?.vaultAccess ?? []) {
        revenueMap.set(va.vaultId, (revenueMap.get(va.vaultId) ?? 0) + amount);
      }
    }

    const results = vaults.map((vault) => ({
      id: vault.id,
      name: vault.name,
      type: vault.type,
      status: vault.status,
      purchases: purchasesMap.get(vault.id) ?? 0,
      activeUsers: activeUsersMap.get(vault.id) ?? 0,
      revenue: revenueMap.get(vault.id) ?? 0,
    }));

    const totalPurchases = results.reduce((s, v) => s + v.purchases, 0);

    return results
      .map((v) => ({
        ...v,
        percentageShare: totalPurchases > 0 ? Math.round((v.purchases / totalPurchases) * 100) : 0,
      }))
      .sort((a, b) => b.purchases - a.purchases);
  }

  async opportunities(dto: AnalyticsQueryDto) {
    const { start, end } = this.getDateFilter(dto);

    const [categoryCounts, employmentTypeCounts, statusCounts, countryCounts, newOpps] =
      await this.prisma.$transaction([
        this.prisma.opportunity.groupBy({
          by: ['category'],
          where: { deletedAt: null },
          _count: { _all: true },
          orderBy: { category: 'asc' },
        }),
        this.prisma.opportunity.groupBy({
          by: ['employmentType'],
          where: { deletedAt: null, employmentType: { not: null } },
          _count: { _all: true },
          orderBy: { employmentType: 'asc' },
        }),
        this.prisma.opportunity.groupBy({
          by: ['status'],
          where: { deletedAt: null },
          _count: { _all: true },
          orderBy: { status: 'asc' },
        }),
        this.prisma.opportunity.groupBy({
          by: ['country'],
          where: { deletedAt: null, country: { not: null } },
          _count: { _all: true },
          orderBy: { country: 'asc' },
          take: 10,
        }),
        this.prisma.opportunity.count({
          where: {
            deletedAt: null,
            createdAt: { gte: start, lte: end },
          },
        }),
      ]);

    const byCategory = (categoryCounts as any[])
      .map((c) => ({ category: c.category, count: c._count._all }))
      .sort((a, b) => b.count - a.count);
    const byEmploymentType = (employmentTypeCounts as any[])
      .map((c) => ({ type: c.employmentType, count: c._count._all }))
      .sort((a, b) => b.count - a.count);
    const byStatus = (statusCounts as any[])
      .map((c) => ({ status: c.status, count: c._count._all }))
      .sort((a, b) => b.count - a.count);
    const byCountry = (countryCounts as any[])
      .map((c) => ({ country: c.country, count: c._count._all }))
      .sort((a, b) => b.count - a.count);

    return {
      byCategory,
      byEmploymentType,
      byStatus,
      byCountry,
      newInPeriod: newOpps,
    };
  }

  async users(dto: AnalyticsQueryDto) {
    const { start, end } = this.getDateFilter(dto);

    const recentUsers = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        profile: { select: { fullName: true } },
        roles: { select: { role: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const recentSubscriptions = await this.prisma.subscription.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        userId: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        plan: { select: { name: true, price: true, currency: true } },
        user: { select: { email: true, profile: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const recentOpportunities = await this.prisma.opportunity.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        title: true,
        company: true,
        category: true,
        status: true,
        location: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const topVaults = await this.prisma.vault.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            subscriptionAccess: {
              where: {
                subscription: {
                  status: 'ACTIVE',
                  endDate: { gte: new Date() },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.profile?.fullName ?? null,
        roles: u.roles.map((r) => r.role.name),
        createdAt: u.createdAt,
      })),
      recentSubscriptions: recentSubscriptions.map((s) => ({
        id: s.id,
        userId: s.userId,
        userName: s.user.profile?.fullName ?? null,
        userEmail: s.user.email,
        planName: s.plan?.name ?? '—',
        status: s.status,
        startDate: s.startDate,
        endDate: s.endDate,
        createdAt: s.createdAt,
      })),
      recentOpportunities: recentOpportunities.map((o) => ({
        id: o.id,
        title: o.title,
        company: o.company,
        category: o.category,
        status: o.status,
        location: o.location,
        createdAt: o.createdAt,
      })),
      topVaults: topVaults.map((v) => ({
        id: v.id,
        name: v.name,
        activeUsers: v._count.subscriptionAccess,
      })),
    };
  }

  /**
   * Real user registration trend bucketed by the range granularity. Fills
   * buckets with zero so the frontend chart is continuous.
   */
  async userTrend(dto: AnalyticsQueryDto) {
    const { start, end } = this.getDateFilter(dto);
    const granularity = this.timelineGranularity(dto);

    const rows = await this.prisma.user.groupBy({
      by: ['createdAt'],
      where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      _count: { _all: true },
      orderBy: { createdAt: 'asc' },
    });

    const daily = new Map<string, number>();
    const monthlyRegistrations = new Map<string, number>();
    if (granularity === 'day') {
      const cur = new Date(start);
      while (cur <= end) {
        const key = this.toBucketKey(cur, 'day');
        daily.set(key, 0);
        cur.setDate(cur.getDate() + 1);
      }
      for (const r of rows) {
        const key = this.toBucketKey(r.createdAt, 'day');
        daily.set(key, (daily.get(key) ?? 0) + r._count._all);
      }
    } else {
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      const last = new Date(end.getFullYear(), end.getMonth(), 1);
      while (cur <= last) {
        const key = this.toBucketKey(cur, 'month');
        monthlyRegistrations.set(key, 0);
        cur.setMonth(cur.getMonth() + 1);
      }
      for (const r of rows) {
        const key = this.toBucketKey(r.createdAt, 'month');
        monthlyRegistrations.set(key, (monthlyRegistrations.get(key) ?? 0) + r._count._all);
      }
    }

    const timeline =
      granularity === 'day'
        ? Array.from(daily.entries()).map(([period, count]) => ({ period, count }))
        : Array.from(monthlyRegistrations.entries()).map(([period, count]) => ({
            period,
            count,
          }));

    const [totalUsers, newUsers] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      }),
    ]);

    return { totalUsers, newUsers, timeline };
  }

  async referrals(dto: AnalyticsQueryDto) {
    const { start, end } = this.getDateFilter(dto);

    const [totalReferrals, periodReferrals, successful, pending, invalid, suspended] =
      await this.prisma.$transaction([
        this.prisma.referral.count({ where: { deletedAt: null } }),
        this.prisma.referral.count({
          where: { deletedAt: null, createdAt: { gte: start, lte: end } },
        }),
        this.prisma.referral.count({ where: { deletedAt: null, status: 'SUCCESSFUL' } }),
        this.prisma.referral.count({ where: { deletedAt: null, status: 'PENDING' } }),
        this.prisma.referral.count({ where: { deletedAt: null, status: 'INVALID' } }),
        this.prisma.referral.count({ where: { deletedAt: null, status: 'SUSPENDED' } }),
      ]);

    const recentReferrals = await this.prisma.referral.findMany({
      where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      select: {
        id: true,
        code: true,
        status: true,
        createdAt: true,
        successfulDate: true,
        referrer: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        referredUser: {
          select: { id: true, email: true, profile: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      totalReferrals,
      periodReferrals,
      byStatus: { successful, pending, invalid, suspended },
      recentReferrals: recentReferrals.map((ref) => ({
        id: ref.id,
        code: ref.code,
        status: ref.status,
        createdAt: ref.createdAt,
        successfulDate: ref.successfulDate,
        referrerName: ref.referrer.profile?.fullName ?? null,
        referrerEmail: ref.referrer.email,
        referredName: ref.referredUser.profile?.fullName ?? null,
        referredEmail: ref.referredUser.email,
      })),
    };
  }

  async commissions(dto: AnalyticsQueryDto) {
    const { start, end } = this.getDateFilter(dto);
    const valid: { status: { notIn: CommissionStatus[] } } = {
      status: { notIn: ['CANCELLED', 'REJECTED'] },
    };

    const [totalAgg, periodAgg, byStatus] = await this.prisma.$transaction([
      this.prisma.referralCommission.aggregate({
        where: valid,
        _sum: { commissionAmount: true },
        _count: { _all: true },
      }),
      this.prisma.referralCommission.aggregate({
        where: { ...valid, createdAt: { gte: start, lte: end } },
        _sum: { commissionAmount: true },
        _count: { _all: true },
      }),
      this.prisma.referralCommission.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        _count: { _all: true },
        _sum: { commissionAmount: true },
      }),
    ]);

    const total = totalAgg as {
      _sum: { commissionAmount: number | null };
      _count: { _all: number };
    };
    const period = periodAgg as {
      _sum: { commissionAmount: number | null };
      _count: { _all: number };
    };

    return {
      totalCommissions: Number(total._sum.commissionAmount ?? 0),
      totalCount: total._count._all,
      periodCommissions: Number(period._sum.commissionAmount ?? 0),
      periodCount: period._count._all,
      byStatus: (byStatus as any[]).map((s) => ({
        status: s.status,
        count: s._count._all,
        amount: Number(s._sum.commissionAmount ?? 0),
      })),
    };
  }

  async resumes(dto: AnalyticsQueryDto) {
    const { start, end } = this.getDateFilter(dto);
    const granularity = this.timelineGranularity(dto);

    const [totalResumes, periodResumes, uploadStatus] = await this.prisma.$transaction([
      this.prisma.resume.count({ where: { deletedAt: null } }),
      this.prisma.resume.count({
        where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      }),
      this.prisma.resume.groupBy({
        by: ['uploadStatus'],
        where: { deletedAt: null },
        orderBy: { uploadStatus: 'asc' },
        _count: { _all: true },
      }),
    ]);

    const rows = await this.prisma.resume.findMany({
      where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const daily = new Map<string, number>();
    if (granularity === 'day') {
      const cur = new Date(start);
      while (cur <= end) {
        daily.set(this.toBucketKey(cur, 'day'), 0);
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      const last = new Date(end.getFullYear(), end.getMonth(), 1);
      while (cur <= last) {
        daily.set(this.toBucketKey(cur, 'month'), 0);
        cur.setMonth(cur.getMonth() + 1);
      }
    }
    for (const r of rows) {
      const key = this.toBucketKey(r.createdAt, granularity);
      daily.set(key, (daily.get(key) ?? 0) + 1);
    }

    return {
      totalResumes,
      periodResumes,
      byUploadStatus: (uploadStatus as any[]).map((s) => ({
        status: s.uploadStatus,
        count: s._count._all,
      })),
      timeline: Array.from(daily.entries()).map(([period, count]) => ({ period, count })),
    };
  }

  private toBucketKey(date: Date, granularity: 'day' | 'month'): string {
    if (granularity === 'day') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`;
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
