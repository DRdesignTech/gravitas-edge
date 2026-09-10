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
  vaultId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface VaultRef {
  id: string;
  name: string;
  type: string;
}

export interface PublicOpportunityDto {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  country: string | null;
  employmentType: string | null;
  industry: string | null;
  functionalArea: string | null;
  minExperience: number | null;
  maxExperience: number | null;
  salary: string | null;
  experienceText: string | null;
  category: string;
  status: string;
  publishedDate: Date | null;
  expiryDate: Date | null;
  createdAt: Date;
  experienceLevels: {
    id: string;
    name: string;
    minYears: number;
    maxYears: number | null;
  }[];
  vaults: VaultRef[];
  isPremium: boolean;
  isFullAccess: boolean;
  description?: string | null;
  applicationUrl?: string | null;
  applicationContact?: string | null;
  source?: string | null;
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
  ): Promise<PaginatedResult<PublicOpportunityDto>> {
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
        { location: { contains: term, mode: 'insensitive' } },
        { industry: { contains: term, mode: 'insensitive' } },
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

    if (query.vaultId) {
      where.vaults = { some: { vaultId: query.vaultId } };
    }

    const accessibleVaultIds = userId ? await this.access.getAccessibleVaultIds(userId) : [];
    const accessibleVaultIdSet = new Set(accessibleVaultIds);

    const validSortFields = new Set(['createdAt', 'publishedDate', 'expiryDate', 'title']);
    const sortField = validSortFields.has(query.sortBy ?? '') ? query.sortBy! : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.opportunity.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        skip: params.skip,
        take: params.limit,
        include: {
          vaults: { select: { vault: { select: { id: true, name: true, type: true } } } },
          experienceLevels: {
            select: {
              experienceLevel: { select: { id: true, name: true, minYears: true, maxYears: true } },
            },
          },
        },
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    const normalized = items.map((o) => this.serializeOpportunity(o, accessibleVaultIdSet));

    return buildPaginationMeta(normalized, totalItems, params);
  }

  async findOneForUser(id: string, userId?: string): Promise<PublicOpportunityDto> {
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

    const accessibleVaultIds = userId ? await this.access.getAccessibleVaultIds(userId) : [];
    const accessibleVaultIdSet = new Set(accessibleVaultIds);

    return this.serializeOpportunity(opportunity, accessibleVaultIdSet);
  }

  /**
   * Serialize a published opportunity for the public list and detail endpoints.
   * Basic metadata is always returned (locked premium jobs appear as teasers);
   * full details (description, application/contact) are only included when the
   * caller has full access: non-premium jobs always, premium jobs only when an
   * active subscription grants at least one of the job's vaults.
   */
  private serializeOpportunity(o: any, accessibleVaultIdSet: Set<string>): PublicOpportunityDto {
    const vaults = Array.isArray(o.vaults)
      ? o.vaults.map((v: any) => v.vault ?? v)
      : (o.vaults ?? []);
    const isPremium = vaults.length > 0;
    const isFullAccess = !isPremium || vaults.some((v: any) => accessibleVaultIdSet.has(v.id));

    const base = {
      id: o.id,
      title: o.title,
      company: o.company,
      location: o.location,
      country: o.country,
      employmentType: o.employmentType,
      industry: o.industry,
      functionalArea: o.functionalArea,
      minExperience: o.minExperience,
      maxExperience: o.maxExperience,
      salary: o.salary,
      experienceText: o.experienceText,
      category: o.category,
      status: o.status,
      publishedDate: o.publishedDate,
      expiryDate: o.expiryDate,
      createdAt: o.createdAt,
      experienceLevels: Array.isArray(o.experienceLevels)
        ? o.experienceLevels.map((el: any) => el.experienceLevel ?? el)
        : o.experienceLevels,
      vaults,
      isPremium,
      isFullAccess,
    };

    if (!isFullAccess) {
      return base;
    }

    return { ...base, ...this.privateFields(o) };
  }

  private privateFields(o: any) {
    return {
      description: o.description,
      applicationUrl: o.applicationUrl,
      applicationContact: o.applicationContact,
      source: o.source,
    };
  }
}
