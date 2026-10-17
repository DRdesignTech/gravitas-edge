import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
import { BulkDeleteRvaOpportunitiesDto } from './dto/bulk-delete-rva-opportunities.dto';
import {
  parseDateCell,
  parseExperience,
  ParsedRow,
} from '../opportunities/opportunity-import.util';
import {
  deriveRvaTitle,
  isBlankRvaRow,
  listRvaJobSheets,
  parseRvaCategory,
  parseRvaCsvRows,
  parseRvaSheetRows,
  RvaCategoryValue,
  RVA_STATUS_VALUES,
} from './rva-opportunity-import.util';

const ENTITY = 'RecruitmentVendorOpportunity';

const BATCH_SIZE = 50;

type RvaImportClassification = 'VALID' | 'INVALID' | 'DUPLICATE' | 'SKIPPED';

export interface RvaImportSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicate: number;
  skipped: number;
}

export interface RvaImportAnalysisRow {
  excelRow: number;
  classification: RvaImportClassification;
  title?: string | null;
  reason?: string;
  data?: Prisma.RecruitmentVendorOpportunityUncheckedCreateInput;
  dataPreview?: Record<string, unknown> | null;
}

interface ParsedRvaSheet {
  sheetName: string;
  rows: ParsedRow[];
  matchStatus: 'matched' | 'meta';
  matchReason: string | null;
}

export interface RvaSheetAnalysis {
  sheetName: string;
  state: 'IMPORTED' | 'EMPTY' | 'SKIPPED';
  matchStatus: 'matched' | 'meta';
  category: RvaCategoryValue;
  reason: string | null;
  summary: RvaImportSummary;
  rows: RvaImportAnalysisRow[];
}

@Injectable()
export class AdminRvaOpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private buildWhere(
    query: QueryRvaOpportunitiesDto & {
      publishedAfter?: string;
      publishedBefore?: string;
      expiryAfter?: string;
      expiryBefore?: string;
      createdAfter?: string;
      createdBefore?: string;
    },
  ): Prisma.RecruitmentVendorOpportunityWhereInput {
    const where: Prisma.RecruitmentVendorOpportunityWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category as any;
    if (query.country) where.country = { contains: query.country, mode: 'insensitive' };
    if (query.location) where.location = { contains: query.location, mode: 'insensitive' };
    if (query.sector) where.sector = { contains: query.sector, mode: 'insensitive' };
    if (query.search) {
      const tokens = query.search.trim().split(/\s+/).filter(Boolean);
      if (tokens.length) {
        where.AND = tokens.map((token) => ({
          OR: [
            { title: { contains: token, mode: 'insensitive' } },
            { role: { contains: token, mode: 'insensitive' } },
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
    if (query.createdAfter || query.createdBefore) {
      where.createdAt = {};
      if (query.createdAfter) where.createdAt.gte = new Date(query.createdAfter);
      if (query.createdBefore) where.createdAt.lte = new Date(query.createdBefore);
    }

    return where;
  }

  async list(
    query: QueryRvaOpportunitiesDto,
  ): Promise<PaginatedResult<RecruitmentVendorOpportunity>> {
    const params = buildPaginationParams(query.page, query.limit);
    const where: Prisma.RecruitmentVendorOpportunityWhereInput = {
      ...this.buildWhere(query),
      deletedAt: null,
    };

    const validSortFields = new Set([
      'createdAt',
      'updatedAt',
      'publishedDate',
      'expiryDate',
      'title',
      'serialNo',
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
    const opportunity = await this.createOpportunity({
      ...this.toData(dto),
      status: dto.status ?? RecruitmentVendorOpportunityStatus.DRAFT,
      createdBy: adminUserId,
    } as unknown as Prisma.RecruitmentVendorOpportunityUncheckedCreateInput);
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
    const opportunity = await this.updateOpportunity(id, this.toData(dto));
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
    await this.permanentDelete(id, adminUserId, ipAddress);
    return { id, deleted: true };
  }

  async permanentDelete(id: string, adminUserId: string, ipAddress?: string) {
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
  async bulkDelete(dto: BulkDeleteRvaOpportunitiesDto, adminUserId: string, ipAddress?: string) {
    const ids = dto.ids?.map((id) => id.trim()).filter(Boolean) ?? [];
    const hasFilters = Boolean(
      dto.search ||
      dto.status ||
      dto.category ||
      dto.country ||
      dto.location ||
      dto.sector ||
      dto.publishedAfter ||
      dto.publishedBefore ||
      dto.expiryAfter ||
      dto.expiryBefore ||
      dto.createdAfter ||
      dto.createdBefore,
    );
    if (ids.length === 0 && !hasFilters && dto.confirmAll !== true) {
      throw new BadRequestException(
        'Refusing to delete every RVA opportunity without confirmation (pass confirmAll).',
      );
    }
    const where: Prisma.RecruitmentVendorOpportunityWhereInput =
      ids.length > 0
        ? { id: { in: ids } }
        : { ...this.buildWhere(dto), ...(dto.mode === 'archive' ? { deletedAt: null } : {}) };
    if (dto.mode === 'archive') {
      const result = await this.prisma.recruitmentVendorOpportunity.updateMany({
        where,
        data: { status: RecruitmentVendorOpportunityStatus.ARCHIVED, deletedAt: new Date() },
      });
      await this.audit.record({
        adminUserId,
        action: 'ARCHIVE_BULK',
        entityType: ENTITY,
        ipAddress,
        details: { count: result.count },
      });
      return { mode: 'archive' as const, count: result.count };
    }
    const result = await this.prisma.recruitmentVendorOpportunity.deleteMany({ where });
    await this.audit.record({
      adminUserId,
      action: 'DELETE_BULK',
      entityType: ENTITY,
      ipAddress,
      details: { count: result.count },
    });
    return { mode: 'permanent' as const, count: result.count };
  }

  async import(
    file: Express.Multer.File,
    category: string,
    adminUserId: string,
    ipAddress?: string,
    defaultStatus: string = 'PUBLISHED',
  ): Promise<{
    imported: number;
    failed: number;
    skipped: number;
    errors: Array<{ row: number; title?: string; error: string }>;
    sheets: Array<{
      sheetName: string;
      category: RvaCategoryValue;
      imported: number;
      failed: number;
      skipped: number;
    }>;
  }> {
    if (!file) throw new BadRequestException('A file is required');
    const selectedCategory = this.resolveCategory(category);
    const effectiveStatus = this.parseStatus(defaultStatus, 'PUBLISHED');
    const parsed = await this.parseSheets(file);
    const analyses = await this.analyzeSheets(
      parsed.sheets,
      selectedCategory,
      effectiveStatus,
      adminUserId,
    );

    const importable = analyses.filter((s) => s.state === 'IMPORTED');
    const totalValid = importable.reduce((sum, s) => sum + s.summary.valid, 0);
    if (totalValid === 0) {
      throw new BadRequestException(this.describeNoImportableSheets(parsed.sheets, analyses));
    }

    const results = {
      imported: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; title?: string; error: string }>,
    };
    const sheetResults: Array<{
      sheetName: string;
      category: RvaCategoryValue;
      imported: number;
      failed: number;
      skipped: number;
    }> = [];

    for (const analysis of importable) {
      const sheetResult = {
        sheetName: analysis.sheetName,
        category: analysis.category,
        imported: 0,
        failed: 0,
        skipped: analysis.summary.skipped,
      };

      for (const row of analysis.rows) {
        if (row.classification === 'INVALID' || row.classification === 'DUPLICATE') {
          results.failed++;
          sheetResult.failed++;
          results.errors.push({
            row: row.excelRow,
            title: row.title ?? undefined,
            error: row.reason ?? 'Invalid row',
          });
        }
      }
      results.skipped += analysis.summary.skipped;

      const validRows = analysis.rows.filter((r) => r.classification === 'VALID' && r.data);
      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE);
        const batchResult = await this.importBatch(batch);
        results.imported += batchResult.imported;
        results.failed += batchResult.failed;
        sheetResult.imported += batchResult.imported;
        sheetResult.failed += batchResult.failed;
        results.errors.push(...batchResult.errors);
      }
      sheetResults.push(sheetResult);
    }

    await this.audit.record({
      action: 'RVA_OPPORTUNITY_IMPORT',
      entityType: ENTITY,
      adminUserId,
      ipAddress,
      details: {
        category: selectedCategory,
        sheets: sheetResults,
        totalRows: importable.reduce((sum, s) => sum + s.summary.total, 0),
        imported: results.imported,
        failed: results.failed,
        skipped: results.skipped,
      } as Prisma.InputJsonObject,
    });

    return { ...results, sheets: sheetResults };
  }

  async previewImport(
    file: Express.Multer.File,
    category: string,
    adminUserId: string,
    defaultStatus: string = 'PUBLISHED',
  ) {
    if (!file) throw new BadRequestException('A file is required');
    const selectedCategory = this.resolveCategory(category);
    const effectiveStatus = this.parseStatus(defaultStatus, 'PUBLISHED');
    const parsed = await this.parseSheets(file);
    const analyses = await this.analyzeSheets(
      parsed.sheets,
      selectedCategory,
      effectiveStatus,
      adminUserId,
    );

    return {
      sourceType: parsed.sourceType,
      selectedCategory,
      sheets: analyses.map((sheet) => ({
        sheetName: sheet.sheetName,
        status: sheet.state,
        matchStatus: sheet.matchStatus,
        category: sheet.category,
        reason: sheet.reason,
        summary: sheet.summary,
        rows: sheet.rows.map((row) => ({
          excelRow: row.excelRow,
          classification: row.classification,
          title: row.title ?? null,
          reason: row.reason ?? null,
          fields: row.dataPreview ?? null,
        })),
      })),
      summary: this.aggregateSummary(analyses),
    };
  }

  private async parseSheets(
    file: Express.Multer.File,
  ): Promise<{ sourceType: 'csv' | 'xlsx'; sheets: ParsedRvaSheet[] }> {
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      const rows = await parseRvaCsvRows(file.buffer);
      return {
        sourceType: 'csv',
        sheets: [{ sheetName: '(CSV file)', rows, matchStatus: 'matched', matchReason: null }],
      };
    }
    if (ext === 'xlsx' || ext === 'xls') {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      if (workbook.SheetNames.length === 0) {
        throw new BadRequestException('File contains no sheets');
      }
      const { jobSheets, metaSheets } = listRvaJobSheets(workbook);
      if (jobSheets.length === 0) {
        throw new BadRequestException(
          'No job sheet found in the workbook (a job sheet needs a header row with columns like Title, Company, Location, Salary)',
        );
      }
      const sheets: ParsedRvaSheet[] = [];
      for (const name of jobSheets) {
        sheets.push({
          sheetName: name,
          rows: parseRvaSheetRows(workbook.Sheets[name]),
          matchStatus: 'matched',
          matchReason: null,
        });
      }
      for (const name of metaSheets) {
        sheets.push({
          sheetName: name,
          rows: [],
          matchStatus: 'meta',
          matchReason: `Sheet "${name}" does not contain job data (no job header row found) and will be ignored.`,
        });
      }
      return { sourceType: 'xlsx', sheets };
    }

    throw new BadRequestException('Unsupported file type. Use CSV or Excel (.xlsx/.xls)');
  }

  private async analyzeSheets(
    sheets: ParsedRvaSheet[],
    selectedCategory: RvaCategoryValue,
    defaultStatus: RecruitmentVendorOpportunityStatus,
    adminUserId: string,
  ): Promise<RvaSheetAnalysis[]> {
    const existingJobIds = await this.collectExistingJobIds();
    const seenJobIds = new Set<string>();

    const analyzed: RvaSheetAnalysis[] = [];
    for (const sheet of sheets) {
      if (sheet.matchStatus === 'meta') {
        analyzed.push({
          sheetName: sheet.sheetName,
          state: 'SKIPPED',
          matchStatus: 'meta',
          category: selectedCategory,
          reason: sheet.matchReason ?? 'Sheet does not contain job data.',
          summary: this.emptySummary(),
          rows: [],
        });
        continue;
      }

      const meaningfulRows = sheet.rows.filter((row) => !isBlankRvaRow(row));
      if (meaningfulRows.length === 0) {
        analyzed.push({
          sheetName: sheet.sheetName,
          state: 'EMPTY',
          matchStatus: 'matched',
          category: selectedCategory,
          reason: `No importable rows found in sheet "${sheet.sheetName}".`,
          summary: this.emptySummary(),
          rows: [],
        });
        continue;
      }

      const rows = this.analyzeRows(
        meaningfulRows,
        selectedCategory,
        defaultStatus,
        adminUserId,
        existingJobIds,
        seenJobIds,
      );
      analyzed.push({
        sheetName: sheet.sheetName,
        state: 'IMPORTED',
        matchStatus: 'matched',
        category: selectedCategory,
        reason: null,
        summary: this.buildSummary(rows),
        rows,
      });
    }

    return analyzed;
  }

  private analyzeRows(
    rows: ParsedRow[],
    selectedCategory: RvaCategoryValue,
    defaultStatus: RecruitmentVendorOpportunityStatus,
    adminUserId: string,
    existingJobIds: Set<string>,
    seenJobIds: Set<string>,
  ): RvaImportAnalysisRow[] {
    const analyzed: RvaImportAnalysisRow[] = [];

    for (const row of rows) {
      if (isBlankRvaRow(row)) {
        analyzed.push({
          excelRow: row.excelRow,
          classification: 'SKIPPED',
          title: null,
          reason: 'Empty row',
        });
        continue;
      }

      const title = deriveRvaTitle(row.fields);
      if (!title) {
        analyzed.push({
          excelRow: row.excelRow,
          classification: 'INVALID',
          title: null,
          reason: 'Missing required field: title',
        });
        continue;
      }

      const built = this.buildFields(row, selectedCategory, defaultStatus, adminUserId);
      if (built.error || !built.data) {
        analyzed.push({
          excelRow: row.excelRow,
          classification: 'INVALID',
          title,
          reason: built.error ?? 'Invalid row',
        });
        continue;
      }

      const jobId = built.data.jobId ?? null;
      if (jobId) {
        const normalizedJobId = jobId.trim();
        if (existingJobIds.has(normalizedJobId) || seenJobIds.has(normalizedJobId)) {
          analyzed.push({
            excelRow: row.excelRow,
            classification: 'DUPLICATE',
            title,
            reason: existingJobIds.has(normalizedJobId)
              ? 'Job ID already exists'
              : 'Duplicate Job ID within import file',
          });
          continue;
        }
        seenJobIds.add(normalizedJobId);
      }
      // No Job ID: treat each row as unique (no content-based deduplication per requirements)

      analyzed.push({
        excelRow: row.excelRow,
        classification: 'VALID',
        title,
        data: built.data,
        dataPreview: built.preview,
      });
    }

    return analyzed;
  }

  private buildFields(
    row: ParsedRow,
    selectedCategory: RvaCategoryValue,
    defaultStatus: RecruitmentVendorOpportunityStatus,
    adminUserId: string,
  ): {
    data?: Prisma.RecruitmentVendorOpportunityUncheckedCreateInput;
    preview?: Record<string, unknown>;
    error?: string;
  } {
    const f = row.fields;
    const title = deriveRvaTitle(f);
    if (!title) return { error: 'Missing required field: title' };

    const published = parseDateCell(f.publishedDate);
    if (published.error) return { error: published.error };
    const expiry = parseDateCell(f.expiryDate);
    if (expiry.error) return { error: expiry.error };

    const exp = parseExperience(f.experienceText ?? null);
    const minExperience = this.toIntOrNull(f.minExperience) ?? exp.minExperience;
    const maxExperience = this.toIntOrNull(f.maxExperience) ?? exp.maxExperience;
    if (minExperience !== null && maxExperience !== null && minExperience > maxExperience) {
      return { error: 'Minimum experience cannot exceed maximum experience' };
    }

    const category = parseRvaCategory(f.category) ?? selectedCategory;
    const status = this.parseStatus(f.status ?? null, defaultStatus);
    const text = (value?: string | null): string | null => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    };

    const data = {
      serialNo: this.toIntOrNull(f.serialNo),
      title,
      description: text(f.description),
      role: text(f.role),
      sector: text(f.sector),
      category,
      company: text(f.company),
      organization: text(f.organization),
      budget: text(f.budget),
      salary: text(f.salary),
      commercialValue: text(f.commercialValue),
      location: text(f.location),
      geography: text(f.geography),
      country: text(f.country),
      experienceText: text(f.experienceText),
      minExperience,
      maxExperience,
      eligibility: text(f.eligibility),
      qualification: text(f.qualification),
      requirements: text(f.requirements),
      otherDetails: text(f.otherDetails),
      howToApply: text(f.howToApply),
      applicationUrl: text(f.applicationUrl),
      applicationContact: text(f.applicationContact),
      source: text(f.source),
      referenceId: text(f.referenceId),
      jobId: text(f.jobId),
      publishedDate: published.date,
      expiryDate: expiry.date,
      status,
      createdBy: adminUserId,
    } satisfies Prisma.RecruitmentVendorOpportunityUncheckedCreateInput;

    const preview: Record<string, unknown> = {
      serialNo: data.serialNo,
      jobId: data.jobId,
      category,
      role: data.role,
      sector: data.sector,
      company: data.company,
      organization: data.organization,
      location: data.location,
      country: data.country,
      salary: data.salary,
      budget: data.budget,
      minExperience,
      maxExperience,
      qualification: data.qualification,
      description: data.description,
      howToApply: data.howToApply,
    };

    return { data, preview };
  }

  async importBatch(rows: RvaImportAnalysisRow[]): Promise<{
    imported: number;
    failed: number;
    errors: Array<{ row: number; title?: string; error: string }>;
  }> {
    const result = {
      imported: 0,
      failed: 0,
      errors: [] as Array<{ row: number; title?: string; error: string }>,
    };
    for (const row of rows) {
      if (!row.data) continue;
      try {
        await this.createOpportunity(row.data);
        result.imported++;
      } catch (err) {
        result.failed++;
        result.errors.push({
          row: row.excelRow,
          title: row.title ?? undefined,
          error: this.isJobIdUniqueViolation(err)
            ? 'Job ID already exists'
            : this.errorMessage(err),
        });
      }
    }
    return result;
  }

  private async collectExistingJobIds(): Promise<Set<string>> {
    const rows = await this.prisma.recruitmentVendorOpportunity.findMany({
      where: { jobId: { not: null } },
      select: { jobId: true },
    });
    return new Set(rows.map((r) => r.jobId).filter((id): id is string => Boolean(id)));
  }

  private async createOpportunity(data: Prisma.RecruitmentVendorOpportunityUncheckedCreateInput) {
    try {
      return await this.prisma.recruitmentVendorOpportunity.create({ data });
    } catch (err) {
      if (this.isJobIdUniqueViolation(err)) {
        throw new BadRequestException('Job ID already exists');
      }
      throw err;
    }
  }

  private async updateOpportunity(
    id: string,
    data: Prisma.RecruitmentVendorOpportunityUpdateInput,
  ) {
    try {
      return await this.prisma.recruitmentVendorOpportunity.update({ where: { id }, data });
    } catch (err) {
      if (this.isJobIdUniqueViolation(err)) {
        throw new BadRequestException('Job ID already exists');
      }
      throw err;
    }
  }

  private isJobIdUniqueViolation(err: unknown): boolean {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') {
      return false;
    }
    const target = err.meta?.target;
    if (target === undefined) return true;
    const fields = Array.isArray(target) ? target : [target];
    return fields.some((field) => String(field).toLowerCase().includes('jobid'));
  }

  private errorMessage(err: unknown): string {
    if (err instanceof BadRequestException) {
      const response = err.getResponse();
      if (typeof response === 'string') return response;
      if (response && typeof response === 'object' && 'message' in response) {
        const message = (response as { message?: string | string[] }).message;
        if (Array.isArray(message)) return message.join(', ');
        if (typeof message === 'string') return message;
      }
    }
    if (err instanceof Error) return err.message;
    return 'Failed to import row';
  }

  private resolveCategory(value: string | undefined): RvaCategoryValue {
    return parseRvaCategory(value ?? null) ?? 'OTHER';
  }

  private parseStatus(
    value: string | null | undefined,
    fallback: RecruitmentVendorOpportunityStatus,
  ): RecruitmentVendorOpportunityStatus {
    if (value === null || value === undefined) return fallback;
    const normalized = String(value)
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
    return (RVA_STATUS_VALUES as readonly string[]).includes(normalized)
      ? (normalized as RecruitmentVendorOpportunityStatus)
      : fallback;
  }

  private toIntOrNull(value: string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  }

  private emptySummary(): RvaImportSummary {
    return { total: 0, valid: 0, invalid: 0, duplicate: 0, skipped: 0 };
  }

  private buildSummary(rows: RvaImportAnalysisRow[]): RvaImportSummary {
    return {
      total: rows.length,
      valid: rows.filter((r) => r.classification === 'VALID').length,
      invalid: rows.filter((r) => r.classification === 'INVALID').length,
      duplicate: rows.filter((r) => r.classification === 'DUPLICATE').length,
      skipped: rows.filter((r) => r.classification === 'SKIPPED').length,
    };
  }

  private aggregateSummary(sheets: RvaSheetAnalysis[]): RvaImportSummary {
    const summary = this.emptySummary();
    for (const sheet of sheets) {
      summary.total += sheet.summary.total;
      summary.valid += sheet.summary.valid;
      summary.invalid += sheet.summary.invalid;
      summary.duplicate += sheet.summary.duplicate;
      summary.skipped += sheet.summary.skipped;
    }
    return summary;
  }

  private describeNoImportableSheets(
    sheets: ParsedRvaSheet[],
    analyses: RvaSheetAnalysis[],
  ): string {
    const details = analyses
      .filter((a) => a.state !== 'IMPORTED')
      .map((a) => `"${a.sheetName}"${a.reason ? ` — ${a.reason}` : ''}`)
      .join('; ');
    const sheetCount = sheets.length;
    return `No opportunities could be imported from this file (${sheetCount} sheet${sheetCount === 1 ? '' : 's'}). ${details}`;
  }

  private toData(dto: CreateRvaOpportunityDto | UpdateRvaOpportunityDto) {
    const data: Prisma.RecruitmentVendorOpportunityUpdateInput = {};
    const assign = <K extends keyof Prisma.RecruitmentVendorOpportunityUpdateInput>(
      key: K,
      value: Prisma.RecruitmentVendorOpportunityUpdateInput[K] | undefined,
    ) => {
      if (value !== undefined) data[key] = value;
    };

    assign('serialNo', dto.serialNo);
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
