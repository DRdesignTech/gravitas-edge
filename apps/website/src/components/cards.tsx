'use client';

import Link from 'next/link';
import { Opportunity, Vault } from '@/lib/types';
import ContentProtection from '@/components/ContentProtection';
import { Badge, AccessBadge, LockIcon } from '@/components/ui';
import { titleCase, experienceLabel, formatDate } from '@/lib/format';

export function OpportunityCard({ opportunity: o }: { opportunity: Opportunity }) {
  return (
    <Link
      href={`/opportunities/${o.id}`}
      className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover dark:bg-surface-elevated dark:hover:border-brand-500/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-content group-hover:text-brand-700 dark:group-hover:text-brand-300">
            {o.title}
          </h3>
          {o.company && <p className="mt-0.5 truncate text-sm text-content-muted">{o.company}</p>}
        </div>
        {o.isPremium ? (
          <Badge variant="premium">Premium</Badge>
        ) : (
          <Badge variant="success">Free</Badge>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-content-muted">
        {o.location && (
          <p className="flex items-center gap-2">
            <PinIcon className="h-4 w-4" /> {o.location}
          </p>
        )}
        {o.employmentType && (
          <p className="flex items-center gap-2">
            <BriefcaseIcon className="h-4 w-4" /> {titleCase(o.employmentType)}
          </p>
        )}
        <p className="flex items-center gap-2">
          <LayersIcon className="h-4 w-4" /> {experienceLabel(o.minExperience, o.maxExperience)}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <Badge variant="info">{titleCase(o.category)}</Badge>
        <span className="text-xs text-content-faint">
          {o.publishedDate ? formatDate(o.publishedDate) : ''}
        </span>
      </div>
    </Link>
  );
}

export function VaultCard({ vault: v }: { vault: Vault }) {
  return (
    <div
      className={`flex h-full flex-col rounded-2xl border bg-surface p-5 shadow-card dark:bg-surface-elevated ${
        v.locked ? 'border-line opacity-90' : 'border-brand-200 dark:border-brand-500/40'
      }`}
    >
      <ContentProtection>
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

        {v.experienceLevels && v.experienceLevels.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {v.experienceLevels.map((el) => (
              <span
                key={el.id}
                className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300"
              >
                {el.name}
              </span>
            ))}
          </div>
        )}
      </ContentProtection>

      {v.locked ? (
        <p className="mt-auto pt-4 text-xs text-content-faint">
          Unlock this vault with a subscription.
        </p>
      ) : (
        <p className="mt-auto pt-4 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          Included with your subscription
        </p>
      )}
    </div>
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
