'use client';

import Link from 'next/link';
import { Opportunity, Vault } from '@/lib/types';
import { Badge, LockIcon, UnlockIcon } from '@/components/ui';
import {
  titleCase,
  formatDate,
  displayExperience,
  hasExperience,
  isMeaningful,
} from '@/lib/format';
import { OPPORTUNITY_FIELD_LABELS, extractEmail } from '@job-portal/shared';
import { useAuth } from '@/lib/auth';
import { LockNotice } from '@/components/LockNotice';
import {
  canRevealCompanyExperience,
  companyExperienceLockMessage,
  companyInitial,
  isCompanyWithheld,
  isExperienceWithheld,
} from '@/lib/opportunity-access';

export interface ProtectedField {
  label: string;
  value: string | null | undefined;
  isEmail?: boolean;
}

/**
 * Website-side masking helper for display purposes.
 * The API returns masked values (first/last char with stars), but we apply
 * additional formatting for better display: text truncation, word-break,
 * and email-like formatting for contact fields.
 */
export function formatMaskedValue(value: string | null | undefined, isEmail = false): string {
  if (!value) return '';
  // If the value already looks like it has email structure (contains @),
  // preserve that structure but mask the local part and domain.
  // Otherwise, return as-is (API already masked with first/last char).
  if (isEmail && value.includes('@')) {
    const [local, domain] = value.split('@');
    const maskedLocal =
      local.length > 2
        ? `${local[0]}${'*'.repeat(Math.min(local.length - 2, 6))}${local[local.length - 1]}`
        : local;
    const domainParts = domain.split('.');
    const maskedDomain = domainParts
      .map((part, i) => {
        if (i === domainParts.length - 1) return part; // Keep TLD
        return part.length > 2
          ? `${part[0]}${'*'.repeat(Math.min(part.length - 2, 4))}${part[part.length - 1]}`
          : part;
      })
      .join('.');
    return `${maskedLocal}@${maskedDomain}`;
  }
  return value;
}

/**
 * Protected opportunity fields (Qualification, Other Details, How to Apply —
 * UI fields 7-9). When the user lacks Vault access the API returns these only
 * as a masked `lockedPreview`; with access the full original values are shown.
 * The masked values come pre-sanitized from the server — never from the client.
 */
export function ProtectedFields({
  opportunity: o,
  showLock = true,
}: {
  opportunity: Opportunity;
  showLock?: boolean;
}) {
  const locked = !o.isFullAccess;

  const applyEmail = extractEmail(o.applicationContact, o.applicationUrl);
  const rows: ProtectedField[] = locked
    ? [
        { label: OPPORTUNITY_FIELD_LABELS.qualification, value: o.lockedPreview?.qualification },
        { label: OPPORTUNITY_FIELD_LABELS.otherDetails, value: o.lockedPreview?.otherDetails },
        {
          label: OPPORTUNITY_FIELD_LABELS.howToApply,
          value: o.lockedPreview?.howToApply,
          isEmail: true,
        },
      ]
    : [
        { label: OPPORTUNITY_FIELD_LABELS.qualification, value: o.qualification },
        { label: OPPORTUNITY_FIELD_LABELS.otherDetails, value: o.description },
        {
          label: OPPORTUNITY_FIELD_LABELS.howToApply,
          value: applyEmail || o.applicationContact || o.applicationUrl,
          isEmail: !!applyEmail,
        },
      ];

  return (
    <dl className="space-y-3.5">
      {rows.map((row) => {
        if (row.value === null || row.value === undefined || row.value === '') {
          if (!locked) return null;
          return (
            <div key={row.label} className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-content-faint">
                {row.label}
              </dt>
              <dd className="mt-1 inline-flex items-center gap-1.5 text-sm italic text-content-faint">
                {showLock && <LockIcon className="h-3.5 w-3.5" />}
                Vault Access
              </dd>
            </div>
          );
        }
        const displayValue = locked ? formatMaskedValue(row.value, row.isEmail) : row.value;
        return (
          <div key={row.label} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-content-faint">
              {row.label}
              {locked && showLock && (
                <LockIcon
                  className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400"
                  aria-label={`${row.label} locked`}
                />
              )}
            </dt>
            <dd
              className={`mt-1 whitespace-pre-line break-words text-sm leading-relaxed ${
                locked ? 'select-none text-content-faint' : 'text-content'
              }`}
            >
              {displayValue}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * Premium locked-access panel shown on premium opportunities the viewer cannot
 * open. The entire panel is a single, keyboard-accessible link to the relevant
 * Opportunity Vault (or the access-plans flow) and contains no nested
 * interactive elements. It never renders protected field values — only a
 * benefit summary.
 */
export function PremiumAccessPanel({
  vaultId,
  className = '',
  onClick,
  compact = false,
}: {
  vaultId?: string | null;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  compact?: boolean;
}) {
  const href = vaultId ? `/vaults/${vaultId}` : '/plans';

  if (compact) {
    return (
      <Link
        href={href}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
        }}
        aria-label="Unlock full opportunity details with Opportunity Vault access"
        className={`group/access relative flex items-center gap-3 overflow-hidden rounded-xl border border-brand-400/40 bg-gradient-to-br from-brand-50/80 via-surface to-surface p-3 shadow-[0_16px_40px_-28px_rgba(200,148,62,0.6)] transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:border-brand-400/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface dark:border-brand-400/25 dark:from-brand-950/40 dark:via-surface-elevated dark:to-surface-elevated ${className}`}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(200,148,62,0.16), transparent 70%)' }}
        />
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#061B36] to-[#061B36] text-[#E3B968] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-inset ring-brand-400/40">
          <LockIcon className="h-4 w-4" />
        </span>
        <div className="relative min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500 dark:text-brand-300">
            Premium Access
          </p>
          <p className="text-[13px] font-bold leading-snug text-content">Unlock full details</p>
        </div>
        <span
          aria-hidden="true"
          className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-300 to-brand-400 text-white shadow-[0_8px_18px_-10px_rgba(200,148,62,0.95)] transition-transform duration-200 group-hover/access:translate-x-0.5"
        >
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
      }}
      aria-label="Unlock full opportunity details with Opportunity Vault access"
      className={`group/access relative block overflow-hidden rounded-2xl border border-brand-400/40 bg-gradient-to-br from-brand-50/80 via-surface to-surface p-4 shadow-[0_16px_40px_-28px_rgba(200,148,62,0.6)] transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:border-brand-400/70 hover:shadow-[0_22px_48px_-26px_rgba(200,148,62,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:translate-y-0 dark:border-brand-400/25 dark:from-brand-950/40 dark:via-surface-elevated dark:to-surface-elevated ${className}`}
    >
      {/* Soft gold glow + refined decorative curves (CSS only) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(200,148,62,0.16), transparent 70%)' }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full border border-brand-400/20"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-1 -top-3 h-14 w-14 rounded-full border border-brand-400/15"
      />

      <div className="relative flex items-start gap-3.5">
        {/* Circular layered lock icon */}
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#061B36] to-[#061B36] text-[#E3B968] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-inset ring-brand-400/40">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 rounded-full border border-brand-400/30"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-2.5 rounded-full border border-brand-400/15"
          />
          <LockIcon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-300">
            Premium Access
          </p>
          <h4 className="mt-1 text-[15px] font-bold leading-snug text-content">
            Unlock Full Opportunity Details
          </h4>
          <p className="mt-1.5 text-[13px] leading-relaxed text-content-muted">
            View qualification, other details, how to apply and direct contact information.
          </p>
        </div>

        {/* Gold arrow — decorative; the whole panel is the single link */}
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-300 to-brand-400 text-white shadow-[0_8px_18px_-10px_rgba(200,148,62,0.95)] transition-transform duration-200 group-hover/access:translate-x-0.5"
        >
          <ArrowRightIcon className="h-4 w-4" />
        </span>
      </div>

      <div className="relative mt-3.5 flex flex-wrap gap-1.5 border-t border-brand-400/20 pt-3">
        <BenefitChip icon={<ShieldCheckIcon className="h-3.5 w-3.5" />}>
          Full Qualification
        </BenefitChip>
        <BenefitChip icon={<StepsIcon className="h-3.5 w-3.5" />}>Application Steps</BenefitChip>
        <BenefitChip icon={<ContactIcon className="h-3.5 w-3.5" />}>Direct Contact</BenefitChip>
      </div>
    </Link>
  );
}

function BenefitChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-400/25 bg-surface/70 px-2.5 py-1 text-[11px] font-semibold text-content-muted dark:bg-surface/50">
      <span className="shrink-0 text-brand-500 dark:text-brand-300">{icon}</span>
      {children}
    </span>
  );
}

export function OpportunityCard({
  opportunity: o,
  static: isStatic = false,
}: {
  opportunity: Opportunity;
  static?: boolean;
}) {
  const inner = (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#C8943E] to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold leading-snug text-content group-hover:text-brand-700 dark:group-hover:text-brand-300">
                {o.title}
              </h3>
            </div>
          </div>
          {o.isPremium ? (
            <Badge variant="premium">Premium</Badge>
          ) : (
            <Badge variant="success">Open</Badge>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {o.salary && (
            <MetaChip>
              {o.salary}
            </MetaChip>
          )}
          {o.jobId && (
            <MetaChip icon={<IdIcon className="h-3.5 w-3.5" />}>
              {OPPORTUNITY_FIELD_LABELS.jobId}: {o.jobId}
            </MetaChip>
          )}
          {o.vaults?.map((v) => (
            <MetaChip key={v.id} icon={<VaultIcon className="h-3.5 w-3.5" />}>
              {v.name}
            </MetaChip>
          ))}
          {o.location && (
            <MetaChip icon={<PinIcon className="h-3.5 w-3.5" />}>{o.location}</MetaChip>
          )}
          {o.country && (
            <MetaChip icon={<GlobeIcon className="h-3.5 w-3.5" />}>{o.country}</MetaChip>
          )}
          {o.industry && (
            <MetaChip icon={<LayersIcon className="h-3.5 w-3.5" />}>{o.industry}</MetaChip>
          )}
          {o.employmentType && (
            <MetaChip icon={<BriefcaseIcon className="h-3.5 w-3.5" />}>
              {titleCase(o.employmentType)}
            </MetaChip>
          )}
        </div>

        {o.isPremium &&
          (o.isFullAccess ? (
            <div className="mt-4 rounded-xl border border-brand-200/70 bg-gradient-to-br from-brand-50/40 via-surface to-surface p-3.5 dark:border-brand-500/20 dark:from-brand-500/[0.06] dark:via-surface-elevated dark:to-surface-elevated">
              <div className="mb-2.5 flex items-center gap-1.5">
                <UnlockIcon className="h-3.5 w-3.5 shrink-0 text-brand-600/80 dark:text-brand-400/80" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-content-faint">
                  Full access details
                </span>
              </div>
              <ProtectedFields opportunity={o} showLock={false} />
            </div>
          ) : (
            <PremiumAccessPanel vaultId={o.vaults?.[0]?.id} compact className="mt-4" />
          ))}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
          <Badge variant="info">{titleCase(o.category)}</Badge>
          <span className="text-xs text-content-faint">
            {o.publishedDate ? formatDate(o.publishedDate) : ''}
          </span>
        </div>
      </div>
    </>
  );

  // Locked premium cards are not a link themselves — the premium access panel
  // inside them is the single clickable target (avoids nested links).
  const lockedPremium = !!o.isPremium && !o.isFullAccess;
  const wrapper = 'group card-premium relative flex h-full flex-col overflow-hidden rounded-2xl';

  if (isStatic || lockedPremium) {
    return <div className={wrapper}>{inner}</div>;
  }

  return (
    <Link href={`/opportunities/${o.id}`} className={wrapper}>
      {inner}
    </Link>
  );
}

export function OpportunityRow({ opportunity: o }: { opportunity: Opportunity }) {
  const { hasVaultAccess } = useAuth();
  const canReveal = canRevealCompanyExperience(o, hasVaultAccess);
  const lockMessage = companyExperienceLockMessage(o);
  return (
    <Link
      href={`/opportunities/${o.id}`}
      className="group card-premium flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-4">
        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-base font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          {companyInitial(o, canReveal)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-content group-hover:text-brand-700 dark:group-hover:text-brand-300">
              {o.title}
            </h3>
            {o.isPremium && <Badge variant="premium">Premium</Badge>}
          </div>
          {isCompanyWithheld(o, canReveal) ? (
            <p className="mt-0.5">
              <LockNotice message={lockMessage} />
            </p>
          ) : (
            o.company && <p className="mt-0.5 text-sm text-content-muted">{o.company}</p>
          )}
          {isMeaningful(o.salary) && (
            <p
              className="mt-1.5 text-sm font-bold text-brand-700 dark:text-brand-300"
              title={o.salary}
            >
              {o.salary}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-content-muted">
            {o.jobId && (
              <span className="inline-flex items-center gap-1.5">
                <IdIcon className="h-4 w-4" /> {OPPORTUNITY_FIELD_LABELS.jobId}: {o.jobId}
              </span>
            )}
            {o.location && (
              <span className="inline-flex items-center gap-1.5">
                <PinIcon className="h-4 w-4" /> {o.location}
              </span>
            )}
            {o.country && (
              <span className="inline-flex items-center gap-1.5">
                <GlobeIcon className="h-4 w-4" /> {o.country}
              </span>
            )}
            {o.industry && (
              <span className="inline-flex items-center gap-1.5">
                <LayersIcon className="h-4 w-4" /> {o.industry}
              </span>
            )}
            {o.employmentType && (
              <span className="inline-flex items-center gap-1.5">
                <BriefcaseIcon className="h-4 w-4" /> {titleCase(o.employmentType)}
              </span>
            )}
            {isExperienceWithheld(o, canReveal) ? (
              <LockNotice message={lockMessage} />
            ) : (
              hasExperience(o.experienceText, o.minExperience, o.maxExperience) && (
                <span className="inline-flex items-center gap-1.5">
                  <BarsIcon className="h-4 w-4" />{' '}
                  {displayExperience(o.experienceText, o.minExperience, o.maxExperience)}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="info">{titleCase(o.category)}</Badge>
          {o.publishedDate && (
            <span className="hidden text-xs text-content-faint md:inline">
              {formatDate(o.publishedDate)}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
          View role
          <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function MetaChip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-line bg-surface-muted/70 px-2.5 py-1 text-xs font-medium text-content-muted dark:bg-surface">
      <span className="shrink-0 text-content-faint">{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

function ArrowRightIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

/* Vault-specific glyphs. Inline Lucide-style SVGs — CSS/inline only, no image
   assets and no new dependencies. Falls back to the generic VaultIcon. */
export function VaultGlyph({ name, className = 'h-7 w-7' }: { name: string; className?: string }) {
  const n = name.toLowerCase();
  const base: React.SVGProps<SVGSVGElement> = {
    className,
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  if (n.includes('remote')) {
    return (
      <svg {...base}>
        <path d="M21.54 15H17a2 2 0 0 0-2 2v4.54" />
        <path d="M7 3.34V5a3 3 0 0 0 3 3 2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17" />
        <path d="M11 21.95V18a2 2 0 0 0-2-2 2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    );
  }
  if (n.includes('uae') || n.includes('global')) {
    return (
      <svg {...base}>
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
        <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
      </svg>
    );
  }
  if (n.includes('executive')) {
    return (
      <svg {...base}>
        <path d="M12 12h.01" />
        <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <path d="M22 13a18.15 18.15 0 0 1-20 0" />
        <rect width="20" height="14" x="2" y="6" rx="2" />
      </svg>
    );
  }
  if (n.includes('leadership')) {
    return (
      <svg {...base}>
        <path d="M18 21a8 8 0 0 0-16 0" />
        <circle cx="10" cy="8" r="5" />
        <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />
      </svg>
    );
  }
  if (n.includes('management')) {
    return (
      <svg {...base}>
        <path d="M12 16v5" />
        <path d="M16 14v7" />
        <path d="M20 10v11" />
        <path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15" />
        <path d="M4 18v3" />
        <path d="M8 14v7" />
      </svg>
    );
  }
  if (n.includes('early') || n.includes('career')) {
    return (
      <svg {...base}>
        <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
        <path d="M22 10v6" />
        <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
      </svg>
    );
  }
  return <VaultIcon className={className} />;
}

function AccessPill({ locked }: { locked: boolean }) {
  if (locked) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30">
        <LockIcon className="h-3 w-3" />
        Locked
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30">
      <UnlockIcon className="h-3 w-3" />
      Unlocked
    </span>
  );
}

export function VaultCard({
  vault: v,
  recommended = false,
}: {
  vault: Vault;
  recommended?: boolean;
}) {
  const unlocked = !v.locked;
  const href = unlocked ? `/opportunities?vaultId=${encodeURIComponent(v.id)}` : `/vaults/${v.id}`;
  const actionText = v.locked
    ? 'Browse jobs free · Full details via subscription'
    : 'Open the jobs included with your access';

  return (
    <Link
      href={href}
      className={`group relative flex h-full flex-col rounded-2xl border bg-gradient-to-b from-surface to-surface-muted p-5 transition-all duration-200 ease-premium hover:-translate-y-1 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:p-6 dark:from-surface-elevated dark:to-surface ${
        recommended
          ? 'border-brand-400/70 shadow-[0_18px_44px_-26px_rgba(200,148,62,0.55)] hover:border-brand-400'
          : 'border-line hover:border-brand-400/55'
      }`}
    >
      {/* Decorative background — CSS only, sits behind content */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      >
        <span
          className="absolute -right-14 -top-14 h-44 w-44 rounded-full opacity-90 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: 'radial-gradient(circle, rgba(200,148,62,0.18), transparent 68%)' }}
        />
        <span className="absolute -right-7 -top-7 h-28 w-28 rounded-full border border-brand-400/20" />
        <span className="absolute -right-1 -top-1 h-16 w-16 rounded-full border border-brand-400/15" />
      </span>

      {recommended && (
        <span className="absolute left-5 top-0 z-10 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-brand-300 to-brand-400 px-2.5 py-0.5 text-[11px] font-semibold text-[#061B36] shadow-sm ring-1 ring-inset ring-white/50">
          <SparkleIcon className="h-3 w-3" />
          Recommended for you
        </span>
      )}

      {/* Header: gold glyph in navy tile, bold title, access badge */}
      <div className="relative flex items-start gap-3.5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#061B36] to-brand-600 text-[#E3B968] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_12px_22px_-14px_rgba(6,27,54,0.85)] ring-1 ring-inset ring-brand-400/35 transition-all duration-200 group-hover:text-[#F1CE82] group-hover:ring-brand-400/70">
          <VaultGlyph name={v.name} />
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h3 className="min-w-0 text-[1.0625rem] font-bold leading-snug text-content sm:text-lg">
            {v.name}
          </h3>
          <AccessPill locked={!!v.locked} />
        </div>
      </div>

      {v.description && (
        <p className="relative mt-4 flex-1 text-sm leading-relaxed text-content-muted">
          {v.description}
        </p>
      )}

      {/* Action area: existing action text + gold circular arrow */}
      <div className="relative mt-auto flex items-end justify-between gap-4 border-t border-line pt-4">
        <span className="text-xs font-medium leading-relaxed text-content-muted sm:text-[13px]">
          {actionText}
        </span>
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E3B968] to-brand-400 text-white shadow-[0_10px_20px_-10px_rgba(200,148,62,0.9)] ring-1 ring-inset ring-white/30 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:scale-[1.05]"
        >
          <ArrowRightIcon className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

/* small icon set */
export function PinIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
      />
    </svg>
  );
}

export function BriefcaseIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z"
      />
    </svg>
  );
}

export function LayersIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3"
      />
    </svg>
  );
}

export function GlobeIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3 7.5 7.03 7.5 12s2.015 9 4.5 9z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 12h16.8" />
    </svg>
  );
}

export function BarsIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    </svg>
  );
}

export function IdIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <rect x="2.25" y="5.25" width="19.5" height="13.5" rx="2.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9.75h4M6 13.5h6" />
      <circle cx="16.5" cy="10.5" r="2.25" />
    </svg>
  );
}

export function VaultIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}

export function SearchIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

export function SparkleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l1.1 5.5L18 9l-4.9 1.5L12 16l-1.1-5.5L6 9l4.9-1.5L12 2zm6.5 10l.6 2.9L22 15l-2.9.9L18.5 19l-.6-3.1L15 15l2.9-.9L18.5 12zM5.5 12l.6 2.9L9 15l-2.9.9L5.5 19l-.6-3.1L2 15l2.9-.9L5.5 12z" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function StepsIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 17 2 2 4-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 7 2 2 4-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 6h8M13 12h8M13 18h8" />
    </svg>
  );
}

export function ContactIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
      />
    </svg>
  );
}

export function ArrowLeftIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

export function CopyIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

export function ExternalLinkIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
