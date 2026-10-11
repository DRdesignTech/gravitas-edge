'use client';

import Link from 'next/link';
import { Opportunity, Vault } from '@/lib/types';
import { Badge, AccessBadge, LockIcon, UnlockIcon } from '@/components/ui';
import { titleCase, formatDate, displayExperience, hasExperience, isMeaningful } from '@/lib/format';

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
    const maskedLocal = local.length > 2 ? `${local[0]}${'*'.repeat(Math.min(local.length - 2, 6))}${local[local.length - 1]}` : local;
    const domainParts = domain.split('.');
    const maskedDomain = domainParts.map((part, i) => {
      if (i === domainParts.length - 1) return part; // Keep TLD
      return part.length > 2 ? `${part[0]}${'*'.repeat(Math.min(part.length - 2, 4))}${part[part.length - 1]}` : part;
    }).join('.');
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

  const rows: ProtectedField[] = locked
    ? [
        { label: 'Qualification', value: o.lockedPreview?.qualification },
        { label: 'Other Details', value: o.lockedPreview?.otherDetails },
        { label: 'How to Apply', value: o.lockedPreview?.howToApply, isEmail: true },
        { label: 'Application Contact', value: o.lockedPreview?.applicationContact, isEmail: true },
      ]
    : [
        { label: 'Qualification', value: o.qualification },
        { label: 'Other Details', value: o.description },
        { label: 'How to Apply', value: o.applicationUrl || o.applicationContact, isEmail: !o.applicationUrl && !!o.applicationContact },
        { label: 'Application Contact', value: o.applicationContact, isEmail: true },
      ];

  return (
    <dl className="space-y-2">
      {rows.map((row) => {
        if (row.value === null || row.value === undefined || row.value === '') {
          if (!locked) return null;
          return (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <dt className="text-xs font-medium uppercase tracking-wider text-content-faint">
                {row.label}
              </dt>
              <dd className="inline-flex items-center gap-1 text-sm italic text-content-faint">
                {showLock && <LockIcon className="h-3.5 w-3.5" />}
                Vault Access
              </dd>
            </div>
          );
        }
        const displayValue = locked ? formatMaskedValue(row.value, row.isEmail) : row.value;
        return (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-xs font-medium uppercase tracking-wider text-content-faint">
              {row.label}
            </dt>
            <dd className="flex min-w-0 items-center gap-1.5 text-right text-sm text-content truncate">
              <span className={locked ? 'select-none text-content-faint truncate' : 'truncate'} style={{ maxWidth: '100%' }}>
                {displayValue}
              </span>
              {locked && showLock && (
                <LockIcon
                  className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                  aria-label={`${row.label} locked`}
                />
              )}
            </dd>
          </div>
        );
      })}
    </dl>
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
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-600 to-brand-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:from-brand-400 dark:to-brand-300" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-base font-bold text-white shadow-sm dark:from-brand-400 dark:to-brand-300">
              {(o.company || o.title || '?')[0]?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold leading-snug text-content group-hover:text-brand-700 dark:group-hover:text-brand-300">
                {o.title}
              </h3>
              {o.company && (
                <p className="mt-0.5 truncate text-sm text-content-muted">{o.company}</p>
              )}
            </div>
          </div>
          {o.isPremium ? (
            <Badge variant="premium">Premium</Badge>
          ) : (
            <Badge variant="success">Open</Badge>
          )}
        </div>

        {isMeaningful(o.salary) ? (
          <p
            className="mt-4 truncate text-base font-bold text-brand-700 dark:text-brand-300"
            title={o.salary}
          >
            {o.salary}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5">
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
          {hasExperience(o.experienceText, o.minExperience, o.maxExperience) && (
            <MetaChip icon={<BarsIcon className="h-3.5 w-3.5" />}>
              {displayExperience(o.experienceText, o.minExperience, o.maxExperience)}
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
            <div className="mt-4 rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/50 via-surface to-surface p-3.5 dark:border-amber-500/20 dark:from-amber-500/[0.06] dark:via-surface-elevated dark:to-surface-elevated">
              <div className="mb-2.5 flex items-center gap-1.5">
                <LockIcon className="h-3.5 w-3.5 shrink-0 text-amber-600/80 dark:text-amber-400/80" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-content-faint">
                  Unlock full details
                </span>
              </div>
              <ProtectedFields opportunity={o} />
            </div>
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

  const wrapper = `group card-premium relative flex h-full flex-col overflow-hidden rounded-2xl`;

  if (isStatic) {
    return <div className={wrapper}>{inner}</div>;
  }

  return (
    <Link href={`/opportunities/${o.id}`} className={wrapper}>
      {inner}
    </Link>
  );
}

export function OpportunityRow({ opportunity: o }: { opportunity: Opportunity }) {
  return (
    <Link
      href={`/opportunities/${o.id}`}
      className="group card-premium flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-4">
        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-base font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          {(o.company || o.title || '?')[0]?.toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-content group-hover:text-brand-700 dark:group-hover:text-brand-300">
              {o.title}
            </h3>
            {o.isPremium && <Badge variant="premium">Premium</Badge>}
          </div>
          {o.company && <p className="mt-0.5 text-sm text-content-muted">{o.company}</p>}
          {isMeaningful(o.salary) && (
            <p
              className="mt-1.5 text-sm font-bold text-brand-700 dark:text-brand-300"
              title={o.salary}
            >
              {o.salary}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-content-muted">
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
            {hasExperience(o.experienceText, o.minExperience, o.maxExperience) && (
              <span className="inline-flex items-center gap-1.5">
                <BarsIcon className="h-4 w-4" />{' '}
                {displayExperience(o.experienceText, o.minExperience, o.maxExperience)}
              </span>
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

export function VaultCard({
  vault: v,
  recommended = false,
}: {
  vault: Vault;
  recommended?: boolean;
}) {
  const unlocked = !v.locked;
  return (
    <Link
      href={unlocked ? `/opportunities?vaultId=${encodeURIComponent(v.id)}` : `/vaults/${v.id}`}
      className={`group card-premium relative flex h-full flex-col rounded-2xl p-5 ${
        recommended
          ? 'border-brand-400 ring-2 ring-brand-500/25 dark:border-brand-500/70 dark:ring-brand-400/20'
          : v.locked
            ? ''
            : 'border-brand-200 dark:border-brand-500/40'
      }`}
    >
      {recommended && (
        <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/30">
          <SparkleIcon className="h-3 w-3" />
          Recommended for you
        </span>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              v.locked
                ? 'bg-surface-muted text-content-faint'
                : 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300'
            }`}
          >
            {v.locked ? <LockIcon className="h-5 w-5" /> : <VaultIcon className="h-5 w-5" />}
          </span>
          <h3 className="font-semibold text-content">{v.name}</h3>
        </div>
        <AccessBadge locked={v.locked ?? false} />
      </div>

      {v.description && <p className="mt-3 text-sm text-content-muted">{v.description}</p>}

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span
          className={`text-xs font-medium ${
            v.locked
              ? 'text-content-faint group-hover:text-brand-600 dark:group-hover:text-brand-300'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {v.locked
            ? 'Browse jobs free · Full details via subscription'
            : 'Open the jobs included with your access'}
        </span>
        <ArrowRightIcon className="h-4 w-4 shrink-0 text-brand-500/70 transition-transform duration-200 group-hover:translate-x-0.5" />
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
