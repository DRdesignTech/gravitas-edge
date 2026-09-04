import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionAccessService } from '../access/subscription-access.service';
import {
  buildPaginationMeta,
  buildPaginationParams,
  PaginatedResult,
} from '../common/pagination/pagination.util';

export interface UserOpportunityQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  country?: string;
  location?: string;
  industry?: string;
  employmentType?: string;
  experienceLevelId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SubscriptionAccessService,
  ) {}

  async listForUser(
    userId: string | undefined,
    query: UserOpportunityQuery,
  ): Promise<PaginatedResult<any>> {
    const params = buildPaginationParams(query.page, query.limit);

    const where: Prisma.OpportunityWhereInput = {
      deletedAt: null,
      status: 'PUBLISHED',
    };

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { company: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.category) where.category = query.category as any;
    if (query.country) where.country = { contains: query.country, mode: 'insensitive' };
    if (query.location) where.location = { contains: query.location, mode: 'insensitive' };
    if (query.industry) where.industry = { contains: query.industry, mode: 'insensitive' };
    if (query.employmentType) where.employmentType = query.employmentType as any;

    if (query.experienceLevelId) {
      where.experienceLevels = { some: { experienceLevelId: query.experienceLevelId } };
    }

    const accessibleVaultIds = userId ? await this.access.getAccessibleVaultIds(userId) : [];

    if (accessibleVaultIds.length > 0) {
      where.OR = [
        { vaults: { none: {} } },
        { vaults: { some: { vaultId: { in: accessibleVaultIds } } } },
      ];
    } else {
      where.vaults = { none: {} };
    }

    const validSortFields = new Set(['createdAt', 'publishedDate', 'title']);
    const sortField = validSortFields.has(query.sortBy ?? '') ? query.sortBy! : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.opportunity.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        skip: params.skip,
        take: params.limit,
        include: {
          experienceLevels: {
            select: {
              experienceLevel: { select: { id: true, name: true, minYears: true, maxYears: true } },
            },
          },
          _count: { select: { vaults: true } },
        },
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    const normalized = items.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      company: o.company,
      location: o.location,
      country: o.country,
      employmentType: o.employmentType,
      industry: o.industry,
      functionalArea: o.functionalArea,
      minExperience: o.minExperience,
      maxExperience: o.maxExperience,
      applicationUrl: o.applicationUrl,
      applicationContact: o.applicationContact,
      source: o.source,
      category: o.category,
      status: o.status,
      publishedDate: o.publishedDate,
      expiryDate: o.expiryDate,
      createdAt: o.createdAt,
      experienceLevels: o.experienceLevels.map((el) => el.experienceLevel),
      isPremium: o._count.vaults > 0,
    }));

    return buildPaginationMeta(normalized, totalItems, params);
  }

  async findOneForUser(id: string, userId?: string) {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id, deletedAt: null, status: 'PUBLISHED' },
      include: {
        vaults: { select: { vault: { select: { id: true, name: true, type: true } } } },
        experienceLevels: {
          select: {
            experienceLevel: { select: { id: true, name: true, minYears: true, maxYears: true } },
          },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    const vaultList = opportunity.vaults.map((v) => v.vault);
    const isPremium = vaultList.length > 0;

    if (isPremium) {
      if (!userId) {
        throw new NotFoundException('Opportunity not found');
      }
      const hasAccess = await this.access.hasVaultAccess(userId, vaultList[0].id);
      if (!hasAccess) {
        throw new NotFoundException('Opportunity not found');
      }
    }

    return {
      id: opportunity.id,
      title: opportunity.title,
      description: opportunity.description,
      company: opportunity.company,
      location: opportunity.location,
      country: opportunity.country,
      employmentType: opportunity.employmentType,
      industry: opportunity.industry,
      functionalArea: opportunity.functionalArea,
      minExperience: opportunity.minExperience,
      maxExperience: opportunity.maxExperience,
      applicationUrl: opportunity.applicationUrl,
      applicationContact: opportunity.applicationContact,
      source: opportunity.source,
      category: opportunity.category,
      status: opportunity.status,
      publishedDate: opportunity.publishedDate,
      expiryDate: opportunity.expiryDate,
      createdAt: opportunity.createdAt,
      experienceLevels: opportunity.experienceLevels.map((el) => el.experienceLevel),
      vaults: vaultList,
      isPremium,
    };
  }
}
