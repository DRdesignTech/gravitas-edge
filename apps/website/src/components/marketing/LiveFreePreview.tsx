'use client';

import { useState, useMemo, useEffect } from 'react';
import { Opportunity, Vault } from '@/lib/types';
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
import {
  OpportunityCard,
  SearchIcon,
  PinIcon,
  BarsIcon,
  VaultIcon,
} from '@/components/cards';
import Eyebrow from '@/components/marketing/Eyebrow';
import HomeAnchor from '@/components/marketing/HomeAnchor';
import { displayExperience, hasExperience, isMeaningful, titleCase } from '@/lib/format';
import { extractEmail, buildApplyMailto } from '@job-portal/shared';

const PAGE_SIZE = 6;
const VIEW_KEY = 'free-preview-view';
type PreviewView = 'grid' | 'list';

const EXPERIENCE_BUCKETS = [
  '0–5 years',
  '5–10 years',
  '10–15 years',
  '15+ years',
  'Senior / Leadership',
  'Other',
];
const SALARY_BUCKETS = [
  'Under ₹40 LPA',
  '₹40–₹60 LPA',
  '₹60 LPA and above',
  'Competitive / Market',
  'Not specified',
];

function uniqueOptions(values: (string | null | undefined)[]): { value: string; label: string }[] {
  const seen = new Set<string>();
  const out: { value: string; label: string }[] = [];
  for (const raw of values) {
    const value = raw?.trim();
    if (!value || !isMeaningful(value) || seen.has(value)) continue;
    seen.add(value);
    out.push({ value, label: value });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

/** Primary city from a raw location like "Bangalore / Chennai" or "Mumbai, Maharashtra". */
function primaryLocation(value: string): string {
  return value.split(/[/,]/)[0].trim();
}

/** Primary sector from a raw industry like "Banking / Financial Services / HR". */
function primaryIndustry(value: string): string {
  return value.split('/')[0].trim();
}

/** Bucket a free-text experience value (e.g. "15+ Years") into a coarse range. */
function experienceBucket(value: string): string {
  const text = value.trim();
  if (!text) return '';
  const match = text.match(/\d+/);
  if (match) {
    const years = Number(match[0]);
    if (years < 5) return '0–5 years';
    if (years < 10) return '5–10 years';
    if (years < 15) return '10–15 years';
    return '15+ years';
  }
  const lower = text.toLowerCase();
  if (['leadership', 'senior', 'executive', 'c-suite', 'cxo'].some((w) => lower.includes(w))) {
    return 'Senior / Leadership';
  }
  return 'Other';
}

/** Bucket a free-text salary value into a coarse range. */
function salaryBucket(value: string): string {
  const text = value.trim();
  if (!text) return '';
  const lower = text.toLowerCase();
  if (/not mention|not specif|n\/a/.test(lower)) return 'Not specified';
  if (/competitive|industry standard|attractive|negotiable/.test(lower)) {
    return 'Competitive / Market';
  }
  const numbers = (text.match(/\d+(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, '')));
  const max = numbers.length ? Math.max(...numbers) : 0;
  if (lower.includes('cr')) return '₹60 LPA and above';
  if (/lpa|lac|lakh/.test(lower)) {
    if (max >= 60) return '₹60 LPA and above';
    if (max >= 40) return '₹40–₹60 LPA';
    return 'Under ₹40 LPA';
  }
  return 'Competitive / Market';
}

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

export default function LiveFreePreview({
  opportunities,
  vaults,
  loading,
  error,
  onRetry,
}: {
  opportunities: Opportunity[];
  vaults: Vault[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [vault, setVault] = useState('');
  const [location, setLocation] = useState('');
  const [industry, setIndustry] = useState('');
  const [experience, setExperience] = useState('');
  const [salary, setSalary] = useState('');
  const [view, setView] = useState<PreviewView>(readInitialView);
  const [page, setPage] = useState(1);

  // Update view on mobile/desktop resize
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      const storedView = window.sessionStorage.getItem(VIEW_KEY);
      // Only auto-switch to list on mobile if user hasn't explicitly chosen a view
      if (isMobile && !storedView) {
        setView('list');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /** How many of the listed jobs belong to each vault, busiest vault first. */
  const vaultStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of opportunities) {
      for (const v of o.vaults ?? []) {
        counts.set(v.id, (counts.get(v.id) ?? 0) + 1);
      }
    }
    return vaults
      .map((v) => ({ vault: v, count: counts.get(v.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.vault.name.localeCompare(b.vault.name));
  }, [vaults, opportunities]);
  const locationOptions = useMemo(
    () => uniqueOptions(opportunities.map((o) => (o.location ? primaryLocation(o.location) : ''))),
    [opportunities],
  );
  const industryOptions = useMemo(
    () => uniqueOptions(opportunities.map((o) => (o.industry ? primaryIndustry(o.industry) : ''))),
    [opportunities],
  );
  const experienceOptions = useMemo(() => {
    const present = new Set(
      opportunities.map((o) => (o.experienceText ? experienceBucket(o.experienceText) : '')),
    );
    return EXPERIENCE_BUCKETS.filter((bucket) => present.has(bucket)).map((bucket) => ({
      value: bucket,
      label: bucket,
    }));
  }, [opportunities]);
  const salaryOptions = useMemo(() => {
    const present = new Set(opportunities.map((o) => (o.salary ? salaryBucket(o.salary) : '')));
    return SALARY_BUCKETS.filter((bucket) => present.has(bucket)).map((bucket) => ({
      value: bucket,
      label: bucket,
    }));
  }, [opportunities]);

  const hasFilters = Boolean(searchQuery || vault || location || industry || experience || salary);

  const resetFilters = () => {
    setSearchQuery('');
    setVault('');
    setLocation('');
    setIndustry('');
    setExperience('');
    setSalary('');
  };

  const filteredOpportunities = useMemo(() => {
    const term = searchQuery.trim();
    const queries = term ? term.toLowerCase().split(/\s+/).filter(Boolean) : [];
    const locationFilter = location.toLowerCase().trim();
    const industryFilter = industry.toLowerCase().trim();
    const experienceFilter = experience.toLowerCase().trim();
    const salaryFilter = salary.toLowerCase().trim();

    return opportunities.filter((o) => {
      if (vault && !(o.vaults?.some((v) => v.id === vault) ?? false)) return false;
      if (locationFilter && !(o.location || '').toLowerCase().includes(locationFilter))
        return false;
      if (industryFilter && !(o.industry || '').toLowerCase().includes(industryFilter))
        return false;
      if (experienceFilter && !(o.experienceText || '').toLowerCase().includes(experienceFilter))
        return false;
      if (salaryFilter && !(o.salary || '').toLowerCase().includes(salaryFilter)) return false;
      if (queries.length === 0) return true;

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
        o.jobId,
        ...(o.experienceLevels?.map((e) => e.name) || []),
        o.employmentType,
        ...(o.vaults?.map((v) => v.name) || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return queries.every((q) => textParts.includes(q));
    });
  }, [opportunities, searchQuery, vault, location, industry, experience, salary]);

  /** All matching jobs mixed together, most recent first. */
  const sortedOpportunities = useMemo(() => {
    const time = (o: Opportunity) => {
      const parsed = o.createdAt ? Date.parse(o.createdAt) : NaN;
      return Number.isNaN(parsed) ? 0 : parsed;
    };
    return [...filteredOpportunities].sort((a, b) => time(b) - time(a));
  }, [filteredOpportunities]);

  const totalPages = Math.max(1, Math.ceil(sortedOpportunities.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedOpportunities = sortedOpportunities.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, vault, location, industry, experience, salary]);

  const handleViewChange = (v: PreviewView) => {
    setView(v);
    try {
      window.sessionStorage.setItem(VIEW_KEY, v);
    } catch {
      // Ignore storage failures.
    }
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
            See what opportunities are currently available and discover what is relevant for you to
            your experience, function &amp; preferred market.
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
                  className="w-full rounded-xl border border-line bg-surface px-5 py-3.5 pl-12 pr-10 text-base text-content placeholder:text-hint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface-elevated shadow-sm"
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

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <label
                  htmlFor="filter-experience"
                  className="absolute -top-2 left-2 text-[10px] font-medium text-brand-600 bg-surface px-1 dark:bg-surface-elevated"
                >
                  Experience
                </label>
                <input
                  id="filter-experience"
                  type="text"
                  placeholder="e.g. 5 years, Senior"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-content placeholder:text-hint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface-elevated shadow-sm"
                  aria-label="Filter by experience"
                />
              </div>

              <div className="relative">
                <label
                  htmlFor="filter-location"
                  className="absolute -top-2 left-2 text-[10px] font-medium text-brand-600 bg-surface px-1 dark:bg-surface-elevated"
                >
                  Location
                </label>
                <input
                  id="filter-location"
                  type="text"
                  placeholder="e.g. Bangalore, Mumbai"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-content placeholder:text-hint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface-elevated shadow-sm"
                  aria-label="Filter by location"
                />
              </div>

              <div className="relative">
                <label
                  htmlFor="filter-industry"
                  className="absolute -top-2 left-2 text-[10px] font-medium text-brand-600 bg-surface px-1 dark:bg-surface-elevated"
                >
                  Industry
                </label>
                <input
                  id="filter-industry"
                  type="text"
                  placeholder="e.g. FinTech, SaaS"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-content placeholder:text-hint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface-elevated shadow-sm"
                  aria-label="Filter by industry"
                />
              </div>

              <div className="relative">
                <label
                  htmlFor="filter-salary"
                  className="absolute -top-2 left-2 text-[10px] font-medium text-brand-600 bg-surface px-1 dark:bg-surface-elevated"
                >
                  Salary
                </label>
                <input
                  id="filter-salary"
                  type="text"
                  placeholder="e.g. 50 LPA, 1.5 Cr"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-content placeholder:text-hint focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface-elevated shadow-sm"
                  aria-label="Filter by salary"
                />
              </div>
            </div>

            {hasFilters && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Clear all filters
                </button>
              </div>
            )}
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
              title={hasFilters ? 'No matching opportunities' : 'No opportunities yet'}
              description={
                hasFilters
                  ? 'No opportunities match your search and filters. Clear them to see the full list.'
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
                      Clear all filters
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
                {paginatedOpportunities.map((o) => (
                  <OpportunityCard key={o.id} opportunity={o} />
                ))}
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {paginatedOpportunities.map((o) => (
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
                      <p className="mt-0.5 truncate text-xs text-content-muted">
                        {o.company || '—'}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {o.location && (
                          <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-line bg-surface-muted/70 px-2 py-0.5 text-[11px] text-content-muted dark:bg-surface">
                            <PinIcon className="h-3 w-3 shrink-0 text-content-faint" />
                            <span className="truncate">
                              {o.location.split(/[/,]/)[0].trim()}
                            </span>
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

            {sortedOpportunities.length > 0 && (
              <div className="mt-10">
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  onPageChange={(p) => {
                    setPage(p);
                    if (typeof window !== 'undefined') {
                      document
                        .getElementById('free-preview')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                />
                <p className="mt-3 text-center text-xs text-content-muted">
                  Page {safePage} of {totalPages} · {sortedOpportunities.length} opportunities
                </p>
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
