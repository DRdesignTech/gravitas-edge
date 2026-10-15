import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginationMeta,
  buildPaginationParams,
  PaginatedResult,
} from '../../common/pagination/pagination.util';
import { QueryRvaSubscriptionsDto } from './dto/query-rva-subscriptions.dto';

/**
 * Admin view of Recruitment Vendor Access subscriptions. Strictly scoped to
 * `RecruitmentVendorSubscription` so RVA enrollment/access is never mixed with
 * Opportunity Vault subscription data.
 */
@Injectable()
export class AdminRvaSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryRvaSubscriptionsDto) {
    const params = buildPaginationParams(query.page, query.limit);
    const where: Prisma.RecruitmentVendorSubscriptionWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.planId) where.planId = query.planId;
    if (query.search) {
      const term = query.search.trim();
      where.user = {
        OR: [
          { email: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    const validSortFields = new Set(['createdAt', 'startDate', 'endDate', 'status']);
    const sortField = validSortFields.has(query.sortBy ?? '') ? query.sortBy! : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.recruitmentVendorSubscription.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        skip: params.skip,
        take: params.limit,
        include: {
          plan: {
            select: { id: true, name: true, durationDays: true, price: true, currency: true },
          },
          user: { select: { id: true, email: true, phone: true } },
        },
      }),
      this.prisma.recruitmentVendorSubscription.count({ where }),
    ]);

    const normalized = items.map((s) => ({
      ...s,
      plan: s.plan
        ? {
            ...s.plan,
            price: Number(s.plan.price),
          }
        : null,
    }));

    return buildPaginationMeta(normalized, totalItems, params) as PaginatedResult<any>;
  }

  async findOne(id: string) {
    const sub = await this.prisma.recruitmentVendorSubscription.findUnique({
      where: { id },
      include: {
        plan: true,
        user: { select: { id: true, email: true, phone: true } },
        payments: {
          select: { id: true, status: true, amount: true, currency: true, createdAt: true },
        },
      },
    });
    if (!sub) {
      throw new NotFoundException('Recruitment vendor subscription not found');
    }
    return {
      ...sub,
      plan: sub.plan ? { ...sub.plan, price: Number(sub.plan.price) } : null,
    };
  }
}
