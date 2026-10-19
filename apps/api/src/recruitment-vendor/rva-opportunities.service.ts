import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RecruitmentVendorCategory, RecruitmentVendorOpportunity } from '@prisma/client';
import { maskProtectedValue } from '@job-portal/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RvaAccessService } from './rva-access.service';
import {
  buildPaginationMeta,
  buildPaginationParams,
  PaginatedResult,
} from '../common/pagination/pagination.util';
import { RECRUITMENT_VENDOR_CATEGORY_LABELS } from './recruitment-vendor.constants';

export interface RvaOpportunityQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  country?: string;
  location?: string;
  sector?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Masked teaser for the protected last-3 columns (Contact Person,
 * Other Details, How to Apply) plus the supplementary application link. Only
 * server-side masked values are ever sent to callers without an active RVA
 * entitlement.
 */
export interface RvaLockedPreview {
  qualification: string | null;
  otherDetails: string | null;
  howToApply: string | null;
  applicationContact: string | null;
  budget: string | null;
}

/**
 * Public RVA opportunity shape.
 *
 * The first ten source-workbook columns are always present (S. No., Job ID,
 * Date, Opportunity Type, Organisation, Industry, Geography, Vendor
 * Requirement / Scope, Eligibility / Vendor Criteria, Deadline). The final
 * three columns (Contact Person, Other Details, How to Apply) are only returned
 * to callers with a verified active RVA entitlement — everyone else receives a
 * masked `lockedPreview` instead.
 */
export interface RvaOpportunityDto {
  id: string;
  serialNo: number | null;
  jobId: string | null;
  referenceId: string | null;
  title: string;
  role: string | null;
  category: string;
  categoryLabel: string;
  sector: string | null;
  company: string | null;
  organization: string | null;
  location: string | null;
  geography: string | null;
  country: string | null;
  experienceText: string | null;
  minExperience: number | null;
  maxExperience: number | null;
  publishedDate: Date | null;
  expiryDate: Date | null;
  createdAt: Date;
  status: string;
  /**
   * True only on detail responses when the caller holds an active RVA
   * entitlement (protected fields are present). Always `false` in listing
   * responses — the listing never exposes full details to anyone.
   */
  isFullAccess: boolean;
  /** Field 8 — Vendor Requirement / Scope (always visible). */
  requirements: string | null;
  /** Field 9 — Eligibility / Vendor Criteria (always visible). */
  eligibility: string | null;
  /**
   * Supplementary commercial estimate. Always-visible safe teaser (may be
   * masked when locked).
   */
  budget?: string | null;
  /** Only present for entitled callers. */
  qualification?: string | null;
  otherDetails?: string | null;
  description?: string | null;
  howToApply?: string | null;
  applicationUrl?: string | null;
  applicationContact?: string | null;
  source?: string | null;
  lockedPreview?: RvaLockedPreview;
}

@Injectable()
export class RvaOpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: RvaAccessService,
  ) {}

  /**
   * Directory listing of published opportunities.
   *
   * The listing NEVER returns protected fields — not even for callers with an
   * active RVA entitlement. It is a concise browse/search surface; full
   * commercial and contact details are only available from `findOneForUser`.
   * No entitlement lookup is performed here at all.
   */
  async listForUser(query: RvaOpportunityQuery): Promise<PaginatedResult<RvaOpportunityDto>> {
    const params = buildPaginationParams(query.page, query.limit);
    const where = this.buildWhere(query);

    const validSortFields = new Set(['createdAt', 'publishedDate', 'expiryDate', 'title']);
    const sortField = validSortFields.has(query.sortBy ?? '') ? query.sortBy! : 'publishedDate';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.recruitmentVendorOpportunity.findMany({
        where,
        orderBy: [{ [sortField]: sortOrder }, { createdAt: 'desc' }],
        skip: params.skip,
        take: params.limit,
      }),
      this.prisma.recruitmentVendorOpportunity.count({ where }),
    ]);

    const normalized = items.map((o) => this.serialize(o, false));
    return buildPaginationMeta(normalized, totalItems, params);
  }

  async findOneForUser(id: string, userId?: string): Promise<RvaOpportunityDto> {
    const opportunity = await this.prisma.recruitmentVendorOpportunity.findFirst({
      where: { id, deletedAt: null, status: 'PUBLISHED' },
    });
    if (!opportunity) {
      throw new NotFoundException('Recruitment vendor opportunity not found');
    }
    const authorized = (await this.access.requireAccess(userId)).authorized;
    return this.serialize(opportunity, authorized);
  }

  private buildWhere(query: RvaOpportunityQuery): Prisma.RecruitmentVendorOpportunityWhereInput {
    const where: Prisma.RecruitmentVendorOpportunityWhereInput = {
      deletedAt: null,
      status: 'PUBLISHED',
    };

    if (query.search) {
      // Keywords are ANDed; each may match any indexed field so queries like
      // "dubai staffing rfp" work across location, function and category.
      const tokens = query.search.trim().split(/\s+/).filter(Boolean);
      if (tokens.length) {
        where.AND = tokens.map((token) => ({
          OR: [
            { title: { contains: token, mode: 'insensitive' } },
            { role: { contains: token, mode: 'insensitive' } },
            { description: { contains: token, mode: 'insensitive' } },
            { company: { contains: token, mode: 'insensitive' } },
            { organization: { contains: token, mode: 'insensitive' } },
            { location: { contains: token, mode: 'insensitive' } },
            { country: { contains: token, mode: 'insensitive' } },
            { sector: { contains: token, mode: 'insensitive' } },
            { geography: { contains: token, mode: 'insensitive' } },
            { requirements: { contains: token, mode: 'insensitive' } },
            { eligibility: { contains: token, mode: 'insensitive' } },
            { jobId: { contains: token, mode: 'insensitive' } },
            { referenceId: { contains: token, mode: 'insensitive' } },
          ],
        }));
      }
    }

    if (query.category) {
      where.category = query.category as RecruitmentVendorCategory;
    }
    if (query.country) where.country = { contains: query.country, mode: 'insensitive' };
    if (query.location) where.location = { contains: query.location, mode: 'insensitive' };
    if (query.sector) where.sector = { contains: query.sector, mode: 'insensitive' };

    return where;
  }

  /**
   * Serialize a published RVA opportunity. Only non-sensitive summary fields
   * are always returned; protected commercial/contact fields are returned in
   * full only when the caller holds an active RVA entitlement. For callers
   * without access a server-side masked teaser is returned (original values
   * never leave the server).
   */
  private serialize(o: RecruitmentVendorOpportunity, isFullAccess: boolean): RvaOpportunityDto {
    const base: RvaOpportunityDto = {
      id: o.id,
      serialNo: o.serialNo,
      jobId: o.jobId,
      referenceId: o.referenceId,
      title: o.title,
      role: o.role,
      category: o.category,
      categoryLabel: RECRUITMENT_VENDOR_CATEGORY_LABELS[o.category] ?? o.category,
      sector: o.sector,
      company: o.company,
      organization: o.organization,
      location: o.location,
      geography: o.geography,
      country: o.country,
      experienceText: o.experienceText,
      minExperience: o.minExperience,
      maxExperience: o.maxExperience,
      publishedDate: o.publishedDate,
      expiryDate: o.expiryDate,
      createdAt: o.createdAt,
      status: o.status,
      isFullAccess,
      // Fields 8 & 9 are part of the always-visible first ten columns.
      requirements: o.requirements,
      eligibility: o.eligibility,
      budget: isFullAccess ? (o.budget ?? o.commercialValue ?? o.salary) : null,
    };

    if (!isFullAccess) {
      return { ...base, lockedPreview: this.lockedPreview(o) };
    }

    return {
      ...base,
      qualification: o.qualification,
      otherDetails: o.otherDetails,
      description: o.description,
      howToApply: o.howToApply,
      applicationUrl: o.applicationUrl,
      applicationContact: o.applicationContact,
      source: o.source,
    };
  }

  private lockedPreview(o: RecruitmentVendorOpportunity): RvaLockedPreview {
    const howToApply = o.howToApply || o.applicationUrl || o.applicationContact || null;
    return {
      qualification: maskProtectedValue(o.qualification),
      otherDetails: maskProtectedValue(o.otherDetails ?? o.description),
      howToApply: maskProtectedValue(howToApply),
      applicationContact: maskProtectedValue(o.applicationContact),
      budget: maskProtectedValue(o.budget ?? o.commercialValue ?? o.salary),
    };
  }
}
