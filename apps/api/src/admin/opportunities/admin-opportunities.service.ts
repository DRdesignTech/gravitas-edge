import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  buildPaginationMeta,
  buildPaginationParams,
  PaginatedResult,
} from '../../common/pagination/pagination.util';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { QueryOpportunitiesDto } from './dto/query-opportunities.dto';

@Injectable()
export class AdminOpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: QueryOpportunitiesDto): Promise<PaginatedResult<any>> {
    const params = buildPaginationParams(query.page, query.limit);
    const where: Prisma.OpportunityWhereInput = { deletedAt: null };

    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.country) where.country = { contains: query.country, mode: 'insensitive' };
    if (query.location) where.location = { contains: query.location, mode: 'insensitive' };
    if (query.industry) where.industry = { contains: query.industry, mode: 'insensitive' };
    if (query.employmentType) where.employmentType = query.employmentType;

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { company: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.experienceLevelId) {
      where.experienceLevels = {
        some: { experienceLevelId: query.experienceLevelId },
      };
    }

    if (query.publishedAfter || query.publishedBefore) {
      where.publishedDate = {};
      if (query.publishedAfter) where.publishedDate.gte = new Date(query.publishedAfter);
      if (query.publishedBefore) where.publishedDate.lte = new Date(query.publishedBefore);
    }

    if (query.expiryAfter || query.expiryBefore) {
      where.expiryDate = {};
      if (query.expiryAfter) where.expiryDate.gte = new Date(query.expiryAfter);
      if (query.expiryBefore) where.expiryDate.lte = new Date(query.expiryBefore);
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
          creator: { select: { id: true, email: true } },
          _count: { select: { vaults: true, experienceLevels: true } },
        },
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    const normalized = items.map((o) => ({
      ...o,
      vaults: o.vaults.map((v) => v.vault),
      experienceLevels: o.experienceLevels.map((el) => el.experienceLevel),
    }));

    return buildPaginationMeta(normalized, totalItems, params);
  }

  async findOne(id: string) {
    return this.findOpportunity(id);
  }

  async create(dto: CreateOpportunityDto, adminUserId: string, ipAddress?: string) {
    const data: Prisma.OpportunityCreateInput = {
      title: dto.title,
      description: dto.description ?? null,
      company: dto.company ?? null,
      location: dto.location ?? null,
      country: dto.country ?? null,
      employmentType: dto.employmentType ?? null,
      industry: dto.industry ?? null,
      functionalArea: dto.functionalArea ?? null,
      minExperience: dto.minExperience ?? null,
      maxExperience: dto.maxExperience ?? null,
      applicationUrl: dto.applicationUrl ?? null,
      applicationContact: dto.applicationContact ?? null,
      source: dto.source ?? null,
      category: dto.category,
      status: dto.status ?? 'DRAFT',
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      publishedDate: dto.status === 'PUBLISHED' ? new Date() : null,
      creator: { connect: { id: adminUserId } },
    };

    if (dto.vaultIds?.length) {
      const vaults = await this.prisma.vault.findMany({
        where: { id: { in: dto.vaultIds }, deletedAt: null },
      });
      if (vaults.length !== dto.vaultIds.length) {
        throw new BadRequestException('One or more vault IDs are invalid or archived');
      }
      data.vaults = {
        create: dto.vaultIds.map((vaultId) => ({
          vault: { connect: { id: vaultId } },
        })),
      };
    }

    if (dto.experienceLevelIds?.length) {
      const levels = await this.prisma.experienceLevel.findMany({
        where: { id: { in: dto.experienceLevelIds } },
      });
      if (levels.length !== dto.experienceLevelIds.length) {
        throw new BadRequestException('One or more experience level IDs are invalid');
      }
      data.experienceLevels = {
        create: dto.experienceLevelIds.map((experienceLevelId) => ({
          experienceLevel: { connect: { id: experienceLevelId } },
        })),
      };
    }

    const opportunity = await this.prisma.opportunity.create({
      data,
      include: {
        vaults: { select: { vault: { select: { id: true, name: true, type: true } } } },
        experienceLevels: {
          select: {
            experienceLevel: { select: { id: true, name: true, minYears: true, maxYears: true } },
          },
        },
      },
    });

    await this.audit.record({
      action: 'OPPORTUNITY_CREATED',
      entityType: 'Opportunity',
      entityId: opportunity.id,
      adminUserId,
      ipAddress,
      details: {
        title: opportunity.title,
        category: opportunity.category,
        status: opportunity.status,
        vaultCount: dto.vaultIds?.length ?? 0,
        experienceLevelCount: dto.experienceLevelIds?.length ?? 0,
      },
    });

    return this.normalize(opportunity);
  }

  async update(id: string, dto: UpdateOpportunityDto, adminUserId: string, ipAddress?: string) {
    const existing = await this.findOpportunity(id);

    const data: Prisma.OpportunityUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.company !== undefined) data.company = dto.company;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.employmentType !== undefined) data.employmentType = dto.employmentType;
    if (dto.industry !== undefined) data.industry = dto.industry;
    if (dto.functionalArea !== undefined) data.functionalArea = dto.functionalArea;
    if (dto.minExperience !== undefined) data.minExperience = dto.minExperience;
    if (dto.maxExperience !== undefined) data.maxExperience = dto.maxExperience;
    if (dto.applicationUrl !== undefined) data.applicationUrl = dto.applicationUrl;
    if (dto.applicationContact !== undefined) data.applicationContact = dto.applicationContact;
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.category !== undefined) data.category = dto.category;

    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'PUBLISHED' && existing.publishedDate === null) {
        data.publishedDate = new Date();
      }
    }

    if (dto.expiryDate !== undefined) {
      data.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    }

    if (dto.vaultIds !== undefined) {
      if (dto.vaultIds.length > 0) {
        const vaults = await this.prisma.vault.findMany({
          where: { id: { in: dto.vaultIds }, deletedAt: null },
        });
        if (vaults.length !== dto.vaultIds.length) {
          throw new BadRequestException('One or more vault IDs are invalid or archived');
        }
      }
      await this.prisma.opportunityVault.deleteMany({ where: { opportunityId: id } });
      if (dto.vaultIds.length > 0) {
        await this.prisma.opportunityVault.createMany({
          data: dto.vaultIds.map((vaultId) => ({ opportunityId: id, vaultId })),
        });
      }
    }

    if (dto.experienceLevelIds !== undefined) {
      if (dto.experienceLevelIds.length > 0) {
        const levels = await this.prisma.experienceLevel.findMany({
          where: { id: { in: dto.experienceLevelIds } },
        });
        if (levels.length !== dto.experienceLevelIds.length) {
          throw new BadRequestException('One or more experience level IDs are invalid');
        }
      }
      await this.prisma.opportunityExperienceLevel.deleteMany({
        where: { opportunityId: id },
      });
      if (dto.experienceLevelIds.length > 0) {
        await this.prisma.opportunityExperienceLevel.createMany({
          data: dto.experienceLevelIds.map((experienceLevelId) => ({
            opportunityId: id,
            experienceLevelId,
          })),
        });
      }
    }

    const updated = await this.prisma.opportunity.update({
      where: { id },
      data,
      include: {
        vaults: { select: { vault: { select: { id: true, name: true, type: true } } } },
        experienceLevels: {
          select: {
            experienceLevel: { select: { id: true, name: true, minYears: true, maxYears: true } },
          },
        },
      },
    });

    await this.audit.record({
      action: 'OPPORTUNITY_UPDATED',
      entityType: 'Opportunity',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { changes: dto as unknown as Prisma.InputJsonObject },
    });

    return this.normalize(updated);
  }

  async remove(id: string, adminUserId: string, ipAddress?: string) {
    const opportunity = await this.findOpportunity(id);

    await this.prisma.opportunity.update({
      where: { id },
      data: { status: 'ARCHIVED', deletedAt: new Date() },
    });

    await this.audit.record({
      action: 'OPPORTUNITY_ARCHIVED',
      entityType: 'Opportunity',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { title: opportunity.title, category: opportunity.category },
    });

    return { id, archived: true };
  }

  async import(
    file: Express.Multer.File,
    adminUserId: string,
    ipAddress?: string,
  ): Promise<{
    imported: number;
    failed: number;
    errors: Array<{ row: number; title?: string; error: string }>;
  }> {
    const rows = await this.parseFile(file);
    if (rows.length === 0) {
      throw new BadRequestException('No valid rows found in the file');
    }
    if (rows.length > 500) {
      throw new BadRequestException('Import limited to 500 rows per file');
    }

    const results = {
      imported: 0,
      failed: 0,
      errors: [] as Array<{ row: number; title?: string; error: string }>,
    };

    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const batchResults = await this.importBatch(batch, i + 1, adminUserId);
      results.imported += batchResults.imported;
      results.failed += batchResults.failed;
      results.errors.push(...batchResults.errors);
    }

    await this.audit.record({
      action: 'OPPORTUNITY_IMPORT',
      entityType: 'Opportunity',
      adminUserId,
      ipAddress,
      details: {
        totalRows: rows.length,
        imported: results.imported,
        failed: results.failed,
      } as Prisma.InputJsonObject,
    });

    return results;
  }

  private async importBatch(rows: Record<string, string>[], startRow: number, adminUserId: string) {
    const results = {
      imported: 0,
      failed: 0,
      errors: [] as Array<{ row: number; title?: string; error: string }>,
    };

    const validRows: Array<{ row: number; data: Prisma.OpportunityCreateInput }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = startRow + i;
      const title = row.title?.trim();

      if (!title) {
        results.failed++;
        results.errors.push({ row: rowNum, error: 'Missing required field: title' });
        continue;
      }

      const status = this.parseEnum(
        row.status,
        ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'EXPIRED'],
        'DRAFT',
      );
      const category = this.parseEnum(
        row.category,
        ['INDIA', 'GLOBAL', 'MIDDLE_EAST', 'INTERNATIONAL', 'OTHER'],
        'OTHER',
      );
      const employmentType = row.employment_type
        ? this.parseEnum(
            row.employment_type,
            [
              'FULL_TIME',
              'PART_TIME',
              'CONTRACT',
              'INTERNSHIP',
              'FREELANCE',
              'REMOTE',
              'HYBRID',
              'OTHER',
            ],
            undefined,
          )
        : undefined;

      validRows.push({
        row: rowNum,
        data: {
          title,
          description: row.description?.trim() || null,
          company: row.company?.trim() || null,
          location: row.location?.trim() || null,
          country: row.country?.trim() || null,
          employmentType: employmentType || null,
          industry: row.industry?.trim() || null,
          functionalArea: row.functional_area?.trim() || null,
          minExperience: row.min_experience ? parseInt(row.min_experience, 10) : null,
          maxExperience: row.max_experience ? parseInt(row.max_experience, 10) : null,
          applicationUrl: row.application_url?.trim() || null,
          applicationContact: row.application_contact?.trim() || null,
          source: row.source?.trim() || null,
          category,
          status,
          publishedDate: status === 'PUBLISHED' ? new Date() : null,
          expiryDate: row.expiry_date ? new Date(row.expiry_date) : null,
          creator: { connect: { id: adminUserId } },
        },
      });
    }

    if (validRows.length === 0) return results;

    await this.prisma.$transaction(async (tx) => {
      for (const { row: rowNum, data } of validRows) {
        try {
          const titleStr = String(data.title);
          const existing = await tx.opportunity.findFirst({
            where: { title: titleStr, deletedAt: null },
          });
          if (existing) {
            results.errors.push({
              row: rowNum,
              title: titleStr,
              error: 'Duplicate title (already exists)',
            });
            results.failed++;
            continue;
          }

          await tx.opportunity.create({ data });
          results.imported++;
        } catch (err: any) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            title: String(data.title),
            error: err?.message ?? 'Unknown error',
          });
        }
      }
    });

    return results;
  }

  private async parseFile(file: Express.Multer.File): Promise<Record<string, string>[]> {
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      return this.parseCsv(file.buffer);
    }
    if (ext === 'xlsx' || ext === 'xls') {
      return this.parseExcel(file.buffer);
    }

    throw new BadRequestException('Unsupported file type. Use CSV or Excel (.xlsx/.xls)');
  }

  private async parseCsv(buffer: Buffer): Promise<Record<string, string>[]> {
    const { parse } = await import('csv-parse/sync');
    return parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[];
  }

  private async parseExcel(buffer: Buffer): Promise<Record<string, string>[]> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as Record<string, string>[];
  }

  private parseEnum<T extends string>(
    value: string | undefined,
    allowed: readonly T[],
    fallback: T | undefined,
  ): T | undefined {
    if (!value) return fallback;
    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_') as T;
    return allowed.includes(normalized) ? normalized : fallback;
  }

  private async findOpportunity(id: string) {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id, deletedAt: null },
      include: {
        vaults: { select: { vault: { select: { id: true, name: true, type: true } } } },
        experienceLevels: {
          select: {
            experienceLevel: { select: { id: true, name: true, minYears: true, maxYears: true } },
          },
        },
        creator: { select: { id: true, email: true } },
      },
    });
    if (!opportunity) throw new NotFoundException('Opportunity not found');
    return this.normalize(opportunity);
  }

  private normalize(o: any) {
    return {
      ...o,
      vaults: Array.isArray(o.vaults) ? o.vaults.map((v: any) => v.vault ?? v) : o.vaults,
      experienceLevels: Array.isArray(o.experienceLevels)
        ? o.experienceLevels.map((el: any) => el.experienceLevel ?? el)
        : o.experienceLevels,
    };
  }
}
