import { hasExperience, isMeaningful } from './format';

export interface CompanyExperienceScope {
  company?: string | null;
  title?: string | null;
  experienceText?: string | null;
  minExperience?: number | null;
  maxExperience?: number | null;
  isPremium?: boolean;
  isFullAccess?: boolean;
  vaults?: Array<{ id: string }> | null;
}

/**
 * Company Name and Experience (UI fields 2 and 6) are only rendered when the
 * viewer holds a valid Opportunity Vault purchase and the server reports full
 * access for this specific opportunity.
 *
 * `hasVaultAccess` comes from `useAuth()` (server-verified active subscription,
 * null while resolving) and `isFullAccess` comes from the API per opportunity,
 * so a purchase for one vault never reveals details of another vault and an
 * expired subscription reveals nothing.
 */
export function canRevealCompanyExperience(
  opportunity: CompanyExperienceScope | null | undefined,
  hasVaultAccess: boolean | null | undefined,
): boolean {
  if (hasVaultAccess !== true) return false;
  if (!opportunity) return false;
  return opportunity.isFullAccess === true;
}

export function companyExperienceLockMessage(
  opportunity: CompanyExperienceScope | null | undefined,
): string {
  return opportunity?.isPremium
    ? 'Purchase this vault to unlock company and experience details'
    : 'Company and experience details are available with an active subscription';
}

export function isCompanyWithheld(
  opportunity: CompanyExperienceScope | null | undefined,
  canReveal: boolean,
): boolean {
  return !canReveal && isMeaningful(opportunity?.company);
}

export function isExperienceWithheld(
  opportunity: CompanyExperienceScope | null | undefined,
  canReveal: boolean,
): boolean {
  if (canReveal || !opportunity) return false;
  return hasExperience(
    opportunity.experienceText,
    opportunity.minExperience,
    opportunity.maxExperience,
  );
}

export function companyInitial(
  opportunity: CompanyExperienceScope | null | undefined,
  canReveal: boolean,
): string {
  const source =
    (canReveal && isMeaningful(opportunity?.company) ? opportunity?.company : null) ||
    opportunity?.title ||
    '?';
  return (source[0] ?? '?').toUpperCase();
}
