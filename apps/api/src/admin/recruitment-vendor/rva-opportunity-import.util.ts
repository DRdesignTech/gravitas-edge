import * as XLSX from 'xlsx';
import { ParsedRow } from '../opportunities/opportunity-import.util';

/**
 * Header aliases for Recruitment Vendor Access (RVA) import files. Keys are
 * normalized header cells (lower-cased, punctuation stripped) and values are
 * the RVA opportunity field they populate.
 */
export const RVA_HEADER_ALIASES: Record<string, string> = {
  title: 'title',
  jobtitle: 'title',
  opportunity: 'title',
  opportunitytitle: 'title',
  engagement: 'title',
  mandate: 'title',
  role: 'role',
  designation: 'role',
  roleposition: 'role',
  sector: 'sector',
  industry: 'sector',
  category: 'category',
  type: 'category',
  company: 'company',
  employer: 'company',
  client: 'company',
  organization: 'organization',
  organisation: 'organization',
  org: 'organization',
  budget: 'budget',
  budgetrange: 'budget',
  salary: 'salary',
  compensation: 'salary',
  ctc: 'salary',
  fees: 'salary',
  commercialvalue: 'commercialValue',
  commercial: 'commercialValue',
  contractvalue: 'commercialValue',
  location: 'location',
  place: 'location',
  city: 'location',
  geography: 'geography',
  region: 'geography',
  country: 'country',
  experience: 'experienceText',
  experiencetext: 'experienceText',
  experienceyears: 'experienceText',
  minyears: 'minExperience',
  minexperience: 'minExperience',
  maxyears: 'maxExperience',
  maxexperience: 'maxExperience',
  eligibility: 'eligibility',
  eligibilitycriteria: 'eligibility',
  qualification: 'qualification',
  qualifications: 'qualification',
  requirements: 'requirements',
  requirement: 'requirements',
  scope: 'requirements',
  otherdetails: 'otherDetails',
  otherdetail: 'otherDetails',
  details: 'otherDetails',
  description: 'description',
  jobdetails: 'description',
  howtoapply: 'howToApply',
  apply: 'howToApply',
  applicationurl: 'applicationUrl',
  applicationlink: 'applicationUrl',
  applyurl: 'applicationUrl',
  link: 'applicationUrl',
  applicationcontact: 'applicationContact',
  contact: 'applicationContact',
  email: 'applicationContact',
  howtoapplyemail: 'applicationContact',
  howtoapplycontact: 'applicationContact',
  source: 'source',
  referenceid: 'referenceId',
  reference: 'referenceId',
  refid: 'referenceId',
  jobid: 'jobId',
  opportunityid: 'jobId',
  rvaid: 'jobId',
  publisheddate: 'publishedDate',
  date: 'publishedDate',
  posteddate: 'publishedDate',
  dateposted: 'publishedDate',
  expirydate: 'expiryDate',
  closingdate: 'expiryDate',
  deadline: 'expiryDate',
  status: 'status',
};

/**
 * Fields that make a row "meaningful" (used to detect blank rows). Excludes
 * administrative fields such as status and category so defaulting them can
 * never make an empty row look populated.
 */
const MEANINGFUL_RVA_FIELDS = [
  'title',
  'role',
  'sector',
  'company',
  'organization',
  'budget',
  'salary',
  'location',
  'country',
  'experienceText',
  'eligibility',
  'qualification',
  'requirements',
  'otherDetails',
  'publishedDate',
];

export function normalizeHeaderKey(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\(.*?\)/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function mapRvaHeadersToFields(headers: unknown[]): Record<number, string> {
  const colMap: Record<number, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const key = normalizeHeaderKey(headers[i]);
    const field = RVA_HEADER_ALIASES[key];
    if (field && !Object.values(colMap).includes(field)) {
      colMap[i] = field;
    }
  }
  return colMap;
}

export function findRvaHeaderRow(
  rows: unknown[][],
): { index: number; colMap: Record<number, string> } | null {
  for (let i = 0; i < Math.min(rows.length, 60); i++) {
    const row = rows[i] ?? [];
    const nonEmpty = row.filter(
      (c) => c !== null && c !== undefined && String(c).trim() !== '',
    ).length;
    if (nonEmpty < 2) continue;
    const colMap = mapRvaHeadersToFields(row);
    const fields = Object.values(colMap);
    const hasTitle = fields.includes('title');
    const hasMeta = fields.some((f) =>
      [
        'role',
        'sector',
        'category',
        'company',
        'organization',
        'location',
        'country',
        'salary',
        'budget',
        'publishedDate',
        'experienceText',
      ].includes(f),
    );
    if (hasTitle && hasMeta) {
      return { index: i, colMap };
    }
  }
  return null;
}

export function parseRvaSheetRows(ws: XLSX.WorkSheet): ParsedRow[] {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) as unknown[][];
  const header = findRvaHeaderRow(rows);
  if (!header) return [];

  const parsed: ParsedRow[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const raw = rows[i] ?? [];
    const fields: Record<string, string | null> = {};
    for (const [idx, field] of Object.entries(header.colMap)) {
      const value = raw[Number(idx)];
      fields[field] = value === null || value === undefined ? null : String(value).trim();
    }
    parsed.push({ excelRow: i + 1, fields, removalNote: false });
  }
  return parsed;
}

export function isRvaJobSheet(workbook: XLSX.WorkBook, sheetName: string): boolean {
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: null,
    raw: true,
  }) as unknown[][];
  return findRvaHeaderRow(rows) !== null;
}

export function listRvaJobSheets(workbook: XLSX.WorkBook): {
  jobSheets: string[];
  metaSheets: string[];
} {
  const jobSheets: string[] = [];
  const metaSheets: string[] = [];
  for (const name of workbook.SheetNames) {
    if (isRvaJobSheet(workbook, name)) jobSheets.push(name);
    else metaSheets.push(name);
  }
  return { jobSheets, metaSheets };
}

export function isBlankRvaRow(row: ParsedRow): boolean {
  return MEANINGFUL_RVA_FIELDS.every((field) => {
    const value = row.fields[field];
    return value === null || value === undefined || String(value).trim() === '';
  });
}

export async function parseRvaCsvRows(buffer: Buffer): Promise<ParsedRow[]> {
  const { parse } = await import('csv-parse/sync');
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, unknown>[];

  if (records.length === 0) return [];

  const headers = Object.keys(records[0]);
  const colMap = mapRvaHeadersToFields(headers as unknown[]);
  const byHeader: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const field = colMap[i];
    if (field) byHeader[headers[i]] = field;
  }

  return records.map((record, i) => {
    const fields: Record<string, string | null> = {};
    for (const [header, field] of Object.entries(byHeader)) {
      const value = record[header];
      fields[field] = value === null || value === undefined ? null : String(value).trim();
    }
    return { excelRow: i + 2, fields, removalNote: false };
  });
}

export const RVA_CATEGORY_VALUES = [
  'VENDOR_ENABLEMENT',
  'RFP_EOI_RFQ',
  'STAFFING_RPO',
  'EXECUTIVE_SEARCH',
  'OTHER',
] as const;

export type RvaCategoryValue = (typeof RVA_CATEGORY_VALUES)[number];

/**
 * Maps a free-text category cell (e.g. "RFP / EOI / RFQ", "staffing-rpo") onto
 * an RVA category enum value. Returns null when the value is empty or cannot be
 * recognised, so the caller can fall back to the selected default.
 */
export function parseRvaCategory(raw: string | null | undefined): RvaCategoryValue | null {
  if (raw === null || raw === undefined) return null;
  const normalized = normalizeHeaderKey(raw);
  if (!normalized) return null;

  const direct = RVA_CATEGORY_VALUES.find((value) => normalizeHeaderKey(value) === normalized);
  if (direct) return direct;

  if (normalized.includes('vendor') || normalized.includes('enablement')) {
    return 'VENDOR_ENABLEMENT';
  }
  if (normalized.includes('rfp') || normalized.includes('eoi') || normalized.includes('rfq')) {
    return 'RFP_EOI_RFQ';
  }
  if (normalized.includes('staffing') || normalized.includes('rpo')) {
    return 'STAFFING_RPO';
  }
  if (normalized.includes('executive')) {
    return 'EXECUTIVE_SEARCH';
  }
  return null;
}

export const RVA_STATUS_VALUES = ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'EXPIRED'] as const;
