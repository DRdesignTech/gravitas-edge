import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionAccessService } from '../access/subscription-access.service';
import {
  buildPaginationMeta,
  buildPaginationParams,
  PaginatedResult,
  PaginationParams,
} from '../common/pagination/pagination.util';
import { maskProtectedValue } from '@job-portal/shared';

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
  /** When true, spread results evenly across all vaults (round-robin) instead of a flat sort. */
  balanced?: boolean | string;
}

export interface VaultRef {
  id: string;
  name: string;
  type: string;
}

export interface VaultOpportunityCount {
  vaultId: string;
  vaultName: string;
  vaultType: string;
  count: number;
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
  jobId: string | null;
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
  qualification?: string | null;
  description?: string | null;
  applicationUrl?: string | null;
  applicationContact?: string | null;
  source?: string | null;
  /** Safe masked teaser of the protected fields (7-9) for callers without Vault access. */
  lockedPreview?: LockedPreview;
}

export interface LockedPreview {
  qualification: string | null;
  otherDetails: string | null;
  howToApply: string | null;
  applicationContact: string | null;
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

    if (this.isBalanced(query) && !query.vaultId) {
      return this.listBalancedForUser(userId, query, params);
    }

    const where = this.buildWhere(query);

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

  private buildWhere(query: UserOpportunityQuery): Prisma.OpportunityWhereInput {
    const where: Prisma.OpportunityWhereInput = {
      deletedAt: null,
      status: 'PUBLISHED',
    };

    if (query.search) {
      // Split the query into keywords so a search like "dubai hr 500000" matches
      // opportunities where every keyword appears somewhere across the indexed
      // fields (location, function, salary, company, etc.). Keywords are ANDed
      // together; each keyword may match any one of the searchable fields.
      const tokens = query.search.trim().split(/\s+/).filter(Boolean);
      if (tokens.length) {
        where.AND = tokens.map((token) => ({
          OR: [
            { title: { contains: token, mode: 'insensitive' } },
            { description: { contains: token, mode: 'insensitive' } },
            { company: { contains: token, mode: 'insensitive' } },
            { location: { contains: token, mode: 'insensitive' } },
            { country: { contains: token, mode: 'insensitive' } },
            { industry: { contains: token, mode: 'insensitive' } },
            { functionalArea: { contains: token, mode: 'insensitive' } },
            { salary: { contains: token, mode: 'insensitive' } },
            { experienceText: { contains: token, mode: 'insensitive' } },
            { qualification: { contains: token, mode: 'insensitive' } },
            { jobId: { contains: token, mode: 'insensitive' } },
          ],
        }));
      }
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

    return where;
  }

  private isBalanced(query: UserOpportunityQuery): boolean {
    return query.balanced === true || query.balanced === 'true';
  }

  /**
   * Round-robin list that spreads results across every vault so no single vault
   * dominates the first page. Used by the homepage Free Preview. Filters are
   * honoured, but any leftover slots are filled with remaining jobs.
   */
  private async listBalancedForUser(
    userId: string | undefined,
    query: UserOpportunityQuery,
    params: PaginationParams,
  ): Promise<PaginatedResult<PublicOpportunityDto>> {
    const where = this.buildWhere({ ...query, vaultId: undefined });

    const vaults = await this.prisma.vault.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true },
    });

    const include: Prisma.OpportunityInclude = {
      vaults: { select: { vault: { select: { id: true, name: true, type: true } } } },
      experienceLevels: {
        select: {
          experienceLevel: { select: { id: true, name: true, minYears: true, maxYears: true } },
        },
      },
    };

    const perVault = vaults.length
      ? Math.max(1, Math.ceil(params.limit / vaults.length))
      : params.limit;

    const buckets = await Promise.all(
      vaults.map((vault) =>
        this.prisma.opportunity.findMany({
          where: { ...where, vaults: { some: { vaultId: vault.id } } },
          orderBy: { createdAt: 'desc' },
          take: perVault,
          include,
        }),
      ),
    );

    const picked: any[] = [];
    const seen = new Set<string>();
    const maxDepth = buckets.reduce((max, bucket) => Math.max(max, bucket.length), 0);
    for (let depth = 0; depth < maxDepth && picked.length < params.limit; depth += 1) {
      for (const bucket of buckets) {
        const item = bucket[depth];
        if (!item || seen.has(item.id)) continue;
        seen.add(item.id);
        picked.push(item);
        if (picked.length >= params.limit) break;
      }
    }

    if (picked.length < params.limit) {
      const filler = await this.prisma.opportunity.findMany({
        where: { ...where, id: { notIn: [...seen] } },
        orderBy: { createdAt: 'desc' },
        take: params.limit - picked.length,
        include,
      });
      picked.push(...filler);
    }

    const [accessibleVaultIds, totalItems] = await Promise.all([
      userId ? this.access.getAccessibleVaultIds(userId) : Promise.resolve([]),
      this.prisma.opportunity.count({ where }),
    ]);
    const accessibleVaultIdSet = new Set(accessibleVaultIds);

    const normalized = picked.map((o) => this.serializeOpportunity(o, accessibleVaultIdSet));

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
   * Fields 1-6 (title, industry, company, salary, location, experience) are
   * always returned in full. The protected fields 7-9 (qualification, other
   * details / description, how to apply / application URL + contact) are only
   * returned with their original values when the caller has full access:
   * non-premium jobs always, premium jobs only when an active subscription
   * grants at least one of the job's vaults.
   *
   * For callers WITHOUT access, only a server-side masked `lockedPreview`
   * teaser is returned — the original protected values never leave the server.
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
      jobId: o.jobId ?? null,
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
      return {
        ...base,
        lockedPreview: this.lockedPreview(o),
      };
    }

    return { ...base, ...this.privateFields(o) };
  }

  private lockedPreview(o: any): LockedPreview {
    const howToApply = o.applicationUrl || o.applicationContact || null;
    return {
      qualification: maskProtectedValue(o.qualification),
      otherDetails: maskProtectedValue(o.description),
      howToApply: maskProtectedValue(howToApply),
      applicationContact: maskProtectedValue(o.applicationContact),
    };
  }

  private privateFields(o: any) {
    return {
      qualification: o.qualification,
      description: o.description,
      applicationUrl: o.applicationUrl,
      applicationContact: o.applicationContact,
      source: o.source,
    };
  }

  /**
   * Get published opportunity counts grouped by vault.
   * Used by the Free Preview to show accurate per-vault totals.
   */
  async getVaultOpportunityCounts(): Promise<VaultOpportunityCount[]> {
    const vaults = await this.prisma.vault.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: { id: true, name: true, type: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const counts = await Promise.all(
      vaults.map(async (vault) => {
        const count = await this.prisma.opportunity.count({
          where: {
            deletedAt: null,
            status: 'PUBLISHED',
            vaults: { some: { vaultId: vault.id } },
          },
        });
        return {
          vaultId: vault.id,
          vaultName: vault.name,
          vaultType: vault.type,
          count,
        };
      }),
    );

    return counts;
  }
}
