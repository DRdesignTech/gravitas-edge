'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchOpportunities } from '@/lib/services';
import { Opportunity, OpportunityQuery, PaginatedResult } from '@/lib/types';
import {
  Button,
  Card,
  Input,
  Select,
  Pagination,
  Skeleton,
  EmptyState,
  ErrorState,
  Badge,
  ViewToggle,
  SlidersIcon,
} from '@/components/ui';
import { OpportunityCard, OpportunityRow, SearchIcon, BriefcaseIcon } from '@/components/cards';
import { getErrorMessage } from '@/lib/errors';
import { OPPORTUNITY_CATEGORIES, EMPLOYMENT_TYPES } from '@/lib/types';

const PAGE_SIZE = 9;
const VIEW_KEY = 'jp-opportunities-view';

function titleOption(v: string) {
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

type ViewMode = 'grid' | 'list';

function initialView(): ViewMode {
  if (typeof window === 'undefined') return 'grid';
  const saved = window.localStorage.getItem(VIEW_KEY);
  return saved === 'list' ? 'list' : 'grid';
}

export default function OpportunitiesPage() {
  const [data, setData] = useState<PaginatedResult<Opportunity> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [country, setCountry] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>(initialView);

  const load = useCallback((opts: OpportunityQuery) => {
    setLoading(true);
    setError('');
    fetchOpportunities(opts)
      .then(setData)
      .catch((e) => {
        setError(getErrorMessage(e));
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load({
      page,
      limit: PAGE_SIZE,
      search,
      category,
      employmentType,
      country,
      sortBy,
      sortOrder: 'desc',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, employmentType, country, sortBy, load]);

  const runQuery = useCallback(
    (p: number, query: OpportunityQuery) => {
      load({
        page: p,
        limit: PAGE_SIZE,
        search: query.search,
        category: query.category,
        employmentType: query.employmentType,
        country: query.country,
        sortBy: query.sortBy,
        sortOrder: 'desc',
      });
    },
    [load],
  );

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(1);
    runQuery(1, { search, category, employmentType, country, sortBy });
  };

  const changeView = (v: ViewMode) => {
    setView(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      // ignore storage errors
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setEmploymentType('');
    setCountry('');
    setPage(1);
    handleSearch();
  };

  const current = data?.meta.page ?? 1;
  const totalPages = data?.meta.totalPages ?? 1;
  const totalItems = data?.meta.totalItems ?? 0;

  const hasActiveFilters = Boolean(search || category || employmentType || country);

  return (
    <div className="relative">
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-transparent dark:from-brand-950/40" />
        <div className="pointer-events-none absolute -top-24 right-0 -z-10 h-72 w-72 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-500/10" />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Curated roles
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-content sm:text-4xl">
            Opportunities
          </h1>
          <p className="mt-2 max-w-2xl text-content-muted">
            Search curated roles across India and the globe. Switch between grid and list view to
            browse your way.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <Card className="overflow-hidden" padding={false}>
          <div className="flex items-center gap-2 border-b border-line bg-surface-muted/60 px-5 py-3 dark:bg-surface-elevated/50">
            <SlidersIcon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <span className="text-sm font-semibold text-content">Filter &amp; search</span>
          </div>
          <form onSubmit={handleSearch} className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-1">
              <Input
                label="Search"
                placeholder="Title, company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search opportunities"
              />
            </div>
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: '', label: 'All categories' },
                ...OPPORTUNITY_CATEGORIES.map((c) => ({ value: c, label: titleOption(c) })),
              ]}
            />
            <Select
              label="Employment type"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              options={[
                { value: '', label: 'All types' },
                ...EMPLOYMENT_TYPES.map((t) => ({ value: t, label: titleOption(t) })),
              ]}
            />
            <Input
              label="Location"
              placeholder="City / country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              aria-label="Filter by location"
            />
            <div className="flex items-end gap-2">
              <Button type="submit" className="w-full lg:flex-1">
                <SearchIcon className="h-4 w-4" /> Search
              </Button>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  title="Clear filters"
                >
                  Reset
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Results toolbar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ViewToggle value={view} onChange={changeView} />
            {!loading && (
              <div className="flex items-center gap-2 text-sm text-content-muted">
                <span className="font-medium text-content">{totalItems}</span> result
                {totalItems === 1 ? '' : 's'}
                {data?.items.some((o) => o.isPremium) && (
                  <Badge variant="premium" className="ml-1 hidden sm:inline-flex">
                    ⚡ Premium
                  </Badge>
                )}
              </div>
            )}
          </div>
          <Select
            className="w-40"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort"
            options={[
              { value: 'createdAt', label: 'Newest first' },
              { value: 'title', label: 'Title' },
              { value: 'company', label: 'Company' },
            ]}
          />
        </div>

        {loading ? (
          view === 'grid' ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <Skeleton key={i} className="h-52" />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          )
        ) : error ? (
          <Card className="mt-6">
            <ErrorState message={error} onRetry={() => handleSearch()} />
          </Card>
        ) : !data || data.items.length === 0 ? (
          <Card className="mt-6">
            <EmptyState
              icon={<BriefcaseIcon className="h-6 w-6" />}
              title="No opportunities found"
              description="Try changing your filters or clearing your search."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            {view === 'grid' ? (
              <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {data.items.map((o) => (
                  <OpportunityCard key={o.id} opportunity={o} />
                ))}
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-4">
                {data.items.map((o) => (
                  <OpportunityRow key={o.id} opportunity={o} />
                ))}
              </div>
            )}
            <Pagination
              className="mt-8"
              currentPage={current}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
