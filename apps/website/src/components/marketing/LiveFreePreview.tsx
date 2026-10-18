'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Opportunity, Vault, VaultOpportunityCount, OpportunityQuery, PaginatedResult } from '@/lib/types';
import {
  Skeleton,
  ErrorState,
  EmptyState,
  GridIcon,
  ListIcon,
  LockIcon,
  Badge,
  Pagination,
} from '@/components/ui';
import { OpportunityCard, SearchIcon, PinIcon, BarsIcon, VaultIcon } from '@/components/cards';
import Eyebrow from '@/components/marketing/Eyebrow';
import HomeAnchor from '@/components/marketing/HomeAnchor';
import { displayExperience, hasExperience, titleCase } from '@/lib/format';
import { extractEmail, buildApplyMailto } from '@job-portal/shared';
import { fetchOpportunities, fetchVaultOpportunityCounts } from '@/lib/services';

const PAGE_SIZE = 12;
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

function getMobileDefaultView(): PreviewView {
  if (typeof window === 'undefined') return 'grid';
  return window.innerWidth < 768 ? 'list' : 'grid';
}

interface VaultCountMap {
  [vaultId: string]: number;
}

export default function LiveFreePreview({
  vaults,
  loading: initialLoading,
  error: initialError,
  onRetry,
}: {
  vaults: Vault[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [vault, setVault] = useState('');
  const [view, setView] = useState<PreviewView>(readInitialView);
  const [page, setPage] = useState(1);
  const [searchTrigger, setSearchTrigger] = useState(0);

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vaultCounts, setVaultCounts] = useState<VaultCountMap>({});

  const inFlightRef = useRef<Promise<void> | null>(null);

  // Load vault counts on mount
  useEffect(() => {
    let cancelled = false;
    fetchVaultOpportunityCounts()
      .then((counts) => {
        if (!cancelled) {
          const map: VaultCountMap = {};
          counts.forEach((c) => { map[c.vaultId] = c.count; });
          setVaultCounts(map);
        }
      })
      .catch(() => {
        // Silently fail - counts are supplementary
      });
    return () => { cancelled = true; };
  }, []);

  // Update view on mobile/desktop resize
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      const storedView = window.sessionStorage.getItem(VIEW_KEY);
      if (isMobile && !storedView) {
        setView('list');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadOpportunities = useCallback(async (opts: OpportunityQuery) => {
    // Prevent duplicate concurrent requests
    if (inFlightRef.current) return;
    
    setLoading(true);
    setError(null);
    
    const promise = fetchOpportunities(opts)
      .then((data: PaginatedResult<Opportunity>) => {
        setOpportunities(data.items);
        setTotalItems(data.meta.totalItems);
        setTotalPages(data.meta.totalPages);
      })
      .catch((e) => {
        setError(e?.message || 'Failed to load opportunities');
        setOpportunities([]);
        setTotalItems(0);
        setTotalPages(1);
      })
      .finally(() => {
        setLoading(false);
        inFlightRef.current = null;
      });
    
    inFlightRef.current = promise;
    await promise;
  }, []);

  // Load opportunities when searchTrigger, page, or filters change
  // searchTrigger increments ONLY when search button is clicked
  useEffect(() => {
    loadOpportunities({
      page,
      limit: PAGE_SIZE,
      search: searchQuery || undefined,
      vaultId: vault || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }, [searchTrigger, page, vault, loadOpportunities]);

  /** How many of the listed jobs belong to each vault, busiest vault first. */
  const vaultStats = useMemo(() => {
    return vaults
      .map((v) => ({ vault: v, count: vaultCounts[v.id] ?? 0 }))
      .sort((a, b) => b.count - a.count || a.vault.name.localeCompare(b.vault.name));
  }, [vaults, vaultCounts]);

  const hasFilters = Boolean(searchQuery || vault);

  const resetFilters = () => {
    setSearchQuery('');
    setVault('');
    setPage(1);
  };

  const handleViewChange = (v: PreviewView) => {
    setView(v);
    try {
      window.sessionStorage.setItem(VIEW_KEY, v);
    } catch {
      // Ignore storage failures.
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(1);
    setSearchTrigger(t => t + 1);
  };

  return (
    <section
      id="free-preview"
      className="section-glow relative border-t border-line bg-surface-muted"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mb-8 max-w-2xl">
          <Eyebrow>FREE PREVIEW</Eyebrow>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-content sm:text-3xl">
            Explore before you decide
          </h2>
                <p className="mt-2 text-sm text-content-muted sm:text-base">
                  See what opportunities are currently available. Use the search to find what&apos;s relevant
                  for you.
                </p>
          <p className="mt-2 text-sm font-medium text-content sm:text-base">
            Explore First. Decide if it&apos;s right for you. Then choose access.
          </p>
        </div>

        {!loading && !error && vaultStats.length > 0 && (
          <div className="mb-8">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-content">Browse by vault</h3>
                <p className="text-xs text-content-muted">
                  See how many opportunities each vault holds.
                </p>
              </div>
              {vault && (
                <button
                  type="button"
                  onClick={() => setVault('')}
                  className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Clear selection
                </button>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {vaultStats.map(({ vault: v, count }) => {
                const active = vault === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVault(active ? '' : v.id)}
                    aria-pressed={active}
                    className={`group relative flex w-[calc(50%-0.375rem)] shrink-0 flex-col items-center overflow-hidden rounded-2xl border px-4 py-3.5 text-center shadow-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:w-[calc(33.333%-0.5rem)] lg:w-[calc(25%-0.5625rem)] ${
                      active
                        ? '-translate-y-0.5 border-brand-400 bg-gradient-to-b from-brand-50 to-surface shadow-lg shadow-brand-400/25 dark:border-brand-500/50 dark:from-brand-950/60 dark:to-surface-elevated'
                        : 'border-line bg-gradient-to-b from-surface to-surface-muted shadow-sm hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-400/10 dark:from-surface-elevated dark:to-surface-elevated/60 dark:hover:border-brand-500/40'
                    }`}
                  >
                    <span
                      className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-400 via-[#C8943E] to-brand-400 transition-opacity duration-300 ${
                        active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    />
                    <span
                      className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-brand-400/20 blur-2xl transition-opacity duration-300 ${
                        active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    />
                    <span className="flex min-h-[2.25rem] w-full items-center justify-center text-sm font-semibold leading-snug text-content break-words">
                      {v.name}
                    </span>
                    <span className="mt-2.5 flex w-full flex-1 flex-col items-center justify-center border-t border-line/70 pt-2.5">
                      <span
                        className={`text-2xl font-extrabold leading-none tracking-tight tabular-nums ${
                          active
                            ? 'bg-gradient-to-br from-brand-600 to-brand-400 bg-clip-text text-transparent'
                            : 'bg-gradient-to-br from-content to-content-muted bg-clip-text text-transparent'
                        }`}
                      >
                        {count}
                      </span>
                      <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-content-muted">
                        {count === 1 ? 'Job' : 'Jobs'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="mb-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full max-w-2xl md:max-w-3xl">
                      <form onSubmit={handleSearch}>
                        <div className="flex flex-col gap-2">
                          <div className="relative flex-1">
                            <SearchIcon
                              className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-content-muted/50"
                              aria-hidden="true"
                            />
                            <input
                              id="free-preview-search"
                              type="text"
                              placeholder="Search by role, company, location, salary, experience..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full rounded-xl border border-line bg-surface px-5 py-3.5 pl-12 pr-4 text-base text-content placeholder:text-hint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface-elevated shadow-sm"
                              aria-label="Search opportunities by keywords (role, company, location, salary, experience, etc.)"
                            />
                            {searchQuery && (
                              <button
                                type="button"
                                onClick={() => { setSearchQuery(''); handleSearch(); }}
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
                          <p className="text-center text-xs text-content-muted">
                            You can search anything — try multiple keywords like company, role, location, or salary
                          </p>
                          <button
                            type="submit"
                            className="mx-auto inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Search
                          </button>
                        </div>
                      </form>
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


          </div>
        )}

        {/* Results count header */}
        {!loading && !error && totalItems > 0 && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-content-muted">
            <p>
              <span className="font-medium text-content">{totalItems}</span> opportunit{totalItems === 1 ? 'y' : 'ies'} found
              {hasFilters && <span className="ml-2 text-xs text-brand-600 dark:text-brand-400">(filtered)</span>}
            </p>
            {vault && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium dark:bg-brand-950 dark:text-brand-300">
                Vault: {vaults.find(v => v.id === vault)?.name || vault}
              </span>
            )}
          </div>
        )}

        <div id="free-preview-results">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={onRetry} />
          ) : opportunities.length === 0 && totalItems === 0 ? (
            <div className="rounded-2xl border border-line bg-surface dark:bg-surface-elevated">
              <EmptyState
                icon={<SearchIcon className="h-6 w-6" />}
                title={hasFilters ? 'No matching opportunities' : 'No opportunities yet'}
                description={
                  hasFilters
                    ? 'No opportunities match your search. Clear it to see the full list.'
                    : 'Check back soon — new opportunities are added regularly.'
                }
                action={
                  hasFilters ? (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={resetFilters}
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
                  {opportunities.map((o) => (
                    <OpportunityCard key={o.id} opportunity={o} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {opportunities.map((o) => (
                    <a
                      key={o.id}
                      href={`/opportunities/${o.id}`}
                      className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-line bg-gradient-to-b from-surface to-surface-muted px-3 py-2.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:px-4 sm:py-3 dark:from-surface-elevated dark:to-surface-elevated/60 dark:hover:border-brand-500/40"
                    >
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-400 via-[#C8943E] to-brand-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <span className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-brand-400/20 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold leading-snug text-content group-hover:text-brand-700 sm:text-[15px] dark:group-hover:text-brand-300">
                          {o.title}
                        </h3>
                        {o.jobId && (
                          <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-line bg-surface-muted/70 px-2 py-0.5 text-[11px] text-content-muted dark:bg-surface">
                            <span className="text-[10px] font-mono text-brand-600 dark:text-brand-400">#</span>
                            <span className="truncate font-mono text-[11px]">{o.jobId}</span>
                          </span>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {o.location && (
                            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-line bg-surface-muted/70 px-2 py-0.5 text-[11px] text-content-muted dark:bg-surface">
                              <PinIcon className="h-3 w-3 shrink-0 text-content-faint" />
                              <span className="truncate">{o.location.split(/[/,]/)[0].trim()}</span>
                            </span>
                          )}
                          {hasExperience(o.experienceText, o.minExperience, o.maxExperience) && (
                            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-line bg-surface-muted/70 px-2 py-0.5 text-[11px] text-content-muted dark:bg-surface">
                              <BarsIcon className="h-3 w-3 shrink-0 text-content-faint" />
                              <span className="truncate">
                                {displayExperience(
                                  o.experienceText,
                                  o.minExperience,
                                  o.maxExperience,
                                )}
                              </span>
                            </span>
                          )}
                          {o.category && (
                            <Badge variant="info" className="shrink-0 text-[10px] px-1.5 py-0.5">
                              {titleCase(o.category)}
                            </Badge>
                          )}
                          {o.vaults?.map((v) => (
                            <span
                              key={v.id}
                              className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-line bg-surface-muted/70 px-2 py-0.5 text-[11px] text-content-muted dark:bg-surface"
                            >
                              <VaultIcon className="h-3 w-3 shrink-0 text-content-faint" />
                              <span className="truncate">{v.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {totalItems > 0 && totalPages > 1 && (
                <div className="mt-10">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(p) => {
                      setPage(p);
                      if (typeof window !== 'undefined') {
                        document
                          .getElementById('free-preview-results')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                  />
                  <p className="mt-3 text-center text-xs text-content-muted">
                    Page {page} of {totalPages} · {totalItems} opportunities
                  </p>
                </div>
              )}
              {totalItems > 0 && totalPages === 1 && (
                <p className="mt-6 text-center text-xs text-content-muted">
                  {totalItems} opportunit{totalItems === 1 ? 'y' : 'ies'} on this page
                </p>
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
      </div>
    </section>
  );
}

function BrowseLink({ o }: { o: Opportunity }) {
  if (o.isFullAccess) {
    const email = extractEmail(o.applicationContact, o.applicationUrl);
    if (email) {
      return (
        <a
          href={buildApplyMailto(email, { title: o.title, company: o.company })}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
        >
          Apply <span aria-hidden="true">→</span>
        </a>
      );
    }
    return (
      <span className="shrink-0 truncate rounded-lg border border-line bg-surface-muted/70 px-3 py-1.5 text-xs text-content-muted">
        Application email unavailable
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
