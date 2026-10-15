import { RecruitmentVendorCategory } from '@prisma/client';

/**
 * Stable namespace key for the Recruitment Vendor Access vault. Kept in sync
 * with `RECRUITMENT_VENDOR_VAULT_KEY` in @job-portal/shared.
 */
export const RECRUITMENT_VENDOR_VAULT_KEY = 'recruitment-vendor-access';

/**
 * Canonical RVA opportunity categories, mapped to the Prisma enum. The label is
 * the client-facing name used by the website/admin (phase 2/3).
 */
export const RECRUITMENT_VENDOR_CATEGORY_LABELS: Record<RecruitmentVendorCategory, string> = {
  VENDOR_ENABLEMENT: 'Vendor Enablement',
  RFP_EOI_RFQ: 'RFP / EOI / RFQ',
  STAFFING_RPO: 'Staffing & RPO',
  EXECUTIVE_SEARCH: 'Executive Search',
  OTHER: 'Other',
};

export const RECRUITMENT_VENDOR_CATEGORY_VALUES: RecruitmentVendorCategory[] = [
  'VENDOR_ENABLEMENT',
  'RFP_EOI_RFQ',
  'STAFFING_RPO',
  'EXECUTIVE_SEARCH',
  'OTHER',
];

/**
 * Default validity window for RVA plans, in days. Mirrors the client reference
 * durations (1 / 3 / 6 months). Plan prices/promotions always come from the
 * database; these are only duration constants, never prices.
 */
export const RECRUITMENT_VENDOR_DURATION_DAYS = {
  ONE_MONTH: 30,
  THREE_MONTHS: 90,
  SIX_MONTHS: 180,
} as const;
