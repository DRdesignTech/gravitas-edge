/**
 * Shared types and utilities used across website, admin, and api.
 * Not business-specific; common contracts only.
 */

/**
 * Canonical opportunity field labels and order.
 *
 * These are the exact labels shown across the website and admin panel so both
 * surfaces present the same opportunity spreadsheet columns in the same order.
 * They are display labels only: the stored Prisma fields are unchanged and are
 * mapped in `OPPORTUNITY_FIELD_SOURCES` below.
 *
 *   1. Job ID         -> jobId
 *   2. S. No.         -> serialNo (auto-assigned display serial)
 *   3. Date           -> publishedDate (falls back to createdAt for drafts)
 *   4. Role           -> title
 *   5. Sector         -> industry
 *   6. Company        -> company
 *   7. Salary         -> salary
 *   8. Location       -> location (with country as a secondary part)
 *   9. Experience     -> experienceText / minExperience-maxExperience
 *  10. Qualification  -> qualification
 *  11. Other Details  -> description
 *  12. How to apply   -> applicationContact (preferred) / applicationUrl
 */
export const OPPORTUNITY_FIELD_LABELS = {
  jobId: 'Job ID',
  serialNo: 'S. No.',
  date: 'Date',
  role: 'Role',
  sector: 'Sector',
  company: 'Company',
  salary: 'Salary',
  location: 'Location',
  experience: 'Experience',
  qualification: 'Qualification',
  otherDetails: 'Other Details',
  howToApply: 'How to apply',
} as const;

export type OpportunityFieldKey = keyof typeof OPPORTUNITY_FIELD_LABELS;

/** The exact label order required by the opportunity spreadsheet. */
export const OPPORTUNITY_FIELD_ORDER: OpportunityFieldKey[] = [
  'jobId',
  'serialNo',
  'date',
  'role',
  'sector',
  'company',
  'salary',
  'location',
  'experience',
  'qualification',
  'otherDetails',
  'howToApply',
];

/**
 * Recruitment Vendor Access (RVA) vault namespace.
 *
 * The RVA vault is a separate business vertical that shares the same database
 * and global user accounts but has its own opportunities, plans,
 * subscriptions, entitlements, payments and analytics. This key is the single
 * stable identifier used by admin/website for vault scoping; the backend
 * enforces isolation through dedicated RVA tables (see Prisma schema:
 * RecruitmentVendor* models) rather than through this string.
 */
export const RECRUITMENT_VENDOR_VAULT_KEY = 'recruitment-vendor-access';

export const RECRUITMENT_VENDOR_VAULT_NAME = 'Recruitment Vendor Access';

/** Canonical RVA opportunity categories (client reference design). */
export const RECRUITMENT_VENDOR_CATEGORIES = [
  { value: 'VENDOR_ENABLEMENT', label: 'Vendor Enablement' },
  { value: 'RFP_EOI_RFQ', label: 'RFP / EOI / RFQ' },
  { value: 'STAFFING_RPO', label: 'Staffing & RPO' },
  { value: 'EXECUTIVE_SEARCH', label: 'Executive Search' },
  { value: 'OTHER', label: 'Other' },
] as const;

export type RecruitmentVendorCategoryValue =
  (typeof RECRUITMENT_VENDOR_CATEGORIES)[number]['value'];

/**
 * Canonical RVA opportunity field labels and order (mirrors the client
 * spreadsheet/design). Display labels only; stored fields are documented in
 * the Prisma RecruitmentVendorOpportunity model.
 */
export const RECRUITMENT_VENDOR_FIELD_LABELS = {
  jobId: 'Opportunity ID',
  date: 'Published Date',
  role: 'Role / Opportunity Title',
  sector: 'Sector / Category',
  company: 'Company / Organization',
  budget: 'Budget / Commercial Value',
  location: 'Location / Geography',
  experience: 'Experience / Eligibility',
  qualification: 'Qualification / Requirements',
  otherDetails: 'Other Details',
  howToApply: 'How to apply',
} as const;

export type RecruitmentVendorFieldKey = keyof typeof RECRUITMENT_VENDOR_FIELD_LABELS;

export const RECRUITMENT_VENDOR_FIELD_ORDER: RecruitmentVendorFieldKey[] = [
  'jobId',
  'date',
  'role',
  'sector',
  'company',
  'budget',
  'location',
  'experience',
  'qualification',
  'otherDetails',
  'howToApply',
];

/** Lower-case email matcher used to locate an application email in text. */
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

/**
 * Extract the first email address from any of the supplied values, in order.
 * "How to apply" can hold a bare email, a sentence containing one, or a legacy
 * value in `applicationUrl`; this never invents an address and returns null
 * when none of the values contains a usable email.
 */
export function extractEmail(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (!text) continue;
    const match = text.match(EMAIL_PATTERN);
    if (match) return match[0];
  }
  return null;
}

/** True when the value contains an email address. */
export function containsEmail(value?: string | null): boolean {
  return extractEmail(value) !== null;
}

/**
 * Build a `mailto:` link for the Apply Now action. Opens the visitor's default
 * email application — never a browser URL. Subject/body are URI-encoded so
 * spaces and special characters survive.
 */
export function buildApplyMailto(
  email: string,
  options: { title?: string | null; company?: string | null } = {},
): string {
  const title = options.title?.trim() || 'this role';
  const company = options.company?.trim();
  const subject = `Application for ${title}${company ? ` at ${company}` : ''}`;
  const body = `Dear Hiring Team,\n\nI would like to apply for the ${title} role${
    company ? ` at ${company}` : ''
  }.\n\nPlease find my details below:\n\n\n\nBest regards,\n`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Mask the middle of a string so only the first and last characters remain
 * visible. Used to produce safe teaser previews of protected opportunity
 * fields (Qualification, Other Details, How to Apply) for users without
 * Vault access.
 *
 * Rules:
 * - null/undefined/empty  -> returns the value as-is (null stays null, '' stays '')
 * - 1 character           -> shown as-is
 * - 2 characters          -> shown as-is (first + last)
 * - 3+ characters         -> first char + '*' x (length - 2) + last char
 *
 * Examples:
 *   "Manager"                 -> "M*****r"
 *   "B.Tech"                  -> "B****h"
 *   "recruitment@example.com" -> "r*****************m"
 */
export function maskProtectedValue(value?: string | null): string | null {
  if (value === null || value === undefined) return value ?? null;
  const s = value.trim();
  if (s === '') return value;
  if (s.length <= 2) return s;
  return `${s[0]}${'*'.repeat(s.length - 2)}${s[s.length - 1]}`;
}

/**
 * Parse a value that may already be a number or may come straight from a text
 * input. Returns null for anything that is not a usable finite number.
 *
 * `Number('')` is 0, not NaN, so blank strings are rejected explicitly -
 * otherwise an empty admin input would look like a price of zero.
 */
function toFiniteNumber(value?: number | string | null): number | null {
  if (value === null || value === undefined) return null;

  const raw = typeof value === 'string' ? value.trim() : value;
  if (raw === '') return null;

  const parsed = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Canonical discount percentage for a subscription plan:
 *
 *   discount % = ((regularPrice - currentPrice) / regularPrice) x 100
 *
 * This is the single source of truth for the discount. The admin plan form uses
 * it for its read-only field and the API uses it for the value stored on the
 * plan, so the "% OFF" badge a visitor sees on the website always matches the
 * prices shown in the admin.
 *
 * Returns a whole number clamped to 0..100, so a negative or nonsensical
 * discount can never be produced. Invalid input yields 0 rather than throwing,
 * because the admin form calls this on every keystroke while a price field is
 * still half-typed.
 *
 * Rules:
 * - blank / non-numeric / non-finite price            -> 0
 * - regularPrice <= 0 (division by zero)               -> 0
 * - currentPrice < 0 (invalid, e.g. mid-typing)        -> 0
 * - currentPrice >= regularPrice (nothing is saved)    -> 0
 * - otherwise                                          -> rounded percentage
 *
 * Examples:
 *   regular 2999, current 2499 -> 17
 *   regular 1999, current 1499 -> 25
 *   regular 1499, current 1499 -> 0
 *   regular 1000, current 0    -> 100
 */
export function calculateDiscountPercentage(
  regularPrice?: number | string | null,
  currentPrice?: number | string | null,
): number {
  const regular = toFiniteNumber(regularPrice);
  const current = toFiniteNumber(currentPrice);

  if (regular === null || current === null) return 0;
  if (regular <= 0) return 0;
  if (current < 0) return 0;
  if (current >= regular) return 0;

  const percentage = Math.round(((regular - current) / regular) * 100);
  return Math.min(100, Math.max(0, percentage));
}
