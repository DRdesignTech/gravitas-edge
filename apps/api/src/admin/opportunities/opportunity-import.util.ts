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

const EMPTY_DATE_VALUES = new Set([
  '',
  'na',
  'n/a',
  'none',
  'not specified',
  'notspecified',
  'not mentioned',
  'notmentioned',
  'not available',
  'notavailable',
  'tbd',
  '-',
]);

/**
 * Words that describe an open-ended / rolling deadline rather than a concrete
 * date (e.g. "Immediate", "Ongoing", "Open until filled", "Rolling basis").
 * A Deadline cell made up entirely of these words (and no digits) is treated as
 * "no fixed deadline" instead of an invalid date, matching how recruiters fill
 * these sheets.
 */
const OPEN_DATE_TOKENS = new Set([
  'immediate',
  'immediately',
  'asap',
  'ongoing',
  'continuous',
  'continuing',
  'rolling',
  'roll',
  'open',
  'opening',
  'anytime',
  'flexible',
  'no',
  'deadline',
  'until',
  'till',
  'filled',
  'fill',
  'basis',
  'always',
  'application',
  'applications',
  'apply',
  'invited',
  'welcome',
  'to',
  'be',
]);

function isOpenEndedDateValue(value: string): boolean {
  if (/\d/.test(value)) return false;
  const tokens = value
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => OPEN_DATE_TOKENS.has(t));
}

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
  jobid: 'jobId',
  jobidnumber: 'jobId',
  jobidentifier: 'jobId',
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

export interface VaultRef {
  id: string;
  name: string;
  type: string;
}

export type SheetMatchResult =
  | { status: 'matched'; vault: VaultRef; confidence: number }
  | { status: 'ambiguous'; candidates: VaultRef[]; confidence: number }
  | { status: 'unmatched'; confidence: number };

/**
 * Words that add no identifying meaning when comparing a sheet name with a
 * vault name (e.g. "Remote Access Vault" vs "Remote Access").
 */
const GENERIC_VAULT_WORDS = new Set([
  'vault',
  'vaults',
  'access',
  'accesses',
  'opportunity',
  'opportunities',
  'job',
  'jobs',
  'board',
  'and',
  'or',
  'the',
  'at',
  'in',
  'for',
  'of',
]);

/**
 * Lower-cases a vault/sheet name, expands "&" to "and", collapses punctuation
 * (hyphens, underscores, slashes) and whitespace into single spaces.
 */
export function normalizeVaultText(value: string): string {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The meaningful identity tokens of a sheet or vault name, excluding generic
 * filler words such as "vault", "access", "&"/"and".
 */
export function meaningfulTokens(value: string): string[] {
  return normalizeVaultText(value)
    .split(/\s+/)
    .filter((w) => w.length > 0 && !GENERIC_VAULT_WORDS.has(w));
}

export function isJobSheet(workbook: XLSX.WorkBook, sheetName: string): boolean {
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: null,
    raw: true,
  }) as unknown[][];
  return findHeaderRow(rows) !== null;
}

export function listJobSheets(workbook: XLSX.WorkBook): {
  jobSheets: string[];
  metaSheets: string[];
} {
  const jobSheets: string[] = [];
  const metaSheets: string[] = [];
  for (const name of workbook.SheetNames) {
    if (isJobSheet(workbook, name)) jobSheets.push(name);
    else metaSheets.push(name);
  }
  return { jobSheets, metaSheets };
}

/**
 * Matches a sheet name to a vault using normalized meaningful tokens.
 *
 * - Case-insensitive, ignores "vault"/"access"/"&"/punctuation/spacing.
 * - Requires a strong overlap (the sheet's meaningful tokens must mostly be
 *   contained within the vault name).
 * - Never falls back to substring guessing: if several vaults tie it is
 *   reported as ambiguous so the caller can skip instead of picking blindly.
 */
export function matchSheetToVault(sheetName: string, vaults: VaultRef[]): SheetMatchResult {
  const sheetTokens = meaningfulTokens(sheetName);
  if (vaults.length === 0 || sheetTokens.length === 0) {
    return { status: 'unmatched', confidence: 0 };
  }

  const sheetNorm = normalizeVaultText(sheetName);

  interface Candidate {
    vault: VaultRef;
    sheetCover: number;
    vaultCover: number;
    similarity: number;
    exact: boolean;
    overlap: number;
  }

  const candidates: Candidate[] = [];
  for (const vault of vaults) {
    const vaultTokens = meaningfulTokens(vault.name);
    const vaultNorm = normalizeVaultText(vault.name);
    const vaultSet = new Set(vaultTokens);

    let overlap = 0;
    for (const token of sheetTokens) {
      if (vaultSet.has(token)) overlap++;
    }
    if (overlap === 0) continue;

    const sheetCover = overlap / sheetTokens.length;
    const vaultCover = overlap / (vaultTokens.length || 1);

    // The sheet's meaningful keywords must be largely covered by the vault.
    // A single-token sheet (e.g. "Executive") still requires that token to be
    // part of the vault, which prevents accidental prefix/substring matches.
    if (sheetCover < 0.5) continue;

    const exact = vaultNorm === sheetNorm;
    const similarity = exact ? 1 : sheetCover * vaultCover;
    candidates.push({ vault, sheetCover, vaultCover, similarity, exact, overlap });
  }

  if (candidates.length === 0) {
    return { status: 'unmatched', confidence: 0 };
  }

  candidates.sort(
    (a, b) =>
      b.similarity - a.similarity ||
      Number(b.exact) - Number(a.exact) ||
      b.overlap - a.overlap ||
      a.vault.name.localeCompare(b.vault.name),
  );

  const top = candidates[0];
  const runnerUp = candidates[1];

  const clearWinner =
    runnerUp === undefined ||
    top.similarity > runnerUp.similarity + 1e-9 ||
    (top.exact && !runnerUp.exact && top.overlap >= runnerUp.overlap);

  if (clearWinner) {
    return { status: 'matched', vault: top.vault, confidence: top.similarity };
  }

  return {
    status: 'ambiguous',
    candidates: candidates.map((c) => c.vault),
    confidence: top.similarity,
  };
}

export function describeSheetMatchFailure(
  sheetName: string,
  result: Extract<SheetMatchResult, { status: 'unmatched' | 'ambiguous' }>,
): string {
  if (result.status === 'ambiguous') {
    const names = result.candidates.map((c) => `"${c.name}"`).join(', ');
    return `Sheet "${sheetName}" matches multiple vaults (${names}). Please rename the sheet or import it individually into a specific vault.`;
  }
  return `Could not find a matching vault for sheet "${sheetName}". No opportunity data from this sheet will be imported.`;
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
  if (!s || EMPTY_DATE_VALUES.has(lower.replace(/\s+/g, '')) || isOpenEndedDateValue(s)) {
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

/**
 * The job attributes that participate in duplicate detection. Only content
 * fields sourced from the import file / stored on the job are compared;
 * administrative fields (status, category, dates, createdBy) are ignored so
 * that defaulting them can never create or hide a duplicate.
 *
 * `status` is intentionally absent: it is only read to skip archived/expired
 * jobs before they reach the comparison.
 */
export interface DuplicateComparableJob {
  title?: string | null;
  company?: string | null;
  location?: string | null;
  country?: string | null;
  salary?: string | null;
  experienceText?: string | null;
  minExperience?: number | null;
  maxExperience?: number | null;
  industry?: string | null;
  functionalArea?: string | null;
  employmentType?: string | null;
  qualification?: string | null;
  description?: string | null;
  applicationUrl?: string | null;
  applicationContact?: string | null;
  status?: string | null;
}

const DUPLICATE_TEXT_FIELDS = [
  'title',
  'company',
  'location',
  'country',
  'salary',
  'industry',
  'functionalArea',
  'employmentType',
  'qualification',
  'description',
  'applicationUrl',
  'applicationContact',
] as const;

/** Archived/expired postings must not block a genuinely new posting. */
export function isBlockingDuplicateStatus(status: string | null | undefined): boolean {
  return status === 'ARCHIVED' || status === 'EXPIRED';
}

/**
 * Normalizes a job field for duplicate comparison: trims, lower-cases,
 * expands "&" to "and", turns dash/slash/punctuation runs into single spaces
 * and collapses whitespace. Meaningful symbols such as "+" and "#" are kept
 * so that distinct values like "C++" and "C#" never collapse together.
 */
export function normalizeDuplicateText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[-_/.,;:'"!?()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds the comparison key for the experience of a job using the existing
 * parsed range logic, so equivalent formatting ("4-6 years" vs "4 to 6 yrs",
 * "5+ years" vs "5 years") compares as equal. Falls back to the normalized
 * text when no range can be parsed from either side.
 */
export function duplicateExperienceKey(job: DuplicateComparableJob): string {
  let min = job.minExperience ?? null;
  let max = job.maxExperience ?? null;
  if (job.experienceText) {
    const parsed = parseExperience(job.experienceText);
    min = min ?? parsed.minExperience;
    max = max ?? parsed.maxExperience;
  }
  if (min === null && max === null) return normalizeDuplicateText(job.experienceText);
  return `${min ?? ''}:${max ?? ''}`;
}

export interface JobDuplicateComparison {
  duplicate: boolean;
  /** Fields present in both records with equal normalized values. */
  matched: string[];
  /** Fields present in both records with different values (always a blocker). */
  conflicts: string[];
  /** Fields present in only one of the two records. */
  oneSided: string[];
}

/**
 * Two jobs are duplicates only when every field both records can speak to
 * agrees, and they share more than the title alone:
 *
 * - any field present in both with different values => not a duplicate;
 * - otherwise duplicates when at least two fields match (title plus another
 *   identifying detail), or when the two records are identical in presence
 *   (only title on both sides and nothing one-sided to distinguish them).
 *
 * Fields missing in both records are neutral and never count towards a match.
 */
export function compareJobsForDuplicate(
  a: DuplicateComparableJob,
  b: DuplicateComparableJob,
): JobDuplicateComparison {
  const matched: string[] = [];
  const conflicts: string[] = [];
  const oneSided: string[] = [];

  for (const field of DUPLICATE_TEXT_FIELDS) {
    const av = normalizeDuplicateText(a[field]);
    const bv = normalizeDuplicateText(b[field]);
    if (!av && !bv) continue;
    if (!av || !bv) {
      oneSided.push(field);
      continue;
    }
    if (av === bv) matched.push(field);
    else conflicts.push(field);
  }

  const aExperience = duplicateExperienceKey(a);
  const bExperience = duplicateExperienceKey(b);
  if (aExperience && bExperience) {
    if (aExperience === bExperience) matched.push('experience');
    else conflicts.push('experience');
  } else if (aExperience || bExperience) {
    oneSided.push('experience');
  }

  const duplicate = conflicts.length === 0 && (matched.length >= 2 || oneSided.length === 0);
  return { duplicate, matched, conflicts, oneSided };
}

/** Indexes jobs by their normalized title so only same-title candidates are compared. */
export function indexJobsByTitle(
  jobs: DuplicateComparableJob[],
): Map<string, DuplicateComparableJob[]> {
  const index = new Map<string, DuplicateComparableJob[]>();
  for (const job of jobs) addJobToTitleIndex(index, job);
  return index;
}

export function addJobToTitleIndex(
  index: Map<string, DuplicateComparableJob[]>,
  job: DuplicateComparableJob,
): void {
  const key = normalizeDuplicateText(job.title);
  const bucket = index.get(key);
  if (bucket) bucket.push(job);
  else index.set(key, [job]);
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
