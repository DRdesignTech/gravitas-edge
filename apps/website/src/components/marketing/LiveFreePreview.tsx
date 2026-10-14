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
  VaultIcon,
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
import { extractEmail, buildApplyMailto } from '@job-portal/shared';

const INITIAL_COUNT = 6;
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
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [vault, setVault] = useState('');
  const [location, setLocation] = useState('');
  const [industry, setIndustry] = useState('');
  const [experience, setExperience] = useState('');
  const [salary, setSalary] = useState('');
  const [view, setView] = useState<PreviewView>(readInitialView);
  const canCollapse = opportunities.length > INITIAL_COUNT;
  const visible = expanded ? opportunities.length : Math.min(INITIAL_COUNT, opportunities.length);

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

  const vaultOptions = useMemo(() => vaults.map((v) => ({ value: v.id, label: v.name })), [vaults]);
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

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="relative">
                <label
                  htmlFor="filter-vault"
                  className="absolute -top-2 left-2 z-10 text-[10px] font-medium text-brand-600 bg-surface px-1 dark:bg-surface-elevated"
                >
                  Vault
                </label>
                <select
                  id="filter-vault"
                  value={vault}
                  onChange={(e) => setVault(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-line bg-surface px-4 py-2.5 pr-9 text-sm text-content focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface-elevated shadow-sm"
                  aria-label="Filter by vault"
                >
                  <option value="">All vaults</option>
                  {vaultOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
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
              </div>

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
                    className="group relative flex flex-col gap-1.5 overflow-hidden rounded-xl border border-line bg-surface p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:gap-2 sm:p-4 dark:bg-surface-elevated dark:hover:border-brand-500/40 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)] lg:items-center lg:gap-4"
                  >
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#C8943E] to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-bold leading-snug text-content group-hover:text-brand-700 dark:group-hover:text-brand-300">
                              {o.title}
                            </h3>
                            <p className="flex flex-wrap items-center gap-1.5 text-xs text-content-muted">
                              <span className="truncate max-w-[180px] sm:max-w-[220px]">
                                {o.company || '—'}
                              </span>
                              {o.isPremium ? (
                                <Badge
                                  variant="premium"
                                  className="shrink-0 text-[10px] px-1.5 py-0.5"
                                >
                                  Premium
                                </Badge>
                              ) : (
                                <Badge
                                  variant="success"
                                  className="shrink-0 text-[10px] px-1.5 py-0.5"
                                >
                                  Open
                                </Badge>
                              )}
                              {hasExperience(
                                o.experienceText,
                                o.minExperience,
                                o.maxExperience,
                              ) && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted/70 px-2 py-0.5 text-xs text-content-muted">
                                  <BarsIcon className="h-3 w-3" />
                                  {displayExperience(
                                    o.experienceText,
                                    o.minExperience,
                                    o.maxExperience,
                                  )}
                                </span>
                              )}
                              {o.publishedDate && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted/70 px-2 py-0.5 text-xs text-content-muted">
                                  <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    aria-hidden="true"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                                    />
                                  </svg>
                                  {formatDate(o.publishedDate)}
                                </span>
                              )}
                              {o.location && (
                                <span className="inline-flex items-center gap-1 text-content-faint">
                                  <PinIcon className="h-3 w-3" />
                                  {o.location.split(/[/,]/)[0].trim()}
                                </span>
                              )}
                              {o.country && o.country !== o.location?.split(/[/,]/)[0].trim() && (
                                <span className="inline-flex items-center gap-1 text-content-faint">
                                  <GlobeIcon className="h-3 w-3" />
                                  {o.country}
                                </span>
                              )}
                              {o.category && (
                                <Badge
                                  variant="info"
                                  className="shrink-0 text-[10px] px-1.5 py-0.5"
                                >
                                  {titleCase(o.category)}
                                </Badge>
                              )}
                            </p>
                          </div>
                        </div>
                        {isMeaningful(o.salary) && (
                          <p
                            className="shrink-0 text-sm font-bold text-brand-700 dark:text-brand-300 whitespace-nowrap"
                            title={o.salary}
                          >
                            {o.salary}
                          </p>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-1">
                        {o.vaults?.map((v) => (
                          <ListMetaChip key={v.id} icon={<VaultIcon className="h-3 w-3" />}>
                            {v.name}
                          </ListMetaChip>
                        ))}
                        {o.employmentType && (
                          <ListMetaChip icon={<BriefcaseIcon className="h-3 w-3" />}>
                            {titleCase(o.employmentType)}
                          </ListMetaChip>
                        )}
                      </div>
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
