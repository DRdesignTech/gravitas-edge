import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OpportunityCategory, OpportunityStatus, Prisma } from '@prisma/client';
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
import {
  isBlankRow,
  parseCsvRows,
  parseDateCell,
  parseExperience,
  parseSheetRows,
  ParsedRow,
  selectSheetName,
} from './opportunity-import.util';

const IMPORT_LIMIT = 500;
const BATCH_SIZE = 50;

const STATUS_VALUES = ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'EXPIRED'] as const;
const CATEGORY_VALUES = ['INDIA', 'GLOBAL', 'MIDDLE_EAST', 'INTERNATIONAL', 'OTHER'] as const;
const EMPLOYMENT_TYPE_VALUES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'FREELANCE',
  'REMOTE',
  'HYBRID',
  'OTHER',
] as const;

type ImportClassification = 'VALID' | 'INVALID' | 'DUPLICATE' | 'SKIPPED';

interface ImportAnalysisRow {
  excelRow: number;
  classification: ImportClassification;
  title?: string | null;
  reason?: string;
  data?: Prisma.OpportunityCreateInput;
  dataPreview?: Record<string, unknown> | null;
}

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

    if (query.vaultId) {
      where.vaults = { some: { vaultId: query.vaultId } };
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
    if (!dto.vaultIds?.length) {
      throw new BadRequestException('At least one vault assignment is required');
    }

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
      salary: dto.salary ?? null,
      experienceText: dto.experienceText ?? null,
      externalRef: dto.externalRef ?? null,
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
    if (dto.salary !== undefined) data.salary = dto.salary;
    if (dto.experienceText !== undefined) data.experienceText = dto.experienceText;
    if (dto.externalRef !== undefined) data.externalRef = dto.externalRef;
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
    vaultId: string,
    adminUserId: string,
    ipAddress?: string,
    defaultStatus: OpportunityStatus = 'PUBLISHED',
  ): Promise<{
    imported: number;
    failed: number;
    skipped: number;
    errors: Array<{ row: number; title?: string; error: string }>;
  }> {
    if (!file) {
      throw new BadRequestException('A file is required');
    }
    const vault = await this.resolveVault(vaultId);
    const effectiveStatus = (this.parseEnum(defaultStatus, STATUS_VALUES, 'PUBLISHED') ??
      'PUBLISHED') as OpportunityStatus;
    const analysis = await this.analyze(file, vault, adminUserId, effectiveStatus);

    const results = {
      imported: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; title?: string; error: string }>,
    };

    for (const row of analysis.rows) {
      if (row.classification === 'INVALID' || row.classification === 'DUPLICATE') {
        results.failed++;
        results.errors.push({
          row: row.excelRow,
          title: row.title ?? undefined,
          error: row.reason ?? 'Invalid row',
        });
      }
    }
    results.skipped = analysis.rows.filter((r) => r.classification === 'SKIPPED').length;

    const validRows = analysis.rows.filter((r) => r.classification === 'VALID');
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      const batchResults = await this.importBatch(batch, vault);
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
        vaultId,
        vaultName: vault.name,
        sheetName: analysis.sheetName,
        totalRows: analysis.rows.length,
        imported: results.imported,
        failed: results.failed,
        skipped: results.skipped,
      } as Prisma.InputJsonObject,
    });

    return results;
  }

  async previewImport(
    file: Express.Multer.File,
    vaultId: string,
    adminUserId: string,
    defaultStatus: OpportunityStatus = 'PUBLISHED',
  ) {
    if (!file) {
      throw new BadRequestException('A file is required');
    }
    const vault = await this.resolveVault(vaultId);
    const effectiveStatus = (this.parseEnum(defaultStatus, STATUS_VALUES, 'PUBLISHED') ??
      'PUBLISHED') as OpportunityStatus;
    const analysis = await this.analyze(file, vault, adminUserId, effectiveStatus);

    return {
      vault: { id: vault.id, name: vault.name, type: vault.type },
      sheetName: analysis.sheetName,
      summary: analysis.summary,
      rows: analysis.rows.map((row) => ({
        excelRow: row.excelRow,
        classification: row.classification,
        title: row.title ?? null,
        reason: row.reason ?? null,
        fields: row.dataPreview ?? null,
      })),
    };
  }

  private async analyze(
    file: Express.Multer.File,
    vault: { id: string; name: string; type: string },
    adminUserId: string,
    defaultStatus: OpportunityStatus,
  ): Promise<{
    sheetName: string;
    rows: ImportAnalysisRow[];
    summary: { total: number; valid: number; invalid: number; duplicate: number; skipped: number };
  }> {
    const { sheetName, rows } = await this.parseRows(file, vault.name);
    const meaningfulRows = rows.filter((row) => !isBlankRow(row));
    if (meaningfulRows.length === 0) {
      throw new BadRequestException('No rows found in the file');
    }
    if (meaningfulRows.length > IMPORT_LIMIT) {
      throw new BadRequestException(
        `Import limited to ${IMPORT_LIMIT} rows per file (${meaningfulRows.length} non-empty rows detected)`,
      );
    }

    const existing = await this.prisma.opportunity.findMany({
      where: { deletedAt: null, vaults: { some: { vaultId: vault.id } } },
      select: { title: true, externalRef: true },
    });
    const existingTitles = new Set(existing.map((o) => o.title.trim().toLowerCase()));
    const existingRefs = new Set(
      existing
        .map((o) => o.externalRef?.trim().toLowerCase())
        .filter((v): v is string => Boolean(v)),
    );

    const seenTitles = new Set<string>();
    const seenRefs = new Set<string>();
    const analyzed: ImportAnalysisRow[] = [];

    for (const row of meaningfulRows) {
      if (row.removalNote) {
        analyzed.push({
          excelRow: row.excelRow,
          classification: 'SKIPPED',
          title: row.fields.title?.trim() || null,
          reason: 'Marked for removal from vault (skipped; client removed this opportunity)',
        });
        continue;
      }

      if (isBlankRow(row)) {
        analyzed.push({
          excelRow: row.excelRow,
          classification: 'SKIPPED',
          title: null,
          reason: 'Empty row',
        });
        continue;
      }

      const title = row.fields.title?.trim();
      if (!title) {
        analyzed.push({
          excelRow: row.excelRow,
          classification: 'INVALID',
          title: null,
          reason: 'Missing required field: title',
        });
        continue;
      }

      const duplicateReason = this.detectDuplicate(
        title,
        row.fields.externalRef,
        seenTitles,
        seenRefs,
        existingTitles,
        existingRefs,
      );
      if (duplicateReason) {
        analyzed.push({
          excelRow: row.excelRow,
          classification: 'DUPLICATE',
          title,
          reason: duplicateReason,
        });
        continue;
      }

      const built = this.buildOpportunityFields(row, vault, adminUserId, defaultStatus);
      if (built.error) {
        analyzed.push({
          excelRow: row.excelRow,
          classification: 'INVALID',
          title,
          reason: built.error,
        });
        continue;
      }

      analyzed.push({
        excelRow: row.excelRow,
        classification: 'VALID',
        title,
        data: built.data,
        dataPreview: built.preview,
      });
    }

    const summary = {
      total: analyzed.length,
      valid: analyzed.filter((r) => r.classification === 'VALID').length,
      invalid: analyzed.filter((r) => r.classification === 'INVALID').length,
      duplicate: analyzed.filter((r) => r.classification === 'DUPLICATE').length,
      skipped: analyzed.filter((r) => r.classification === 'SKIPPED').length,
    };

    return { sheetName, rows: analyzed, summary };
  }

  private detectDuplicate(
    title: string,
    externalRef: string | null,
    seenTitles: Set<string>,
    seenRefs: Set<string>,
    existingTitles: Set<string>,
    existingRefs: Set<string>,
  ): string | null {
    const titleKey = title.trim().toLowerCase();
    if (seenTitles.has(titleKey)) return 'Duplicate title within file';
    if (existingTitles.has(titleKey)) return 'Duplicate title already exists in vault';
    if (externalRef) {
      const refKey = externalRef.trim().toLowerCase();
      if (seenRefs.has(refKey)) return 'Duplicate S. No. within file';
      if (existingRefs.has(refKey)) return 'Duplicate S. No. already exists in vault';
    }
    seenTitles.add(titleKey);
    if (externalRef) seenRefs.add(externalRef.trim().toLowerCase());
    return null;
  }

  private buildOpportunityFields(
    row: ParsedRow,
    vault: { id: string; name: string; type: string },
    adminUserId: string,
    defaultStatus: OpportunityStatus,
  ): { data?: Prisma.OpportunityCreateInput; preview?: Record<string, unknown>; error?: string } {
    const fields = row.fields;

    const status = (this.parseEnum(fields.status, STATUS_VALUES, defaultStatus) ??
      defaultStatus) as OpportunityStatus;

    let category: OpportunityCategory = vault.type as OpportunityCategory;
    if (fields.category) {
      const parsedCategory = this.parseEnum(fields.category, CATEGORY_VALUES, undefined);
      if (parsedCategory) category = parsedCategory as OpportunityCategory;
    }

    const employmentType = fields.employmentType
      ? this.parseEnum(fields.employmentType, EMPLOYMENT_TYPE_VALUES, undefined)
      : undefined;

    const parsedDate = parseDateCell(fields.date);
    if (parsedDate.error) {
      return { error: parsedDate.error };
    }

    const salary = fields.salary?.trim() || null;
    const experienceText = fields.experienceText?.trim() || null;
    const externalRef = fields.externalRef?.trim() || null;

    const { minExperience, maxExperience } = parseExperience(experienceText);
    const minExpFromCol = this.toIntOrNull(fields.minExperience);
    const maxExpFromCol = this.toIntOrNull(fields.maxExperience);

    const expiry = fields.expiryDate
      ? parseDateCell(fields.expiryDate)
      : { date: null, error: null };
    if (expiry.error) {
      return { error: expiry.error };
    }

    const data: Prisma.OpportunityCreateInput = {
      title: fields.title!.trim(),
      description: fields.description?.trim() || null,
      company: fields.company?.trim() || null,
      location: fields.location?.trim() || null,
      country: fields.country?.trim() || null,
      employmentType: employmentType ?? null,
      industry: fields.industry?.trim() || null,
      functionalArea: fields.functionalArea?.trim() || null,
      minExperience: minExperience ?? minExpFromCol,
      maxExperience: maxExperience ?? maxExpFromCol,
      applicationUrl: fields.applicationUrl?.trim() || null,
      applicationContact: fields.applicationContact?.trim() || null,
      source: fields.source?.trim() || null,
      salary,
      experienceText,
      externalRef,
      category,
      status,
      publishedDate: status === 'PUBLISHED' ? (parsedDate.date ?? new Date()) : null,
      expiryDate: expiry.date,
      creator: { connect: { id: adminUserId } },
      vaults: {
        create: [{ vault: { connect: { id: vault.id } } }],
      },
    };

    const preview: Record<string, unknown> = {
      title: data.title,
      company: data.company,
      location: data.location,
      country: data.country,
      industry: data.industry,
      functionalArea: data.functionalArea,
      employmentType: data.employmentType,
      minExperience: data.minExperience,
      maxExperience: data.maxExperience,
      salary: data.salary,
      experienceText: data.experienceText,
      externalRef: data.externalRef,
      category: data.category,
      status: data.status,
      publishedDate: data.publishedDate,
    };

    return { data, preview };
  }

  private async importBatch(rows: ImportAnalysisRow[], vault: { id: string; name: string }) {
    const results = {
      imported: 0,
      failed: 0,
      errors: [] as Array<{ row: number; title?: string; error: string }>,
    };

    const validRows = rows.filter(
      (r): r is ImportAnalysisRow & { data: Prisma.OpportunityCreateInput } => Boolean(r.data),
    );
    if (validRows.length === 0) return results;

    await this.prisma.$transaction(async (tx) => {
      for (const { excelRow, data } of validRows) {
        try {
          const titleStr = String(data.title);
          const existing = await tx.opportunity.findFirst({
            where: {
              deletedAt: null,
              title: { equals: titleStr, mode: 'insensitive' },
              vaults: { some: { vaultId: vault.id } },
            },
          });
          if (existing) {
            results.errors.push({
              row: excelRow,
              title: titleStr,
              error: 'Duplicate title already exists in vault',
            });
            results.failed++;
            continue;
          }

          await tx.opportunity.create({ data });
          results.imported++;
        } catch (err: any) {
          results.failed++;
          results.errors.push({
            row: excelRow,
            title: String(data.title),
            error: err?.message ?? 'Unknown error',
          });
        }
      }
    });

    return results;
  }

  private async parseRows(
    file: Express.Multer.File,
    vaultName: string,
  ): Promise<{ sheetName: string; rows: ParsedRow[] }> {
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      const rows = await parseCsvRows(file.buffer);
      return { sheetName: '(CSV file)', rows };
    }
    if (ext === 'xlsx' || ext === 'xls') {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = selectSheetName(workbook, vaultName, ext);
      const rows = parseSheetRows(workbook.Sheets[sheetName]);
      return { sheetName, rows };
    }

    throw new BadRequestException('Unsupported file type. Use CSV or Excel (.xlsx/.xls)');
  }

  private async resolveVault(vaultId: string) {
    const vault = await this.prisma.vault.findFirst({
      where: { id: vaultId, deletedAt: null },
      select: { id: true, name: true, type: true },
    });
    if (!vault) {
      throw new BadRequestException('Selected vault not found or archived');
    }
    return vault;
  }

  private toIntOrNull(value: string | null | undefined): number | null {
    if (!value) return null;
    const n = Number.parseInt(value.trim(), 10);
    return Number.isNaN(n) ? null : n;
  }

  private parseEnum<T extends string>(
    value: string | null | undefined,
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
