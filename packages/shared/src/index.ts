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
