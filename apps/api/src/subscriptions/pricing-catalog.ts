/**
 * Gravitas Edge pricing catalog.
 *
 * Exactly 6 business vaults, each with exactly 3 duration offers (Monthly,
 * 3 Months, 6 Months) => 18 purchasable plans, each linked to exactly one vault.
 *
 * Every offer carries COMPLETE pricing information:
 *   - regularPrice       the original / list price (display only)
 *   - price (discounted) the ACTUAL amount charged to the customer
 *   - discountPercentage the displayed discount (stored, never recomputed)
 *
 * Server-side single source of truth. Consumed by:
 *   - the public pricing endpoint (GET /subscriptions/pricing)
 *   - the purchase flow (POST /subscriptions/purchase)
 *   - the idempotent catalog sync (see pricing-catalog.sync.ts) used by the
 *     data migration and the dev seed
 *
 * This file is plain TS (no decorators) so it can also be imported by the
 * standalone prisma seed (ts-node) without pulling NestJS decorators.
 */
import { VaultType } from '@prisma/client';

export interface PricingOffer {
  label: string;
  durationDays: number;
  /** Original / list price (never used for payment). */
  regularPrice: number;
  /** Actual amount charged to the customer. */
  price: number;
  /** Displayed discount percentage, 0..100. */
  discountPercentage: number;
}

export interface BusinessVaultDefinition {
  name: string;
  /** Legacy/alternative names the record may currently be stored under. */
  aliases: string[];
  description: string;
  type: VaultType;
  sortOrder: number;
  plans: PricingOffer[];
}

export const MONTHLY = { label: 'Monthly', durationDays: 30 };
export const THREE_MONTHS = { label: '3 Months', durationDays: 90 };
export const SIX_MONTHS = { label: '6 Months', durationDays: 180 };

export const PLAN_LABELS = [MONTHLY.label, THREE_MONTHS.label, SIX_MONTHS.label];

export const DURATION_LABELS: Record<number, string> = {
  30: MONTHLY.label,
  90: THREE_MONTHS.label,
  180: SIX_MONTHS.label,
};

/** Human-readable duration label for a duration in days (30/90/180 = catalog). */
export function durationLabel(durationDays: number): string {
  return DURATION_LABELS[durationDays] ?? `${durationDays} Days`;
}

/** Deterministic plan name for a vault + offer. */
export function planName(vaultName: string, offerLabel: string): string {
  return `${vaultName} · ${offerLabel}`;
}

export const PRICING_CATALOG: BusinessVaultDefinition[] = [
  {
    name: 'Remote Access Vault',
    aliases: ['Remote Access'],
    description: 'Curated remote and cross-border roles from international companies.',
    type: VaultType.INTERNATIONAL,
    sortOrder: 1,
    plans: [
      { ...MONTHLY, regularPrice: 1999, price: 1499, discountPercentage: 25 },
      { ...THREE_MONTHS, regularPrice: 5999, price: 4999, discountPercentage: 17 },
      { ...SIX_MONTHS, regularPrice: 11999, price: 10299, discountPercentage: 14 },
    ],
  },
  {
    name: 'UAE & Global Access Vault',
    aliases: ['UAE & GCC Access', 'UAE & Global Access'],
    description: 'Premium opportunities across the UAE, GCC and global markets.',
    type: VaultType.MIDDLE_EAST,
    sortOrder: 2,
    plans: [
      { ...MONTHLY, regularPrice: 2499, price: 1999, discountPercentage: 20 },
      { ...THREE_MONTHS, regularPrice: 7499, price: 5999, discountPercentage: 20 },
      { ...SIX_MONTHS, regularPrice: 14999, price: 11999, discountPercentage: 20 },
    ],
  },
  {
    name: 'Executive Access Vault',
    aliases: ['Executive Access'],
    description: 'Executive search and C-suite opportunities.',
    type: VaultType.INDIA,
    sortOrder: 3,
    plans: [
      { ...MONTHLY, regularPrice: 2999, price: 2499, discountPercentage: 17 },
      { ...THREE_MONTHS, regularPrice: 8999, price: 7499, discountPercentage: 17 },
      { ...SIX_MONTHS, regularPrice: 17999, price: 15499, discountPercentage: 14 },
    ],
  },
  {
    name: 'Leadership Access Vault',
    aliases: ['Leadership Access'],
    description: 'Senior leadership and management roles.',
    type: VaultType.INDIA,
    sortOrder: 4,
    plans: [
      { ...MONTHLY, regularPrice: 1499, price: 999, discountPercentage: 33 },
      { ...THREE_MONTHS, regularPrice: 4499, price: 3499, discountPercentage: 22 },
      { ...SIX_MONTHS, regularPrice: 8999, price: 6999, discountPercentage: 22 },
    ],
  },
  {
    name: 'Management Access Vault',
    aliases: ['Management Access'],
    description: 'Mid-level and management track opportunities.',
    type: VaultType.INDIA,
    sortOrder: 5,
    plans: [
      { ...MONTHLY, regularPrice: 799, price: 599, discountPercentage: 25 },
      { ...THREE_MONTHS, regularPrice: 2399, price: 1949, discountPercentage: 19 },
      { ...SIX_MONTHS, regularPrice: 4799, price: 3699, discountPercentage: 23 },
    ],
  },
  {
    name: 'Early Career Access Vault',
    aliases: ['Early Career Access'],
    description: 'Foundational roles for early-career professionals.',
    type: VaultType.INDIA,
    sortOrder: 6,
    plans: [
      { ...MONTHLY, regularPrice: 499, price: 299, discountPercentage: 40 },
      { ...THREE_MONTHS, regularPrice: 1399, price: 999, discountPercentage: 29 },
      { ...SIX_MONTHS, regularPrice: 2699, price: 2199, discountPercentage: 19 },
    ],
  },
];

/** Canonical vault names, for lookups and UI ordering (catalog order). */
export const BUSINESS_VAULT_NAMES: string[] = PRICING_CATALOG.map((v) => v.name);

/** Plans that predate the vault pricing matrix; archived, never deleted. */
export const LEGACY_PLAN_NAMES: string[] = [
  'India Access Plan',
  'Global Access Plan',
  'All Access Plan',
];

/**
 * Vault names that are NOT part of the vault pricing matrix. They are kept for
 * historical reference but archived (status ARCHIVED + deletedAt) so they never
 * surface in the public catalog but never break existing FK references either.
 */
export const NON_CATALOG_VAULT_NAMES: string[] = [
  'India Career',
  'India Professional',
  'India Leadership',
  'India Executive',
  'Global Access',
  'Middle East Opportunities',
  'International Opportunities',
  'India Access',
];

/**
 * Validates a single pricing offer against the business rules.
 * Throws an Error (used by seed/sync) describing the first violation.
 */
export function assertValidOffer(vaultName: string, offer: PricingOffer): void {
  const where = `${vaultName} · ${offer.label}`;
  if (!Number.isFinite(offer.regularPrice) || offer.regularPrice < 0) {
    throw new Error(`[pricing] ${where}: regularPrice must be >= 0`);
  }
  if (!Number.isFinite(offer.price) || offer.price < 0) {
    throw new Error(`[pricing] ${where}: discounted price must be >= 0`);
  }
  if (offer.price > offer.regularPrice) {
    throw new Error(`[pricing] ${where}: discounted price cannot exceed regular price`);
  }
  if (
    !Number.isInteger(offer.discountPercentage) ||
    offer.discountPercentage < 0 ||
    offer.discountPercentage > 100
  ) {
    throw new Error(`[pricing] ${where}: discountPercentage must be an integer 0..100`);
  }
  if (!offer.durationDays || offer.durationDays <= 0) {
    throw new Error(`[pricing] ${where}: duration must be > 0`);
  }
}

// ---------------------------------------------------------------------------
// Deterministic surrogate ids used by the idempotent data migration and local
// seeding. Kept in one place so the SQL migration and the TS sync never drift.
// ---------------------------------------------------------------------------

function hex3(n: number): string {
  return n.toString(16).padStart(3, '0');
}

/** Deterministic UUID per catalog index (1-based). */
export function catalogVaultId(index: number): string {
  return `11111111-1111-4111-8111-11111111${hex3(index)}1`;
}

/** Deterministic UUID per (catalog index, offer index). */
export function catalogPlanId(vaultIndex: number, offerIndex: number): string {
  return `22222222-2222-4222-8222-222222${hex3(vaultIndex)}${hex3(offerIndex)}`;
}
