import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ParsedRow {
  excelRow: number;
  fields: Record<string, string | null>;
  removalNote: boolean;
}

export const MONTH_NAMES: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const EMPTY_DATE_VALUES = new Set(['', 'na', 'n/a', 'none', 'not specified', 'notspecified', '-']);

export function normalizeHeaderKey(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\(.*?\)/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const HEADER_ALIASES: Record<string, string> = {
  title: 'title',
  role: 'title',
  position: 'title',
  jobtitle: 'title',
  job: 'title',
  company: 'company',
  organisation: 'company',
  organization: 'company',
  employer: 'company',
  location: 'location',
  place: 'location',
  country: 'country',
  industry: 'industry',
  sector: 'industry',
  functionalarea: 'functionalArea',
  salary: 'salary',
  compensation: 'salary',
  ctc: 'salary',
  experience: 'experienceText',
  experienceyears: 'experienceText',
  minyears: 'minExperience',
  maxyears: 'maxExperience',
  minexperience: 'minExperience',
  maxexperience: 'maxExperience',
  date: 'date',
  posteddate: 'date',
  postingdate: 'date',
  dateposted: 'date',
  dateofposting: 'date',
  expirydate: 'expiryDate',
  status: 'status',
  category: 'category',
  sno: 'externalRef',
  sn: 'externalRef',
  notes: 'notes',
  remark: 'notes',
  remarks: 'notes',
  comments: 'notes',
  description: 'description',
  otherdetails: 'description',
  otherdetail: 'description',
  jobdetails: 'description',
  qualifications: 'qualification',
  qualification: 'qualification',
  employmenttype: 'employmentType',
  employmenttypefulltime: 'employmentType',
  applicationurl: 'applicationUrl',
  applicationlink: 'applicationUrl',
  howtoapply: 'applicationUrl',
  howtoapplyurl: 'applicationUrl',
  howtoapplyemail: 'applicationContact',
  howtoapplycontact: 'applicationContact',
  applicationcontact: 'applicationContact',
  source: 'source',
};

export function mapHeadersToFields(headers: unknown[]): Record<number, string> {
  const colMap: Record<number, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const key = normalizeHeaderKey(headers[i]);
    const field = HEADER_ALIASES[key];
    if (field && !Object.values(colMap).includes(field)) {
      colMap[i] = field;
    }
  }
  return colMap;
}

export function findHeaderRow(
  rows: unknown[][],
): { index: number; colMap: Record<number, string> } | null {
  for (let i = 0; i < Math.min(rows.length, 60); i++) {
    const row = rows[i] ?? [];
    const nonEmpty = row.filter(
      (c) => c !== null && c !== undefined && String(c).trim() !== '',
    ).length;
    if (nonEmpty < 3) continue;
    const colMap = mapHeadersToFields(row);
    const fields = Object.values(colMap);
    const hasTitle = fields.some((f) => f === 'title');
    const hasMeta = fields.some((f) =>
      ['date', 'location', 'salary', 'experienceText'].includes(f),
    );
    if (hasTitle && hasMeta) {
      return { index: i, colMap };
    }
  }
  return null;
}

export function selectSheetName(
  workbook: XLSX.WorkBook,
  vaultName: string,
  fileExt: string,
): string {
  if (fileExt === 'csv') {
    if (!workbook.SheetNames.length) {
      throw new BadRequestException('File contains no sheets');
    }
    return workbook.SheetNames[0];
  }

  const jobSheets = workbook.SheetNames.filter((name) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
      header: 1,
      defval: null,
      raw: true,
    }) as unknown[][];
    return findHeaderRow(rows) !== null;
  });

  if (jobSheets.length === 0) {
    throw new BadRequestException(
      'No job sheet found in the workbook (a job sheet needs a header row with columns like Role, Salary, Location, Experience)',
    );
  }

  if (jobSheets.length === 1) {
    return jobSheets[0];
  }

  const target = vaultName.trim().toLowerCase();
  const match = jobSheets.find((name) => name.trim().toLowerCase() === target);
  if (!match) {
    throw new BadRequestException(
      `Workbook contains ${jobSheets.length} job sheets (${jobSheets.join(', ')}) but none exactly matches the selected vault "${vaultName}". Rename the vault to match a sheet name or import a file with a single job sheet.`,
    );
  }
  return match;
}

export function parseSheetRows(ws: XLSX.WorkSheet): ParsedRow[] {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) as unknown[][];
  const header = findHeaderRow(rows);
  if (!header) return [];

  const parsed: ParsedRow[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const raw = rows[i] ?? [];
    const fields: Record<string, string | null> = {};

    for (const [idx, field] of Object.entries(header.colMap)) {
      const value = raw[Number(idx)];
      fields[field] = value === null || value === undefined ? null : String(value).trim();
    }

    let removalNote = false;
    for (let j = 0; j < raw.length; j++) {
      if (header.colMap[j]) continue;
      const value = raw[j];
      if (value === null || value === undefined) continue;
      if (/remove from the vault/i.test(String(value))) {
        removalNote = true;
        break;
      }
    }

    parsed.push({ excelRow: i + 1, fields, removalNote });
  }
  return parsed;
}

export function parseDateCell(
  raw: unknown,
  referenceYear = new Date().getFullYear(),
): { date: Date | null; error: string | null } {
  if (raw === null || raw === undefined) return { date: null, error: null };

  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime())
      ? { date: null, error: 'Invalid date value' }
      : { date: raw, error: null };
  }

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw <= 0) return { date: null, error: null };
    const code = XLSX.SSF.parse_date_code(raw);
    if (!code) return { date: null, error: 'Invalid date value' };
    return { date: new Date(Date.UTC(code.y, code.m - 1, code.d)), error: null };
  }

  const s = String(raw).trim();
  const lower = s.toLowerCase();
  if (!s || EMPTY_DATE_VALUES.has(lower.replace(/\s+/g, ''))) {
    return { date: null, error: null };
  }

  const serialOnly = s.match(/^\d{4,6}$/);
  if (serialOnly) {
    const code = XLSX.SSF.parse_date_code(Number(s));
    if (code && code.y >= 2000 && code.y <= 2099) {
      return { date: new Date(Date.UTC(code.y, code.m - 1, code.d)), error: null };
    }
    return { date: null, error: `Invalid date: ${s}` };
  }

  const monthMatch = s.match(
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/i,
  );
  if (monthMatch) {
    const month = MONTH_NAMES[monthMatch[1].toLowerCase()];
    const year = referenceYear;
    return { date: new Date(Date.UTC(year, month, 1)), error: null };
  }

  const iso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (iso) {
    const d = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    if (Number.isNaN(d.getTime())) return { date: null, error: `Invalid date: ${s}` };
    return { date: d, error: null };
  }

  const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmy) {
    const y = Number(dmy[3]);
    const fullYear = y < 100 ? (y < 70 ? 2000 + y : 1900 + y) : y;
    const d = new Date(Date.UTC(fullYear, Number(dmy[2]) - 1, Number(dmy[1])));
    if (Number.isNaN(d.getTime())) return { date: null, error: `Invalid date: ${s}` };
    return { date: d, error: null };
  }

  return { date: null, error: `Invalid date: ${s}` };
}

export function parseExperience(raw: string | null): {
  minExperience: number | null;
  maxExperience: number | null;
} {
  if (!raw) return { minExperience: null, maxExperience: null };

  const range = raw.match(/(?:^|[\s,])(\d{1,2})\s*(?:to|-|–|—)\s*(\d{1,2})\s*(?:years?|yrs)/i);
  if (range) {
    return { minExperience: Number(range[1]), maxExperience: Number(range[2]) };
  }

  const plus = raw.match(/(?:^|[\s,])(\d{1,2})\s*\+\s*(?:years?|yrs)?/i);
  if (plus) {
    return { minExperience: Number(plus[1]), maxExperience: null };
  }

  const bare = raw.match(/(?:^|[\s,])(\d{1,2})\s*(?:years?|yrs)/i);
  if (bare) {
    return { minExperience: Number(bare[1]), maxExperience: null };
  }

  return { minExperience: null, maxExperience: null };
}

export function isEmptyRow(row: ParsedRow): boolean {
  return Object.values(row.fields).every(
    (v) => v === null || v === undefined || String(v).trim() === '',
  );
}

const MEANINGFUL_FIELDS = [
  'title',
  'industry',
  'salary',
  'location',
  'experienceText',
  'date',
  'company',
  'notes',
];

export function isBlankRow(row: ParsedRow): boolean {
  return MEANINGFUL_FIELDS.every((field) => {
    const value = row.fields[field];
    return value === null || value === undefined || String(value).trim() === '';
  });
}

export async function parseCsvRows(buffer: Buffer): Promise<ParsedRow[]> {
  const { parse } = await import('csv-parse/sync');
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, unknown>[];

  if (records.length === 0) return [];

  const headers = Object.keys(records[0]);
  const colMap = mapHeadersToFields(headers as unknown[]);
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
