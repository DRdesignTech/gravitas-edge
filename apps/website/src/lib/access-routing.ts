/**
 * Entitlement → routing rules shared by the auth provider, route guards and
 * the plans page.
 *
 * Rules (single source of truth):
 * - Dashboard access IS gated on holding at least one active plan (OV or RVA).
 *   Users without any active subscription are redirected to /plans after login.
 * - Vault (OV) and Recruitment Vendor Access (RVA) are independent products.
 *   An active subscription in either product grants dashboard access.
 * - The Vault plan-purchase banner only appears for signed-in users who hold
 *   neither entitlement.
 */

export interface AccessFlags {
  /** Active Opportunity Vault (OV) subscription. `null` while resolving or on error. */
  hasVaultAccess: boolean | null;
  /** Active Recruitment Vendor Access (RVA) subscription. `null` while resolving or on error. */
  hasRvaAccess: boolean | null;
}

/**
 * Combine the two independent entitlements into a single "has any active plan"
 * flag. `null` propagates while either side is still resolving or errored.
 */
export function combineAccess(
  hasVaultAccess: boolean | null,
  hasRvaAccess: boolean | null,
): boolean | null {
  if (hasVaultAccess === null || hasRvaAccess === null) return null;
  return hasVaultAccess || hasRvaAccess;
}

/**
 * Check if the user has at least one active subscription (OV or RVA).
 * Returns:
 *  - true  : has at least one active subscription
 *  - false : has no active subscriptions (both resolved to false)
 *  - null  : still loading or one/both fetches errored
 */
export function hasActiveSubscription(
  hasVaultAccess: boolean | null,
  hasRvaAccess: boolean | null,
): boolean | null {
  if (hasVaultAccess === null || hasRvaAccess === null) return null;
  return hasVaultAccess || hasRvaAccess;
}

/**
 * Where to send a user right after login or registration.
 * Redirects to /plans if the user has no active OV or RVA subscription.
 * Returns '/dashboard' if loading/error (null) or has active subscription.
 */
export function resolvePostLoginRoute(flags: AccessFlags): '/dashboard' | '/plans' {
  const active = hasActiveSubscription(flags.hasVaultAccess, flags.hasRvaAccess);
  if (active === false) return '/plans';
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
