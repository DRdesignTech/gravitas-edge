import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsQueryDto, DateRange } from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private getDateFilter(dto: AnalyticsQueryDto): { start: Date; end: Date } {
    const now = new Date();
    const end = now;

    switch (dto.range) {
      case DateRange.SEVEN_DAYS: {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        return { start, end };
      }
      case DateRange.NINETY_DAYS: {
        const start = new Date(now);
        start.setDate(start.getDate() - 90);
        return { start, end };
      }
      case DateRange.ONE_YEAR: {
        const start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
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
        return { start, end };
      }
    }
  }

  async overview(dto: AnalyticsQueryDto) {
    const { start, end } = this.getDateFilter(dto);

    const [
      totalUsers,
      newUsers,
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      pendingSubscriptions,
      totalOpportunities,
      publishedOpportunities,
      totalPlans,
      activePlans,
      totalVaults,
      activeVaults,
      totalRevenue,
      monthlyRevenue,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      }),
      this.prisma.subscription.count({ where: {} }),
      this.prisma.subscription.count({
        where: { status: 'ACTIVE', endDate: { gte: new Date() } },
      }),
      this.prisma.subscription.count({ where: { status: 'EXPIRED' } }),
      this.prisma.subscription.count({ where: { status: 'CANCELLED' } }),
      this.prisma.subscription.count({ where: { status: 'PENDING' } }),
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
        where: {
          status: 'SUCCESS',
          createdAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
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
      totalOpportunities,
      publishedOpportunities,
      totalPlans,
      activePlans,
      totalVaults,
      activeVaults,
      totalRevenue: Number(totalRevenue._sum.amount ?? 0),
      monthlyRevenue: Number(monthlyRevenue._sum.amount ?? 0),
    };
  }

  async revenue(dto: AnalyticsQueryDto) {
    const { start, end } = this.getDateFilter(dto);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: start, lte: end },
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const monthlyMap = new Map<string, { revenue: number; count: number }>();
    for (const p of payments) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthlyMap.get(key) ?? { revenue: 0, count: 0 };
      entry.revenue += Number(p.amount);
      entry.count += 1;
      monthlyMap.set(key, entry);
    }

    const timeline = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      paymentCount: data.count,
    }));

    const totalRevenue = await this.prisma.payment.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true },
    });

    const periodRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      totalRevenue: Number(totalRevenue._sum.amount ?? 0),
      periodRevenue,
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

    const results = await Promise.all(
      vaults.map(async (vault) => {
        const [purchases, activeUsers, revenue] = await Promise.all([
          this.prisma.subscriptionVaultAccess.count({
            where: {
              vaultId: vault.id,
              subscription: {
                createdAt: { gte: start, lte: end },
              },
            },
          }),
          this.prisma.subscriptionVaultAccess.count({
            where: {
              vaultId: vault.id,
              subscription: {
                status: 'ACTIVE',
                endDate: { gte: new Date() },
              },
            },
          }),
          this.prisma.payment.aggregate({
            where: {
              status: 'SUCCESS',
              subscription: {
                vaultAccess: { some: { vaultId: vault.id } },
                createdAt: { gte: start, lte: end },
              },
            },
            _sum: { amount: true },
          }),
        ]);

        return {
          id: vault.id,
          name: vault.name,
          type: vault.type,
          status: vault.status,
          purchases,
          activeUsers,
          revenue: Number(revenue._sum.amount ?? 0),
        };
      }),
    );

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
}
