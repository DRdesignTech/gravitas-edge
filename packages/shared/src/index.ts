/**
 * Shared types and utilities used across website, admin, and api.
 * Not business-specific; common contracts only.
 */

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
