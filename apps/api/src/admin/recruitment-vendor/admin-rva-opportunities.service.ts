import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  RecruitmentVendorOpportunity,
  RecruitmentVendorOpportunityStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  buildPaginationMeta,
  buildPaginationParams,
  PaginatedResult,
} from '../../common/pagination/pagination.util';
import { CreateRvaOpportunityDto } from './dto/create-rva-opportunity.dto';
import { UpdateRvaOpportunityDto } from './dto/update-rva-opportunity.dto';
import { QueryRvaOpportunitiesDto } from './dto/query-rva-opportunities.dto';

const ENTITY = 'RecruitmentVendorOpportunity';

@Injectable()
export class AdminRvaOpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    query: QueryRvaOpportunitiesDto,
  ): Promise<PaginatedResult<RecruitmentVendorOpportunity>> {
    const params = buildPaginationParams(query.page, query.limit);
    const where: Prisma.RecruitmentVendorOpportunityWhereInput = { deletedAt: null };

    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.country) where.country = { contains: query.country, mode: 'insensitive' };
    if (query.location) where.location = { contains: query.location, mode: 'insensitive' };
    if (query.sector) where.sector = { contains: query.sector, mode: 'insensitive' };
    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { role: { contains: term, mode: 'insensitive' } },
        { company: { contains: term, mode: 'insensitive' } },
        { organization: { contains: term, mode: 'insensitive' } },
        { jobId: { contains: term, mode: 'insensitive' } },
        { referenceId: { contains: term, mode: 'insensitive' } },
      ];
    }

    const validSortFields = new Set([
      'createdAt',
      'updatedAt',
      'publishedDate',
      'expiryDate',
      'title',
    ]);
    const sortField = validSortFields.has(query.sortBy ?? '') ? query.sortBy! : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.recruitmentVendorOpportunity.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        skip: params.skip,
        take: params.limit,
        include: { creator: { select: { id: true, email: true } } },
      }),
      this.prisma.recruitmentVendorOpportunity.count({ where }),
    ]);

    return buildPaginationMeta(items, totalItems, params);
  }

  async findOne(id: string) {
    const opportunity = await this.prisma.recruitmentVendorOpportunity.findFirst({
      where: { id, deletedAt: null },
      include: { creator: { select: { id: true, email: true } } },
    });
    if (!opportunity) {
      throw new NotFoundException('Recruitment vendor opportunity not found');
    }
    return opportunity;
  }

  async create(dto: CreateRvaOpportunityDto, adminUserId: string, ipAddress?: string) {
    const opportunity = await this.prisma.recruitmentVendorOpportunity.create({
      data: {
        ...this.toData(dto),
        status: dto.status ?? RecruitmentVendorOpportunityStatus.DRAFT,
        createdBy: adminUserId,
      } as any,
    });
    await this.audit.record({
      adminUserId,
      action: 'CREATE',
      entityType: ENTITY,
      entityId: opportunity.id,
      details: { title: opportunity.title },
      ipAddress,
    });
    return opportunity;
  }

  async update(id: string, dto: UpdateRvaOpportunityDto, adminUserId: string, ipAddress?: string) {
    await this.findOne(id);
    const opportunity = await this.prisma.recruitmentVendorOpportunity.update({
      where: { id },
      data: this.toData(dto),
    });
    await this.audit.record({
      adminUserId,
      action: 'UPDATE',
      entityType: ENTITY,
      entityId: id,
      details: { title: opportunity.title },
      ipAddress,
    });
    return opportunity;
  }

  async remove(id: string, adminUserId: string, ipAddress?: string) {
    await this.findOne(id);
    await this.prisma.recruitmentVendorOpportunity.update({
      where: { id },
      data: { deletedAt: new Date(), status: RecruitmentVendorOpportunityStatus.ARCHIVED },
    });
    await this.audit.record({
      adminUserId,
      action: 'ARCHIVE',
      entityType: ENTITY,
      entityId: id,
      ipAddress,
    });
    return { id, archived: true };
  }

  async hardDelete(id: string, adminUserId: string, ipAddress?: string) {
    await this.findOne(id);
    await this.prisma.recruitmentVendorOpportunity.delete({ where: { id } });
    await this.audit.record({
      adminUserId,
      action: 'DELETE',
      entityType: ENTITY,
      entityId: id,
      ipAddress,
    });
    return { id, deleted: true };
  }

  private toData(dto: CreateRvaOpportunityDto | UpdateRvaOpportunityDto) {
    const data: Prisma.RecruitmentVendorOpportunityUpdateInput = {};
    const assign = <K extends keyof Prisma.RecruitmentVendorOpportunityUpdateInput>(
      key: K,
      value: Prisma.RecruitmentVendorOpportunityUpdateInput[K] | undefined,
    ) => {
      if (value !== undefined) data[key] = value;
    };

    assign('title', dto.title);
    assign('description', dto.description);
    assign('role', dto.role);
    assign('sector', dto.sector);
    assign('category', dto.category);
    assign('company', dto.company);
    assign('organization', dto.organization);
    assign('budget', dto.budget);
    assign('salary', dto.salary);
    assign('commercialValue', dto.commercialValue);
    assign('location', dto.location);
    assign('geography', dto.geography);
    assign('country', dto.country);
    assign('experienceText', dto.experienceText);
    assign('minExperience', dto.minExperience);
    assign('maxExperience', dto.maxExperience);
    assign('eligibility', dto.eligibility);
    assign('qualification', dto.qualification);
    assign('requirements', dto.requirements);
    assign('otherDetails', dto.otherDetails);
    assign('howToApply', dto.howToApply);
    assign('applicationUrl', dto.applicationUrl);
    assign('applicationContact', dto.applicationContact);
    assign('source', dto.source);
    assign('referenceId', dto.referenceId);
    assign('jobId', dto.jobId);
    assign('status', dto.status);
    if (dto.publishedDate !== undefined) {
      assign('publishedDate', dto.publishedDate ? new Date(dto.publishedDate) : null);
    }
    if (dto.expiryDate !== undefined) {
      assign('expiryDate', dto.expiryDate ? new Date(dto.expiryDate) : null);
    }
    return data;
  }
}
