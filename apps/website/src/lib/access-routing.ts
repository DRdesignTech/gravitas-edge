/**
 * Entitlement → routing rules shared by the auth provider, route guards and
 * the plans page.
 *
 * Rules (single source of truth):
 * - Dashboard access is NEVER gated on holding a plan. Any signed-in user —
 *   Vault subscriber, RVA subscriber, both, or neither — lands on /dashboard
 *   after login/registration.
 * - Vault (OV) and Recruitment Vendor Access (RVA) are independent products.
 *   An RVA subscriber must never be bounced to the Vault purchase screen, and
 *   an OV subscriber must never be bounced to the RVA purchase screen.
 * - The Vault plan-purchase banner only appears for signed-in users who hold
 *   neither entitlement.
 */

export interface AccessFlags {
  /** Active Opportunity Vault (OV) subscription. `null` while resolving. */
  hasVaultAccess: boolean | null;
  /** Active Recruitment Vendor Access (RVA) subscription. `null` while resolving. */
  hasRvaAccess: boolean | null;
}

/**
 * Combine the two independent entitlements into a single "has any active plan"
 * flag. `null` propagates while either side is still resolving.
 */
export function combineAccess(
  hasVaultAccess: boolean | null,
  hasRvaAccess: boolean | null,
): boolean | null {
  if (hasVaultAccess === null || hasRvaAccess === null) return null;
  return hasVaultAccess || hasRvaAccess;
}

/**
 * Where to send a user right after login or registration. Entitlement
 * independent: the dashboard is always reachable and paid content stays
 * locked in place according to its own rules.
 */
export function resolvePostLoginRoute(_flags: AccessFlags): '/dashboard' {
  return '/dashboard';
}

/**
 * Whether the Vault purchase nudge on /plans should be shown. Only signed-in
 * users with neither an OV nor an RVA subscription see it — subscribers of
 * either product are already served by their own vault and must not be pushed
 * towards an unrelated purchase.
 */
export function shouldShowVaultPlanBanner(flags: {
  signedIn: boolean;
  hasVaultAccess: boolean | null;
  hasRvaAccess: boolean | null;
}): boolean {
  if (!flags.signedIn) return false;
  return flags.hasVaultAccess === false && flags.hasRvaAccess === false;
}
