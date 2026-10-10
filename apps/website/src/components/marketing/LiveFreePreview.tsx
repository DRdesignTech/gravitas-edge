'use client';

import { useState, useMemo } from 'react';
import { Opportunity } from '@/lib/types';
import {
  Skeleton,
  ErrorState,
  EmptyState,
  GridIcon,
  ListIcon,
  LockIcon,
  Badge,
} from '@/components/ui';
import {
  OpportunityCard,
  SearchIcon,
  PinIcon,
  GlobeIcon,
  BriefcaseIcon,
  LayersIcon,
  BarsIcon,
  ProtectedFields,
} from '@/components/cards';
import Eyebrow from '@/components/marketing/Eyebrow';
import HomeAnchor from '@/components/marketing/HomeAnchor';
import {
  displayExperience,
  formatDate,
  hasExperience,
  isMeaningful,
  titleCase,
} from '@/lib/format';

const INITIAL_COUNT = 6;
const VIEW_KEY = 'free-preview-view';
type PreviewView = 'grid' | 'list';

function readInitialView(): PreviewView {
  if (typeof window === 'undefined') return 'grid';
  try {
    if (window.sessionStorage.getItem(VIEW_KEY) === 'list') return 'list';
  } catch {
    // Ignore storage failures.
  }
  return 'grid';
}

export default function LiveFreePreview({
  opportunities,
  loading,
  error,
  onRetry,
}: {
  opportunities: Opportunity[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<PreviewView>(readInitialView);
  const canCollapse = opportunities.length > INITIAL_COUNT;
  const visible = expanded ? opportunities.length : Math.min(INITIAL_COUNT, opportunities.length);

  const filteredOpportunities = useMemo(() => {
    const term = searchQuery.trim();
    if (!term) return opportunities;
    const queries = term.toLowerCase().split(/\s+/).filter(Boolean);
    if (queries.length === 0) return opportunities;

    return opportunities.filter((o) => {
      const textParts = [
        o.title,
        o.company,
        o.location,
        o.country,
        o.industry,
        o.functionalArea,
        o.source,
        o.salary,
        o.experienceText,
        ...(o.experienceLevels?.map((e) => e.name) || []),
        o.employmentType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return queries.every((q) => textParts.includes(q));
    });
  }, [opportunities, searchQuery]);

  const handleViewChange = (v: PreviewView) => {
    setView(v);
    try {
      window.sessionStorage.setItem(VIEW_KEY, v);
    } catch {
      // Ignore storage failures.
    }
  };

  return (
    <section id="free-preview" className="scroll-mt-20 border-t border-line bg-surface-muted">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <Eyebrow>FREE PREVIEW</Eyebrow>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-content sm:text-3xl">
            Free Preview
          </h2>
          <p className="mt-2 text-sm text-content-muted sm:text-base">
            Explore a selection of available opportunities before choosing a plan. — the same ones
            being added to the Gravitas Edge Opportunity Vaults — before you decide whether paid
            access is right for your search.
          </p>
        </div>

        {!loading && !error && (
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-2xl md:max-w-3xl">
              <SearchIcon
                className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-content-muted/50"
                aria-hidden="true"
              />
              <input
                id="free-preview-search"
                type="text"
                placeholder="Search by role, company, location, experience..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full rounded-xl border border-line bg-surface px-5 py-3.5 pl-12 pr-10 text-base text-content placeholder:text-content-faint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface-elevated shadow-sm"
                aria-label="Search opportunities by title, company, or location"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-content-muted transition-colors hover:bg-surface-muted hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:hover:bg-surface"
                  aria-label="Clear search"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div
              className="inline-flex shrink-0 items-center gap-0.5 self-start rounded-xl border border-line bg-surface p-0.5 shadow-sm dark:bg-surface-elevated sm:self-auto"
              role="group"
              aria-label="Choose view layout"
            >
              <button
                type="button"
                onClick={() => handleViewChange('grid')}
                aria-pressed={view === 'grid'}
                aria-label="Grid view"
                title="Grid view"
                className={`inline-flex h-9 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                  view === 'grid'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-content-muted hover:text-content hover:bg-surface-muted transition-all duration-150'
                }`}
              >
                <GridIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleViewChange('list')}
                aria-pressed={view === 'list'}
                aria-label="List view"
                title="List view"
                className={`inline-flex h-9 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                  view === 'list'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-content-muted hover:text-content hover:bg-surface-muted transition-all duration-150'
                }`}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : filteredOpportunities.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface dark:bg-surface-elevated">
            <EmptyState
              icon={<SearchIcon className="h-6 w-6" />}
              title={searchQuery ? 'No matching opportunities' : 'No opportunities yet'}
              description={
                searchQuery
                  ? 'No opportunities match your search. Clear to see the full list.'
                  : 'Check back soon — new opportunities are added regularly.'
              }
              action={
                searchQuery ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-content transition-all duration-150 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:bg-transparent"
                    >
                      Clear search
                    </button>
                  </div>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            {view === 'grid' ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {filteredOpportunities.slice(0, visible).map((o) => (
                  <OpportunityCard key={o.id} opportunity={o} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOpportunities.slice(0, visible).map((o) => (
                  <a
                    key={o.id}
                    href={`/opportunities/${o.id}`}
                    className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:gap-4 sm:p-5 dark:bg-surface-elevated dark:hover:border-brand-500/40 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)] lg:items-center lg:gap-6"
                  >
                    <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-brand-600 to-brand-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:from-brand-400 dark:to-brand-300" />
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-base font-bold text-white shadow-sm dark:from-brand-400 dark:to-brand-300">
                            {(o.company || o.title || '?')[0]?.toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <h3 className="truncate text-[15px] font-bold leading-snug text-content group-hover:text-brand-700 dark:group-hover:text-brand-300">
                              {o.title}
                            </h3>
                            <p className="mt-0.5 truncate text-sm text-content-muted">
                              {o.company || '—'}
                            </p>
                          </div>
                        </div>
                        {o.isPremium ? (
                          <Badge variant="premium" className="shrink-0">
                            Premium
                          </Badge>
                        ) : (
                          <Badge variant="success" className="shrink-0">
                            Open
                          </Badge>
                        )}
                      </div>

                      {isMeaningful(o.salary) && (
                        <p
                          className="mt-2 truncate text-sm font-bold text-brand-700 dark:text-brand-300 sm:text-base"
                          title={o.salary}
                        >
                          {o.salary}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {o.location && (
                          <ListMetaChip icon={<PinIcon className="h-3.5 w-3.5" />}>
                            {o.location}
                          </ListMetaChip>
                        )}
                        {o.country && (
                          <ListMetaChip icon={<GlobeIcon className="h-3.5 w-3.5" />}>
                            {o.country}
                          </ListMetaChip>
                        )}
                        {o.employmentType && (
                          <ListMetaChip icon={<BriefcaseIcon className="h-3.5 w-3.5" />}>
                            {titleCase(o.employmentType)}
                          </ListMetaChip>
                        )}
                        {hasExperience(o.experienceText, o.minExperience, o.maxExperience) && (
                          <ListMetaChip icon={<BarsIcon className="h-3.5 w-3.5" />}>
                            {displayExperience(o.experienceText, o.minExperience, o.maxExperience)}
                          </ListMetaChip>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 lg:justify-self-end">
                      <span className="flex flex-wrap items-center justify-end gap-2">
                        <Badge variant="info">{titleCase(o.category)}</Badge>
                        {o.publishedDate && (
                          <span className="text-xs text-content-faint">
                            {formatDate(o.publishedDate)}
                          </span>
                        )}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {filteredOpportunities.length > INITIAL_COUNT && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-7 py-3 text-sm font-semibold text-content shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:bg-surface-muted hover:shadow-md dark:bg-surface-elevated"
                  aria-expanded={expanded}
                >
                  {expanded ? 'Show Fewer Opportunities' : 'Show More Opportunities'}
                  <svg
                    className={`h-4 w-4 text-brand-500 transition-transform duration-200 ${
                      expanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>
              </div>
            )}

            <div className="mt-10 flex flex-col items-start gap-2 rounded-2xl border border-line bg-surface-muted px-5 py-4 text-sm text-content-muted dark:bg-surface/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>
                Full company, source, contact and application details for premium opportunities
                become available with the relevant Opportunity Vault access.
              </p>
              <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1">
                <HomeAnchor
                  href="#vaults"
                  className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Explore Opportunity Vaults →
                </HomeAnchor>
                <HomeAnchor
                  href="#plans"
                  className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  View Plans →
                </HomeAnchor>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function ListMetaChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-line bg-surface-muted/70 px-2.5 py-1 text-xs font-medium text-content-muted dark:bg-surface">
      <span className="shrink-0 text-content-faint">{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

function BrowseLink({ o }: { o: Opportunity }) {
  if (o.isFullAccess) {
    return o.applicationUrl ? (
      <a
        href={o.applicationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
      >
        Apply <span aria-hidden="true">→</span>
      </a>
    ) : (
      <span className="shrink-0 truncate rounded-lg border border-line bg-surface-muted/70 px-3 py-1.5 text-xs text-content-muted">
        {o.applicationContact || 'Contact details'}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
      <LockIcon className="h-3.5 w-3.5" />
      Unlock Full Access
    </span>
  );
}
