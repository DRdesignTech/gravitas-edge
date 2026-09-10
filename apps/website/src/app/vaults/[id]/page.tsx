'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { fetchOpportunities, fetchVaultById, fetchExperienceLevels } from '@/lib/services';
import {
  ExperienceLevel,
  Opportunity,
  OpportunityQuery,
  PaginatedResult,
  Vault,
} from '@/lib/types';
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
import {
  OpportunityCard,
  OpportunityRow,
  SearchIcon,
  BriefcaseIcon,
  VaultIcon,
} from '@/components/cards';
import { getErrorMessage } from '@/lib/errors';
import { OPPORTUNITY_CATEGORIES, EMPLOYMENT_TYPES } from '@/lib/types';

const PAGE_SIZE = 9;
const VIEW_KEY = 'jp-vault-opportunities-view';

function titleOption(v: string) {
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

type ViewMode = 'grid' | 'list';

function initialView(): ViewMode {
  if (typeof window === 'undefined') return 'grid';
  const saved = window.localStorage.getItem(VIEW_KEY);
  return saved === 'list' ? 'list' : 'grid';
}

export default function VaultOpportunitiesPage() {
  const params = useParams<{ id: string }>();
  const vaultId = params.id;

  const [vault, setVault] = useState<Vault | null>(null);
  const [levels, setLevels] = useState<ExperienceLevel[]>([]);
  const [data, setData] = useState<PaginatedResult<Opportunity> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [country, setCountry] = useState('');
  const [location, setLocation] = useState('');
  const [industry, setIndustry] = useState('');
  const [experienceLevelId, setExperienceLevelId] = useState('');
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
    setLoading(true);
    setError('');
    Promise.all([
      fetchVaultById(vaultId),
      fetchExperienceLevels().catch(() => [] as ExperienceLevel[]),
    ])
      .then(([v, lv]) => {
        setVault(v || null);
        setLevels(lv || []);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultId]);

  useEffect(() => {
    if (!vaultId) return;
    load({
      page,
      limit: PAGE_SIZE,
      vaultId,
      search,
      category,
      employmentType,
      country,
      location,
      industry,
      experienceLevelId,
      sortBy,
      sortOrder: 'desc',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    category,
    employmentType,
    country,
    location,
    industry,
    experienceLevelId,
    sortBy,
    vaultId,
    load,
  ]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(1);
    load({
      page: 1,
      limit: PAGE_SIZE,
      vaultId,
      search,
      category,
      employmentType,
      country,
      location,
      industry,
      experienceLevelId,
      sortBy,
      sortOrder: 'desc',
    });
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
    setLocation('');
    setIndustry('');
    setExperienceLevelId('');
    setPage(1);
    handleSearch();
  };

  const current = data?.meta.page ?? 1;
  const totalPages = data?.meta.totalPages ?? 1;
  const totalItems = data?.meta.totalItems ?? 0;

  const hasActiveFilters = Boolean(
    search || category || employmentType || country || location || industry || experienceLevelId,
  );

  if (!vaultId) {
    return null;
  }

  return (
    <div className="relative">
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-transparent dark:from-brand-950/40" />
        <div className="pointer-events-none absolute -top-24 right-0 -z-10 h-72 w-72 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-500/10" />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            href="/vaults"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            <span aria-hidden>←</span> All vaults
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
              <VaultIcon className="h-4 w-4" /> Content vault
            </span>
            {vault && (
              <Badge variant={vault.locked ? 'neutral' : 'success'}>
                {vault.locked ? 'Subscribe for full details' : 'Full details included'}
              </Badge>
            )}
          </div>
          {vault ? (
            <>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-content sm:text-4xl">
                {vault.name}
              </h1>
              {vault.description && (
                <p className="mt-2 max-w-2xl text-content-muted">{vault.description}</p>
              )}
            </>
          ) : (
            <>
              <Skeleton className="mt-4 h-9 w-56" />
              <Skeleton className="mt-3 h-5 w-96 max-w-full" />
            </>
          )}
          <p className="mt-3 text-sm text-content-faint">
            Browse every job in this vault free. Subscribe to unlock full details and direct hiring
            contacts.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <Card className="overflow-hidden" padding={false}>
          <div className="flex items-center gap-2 border-b border-line bg-surface-muted/60 px-5 py-3 dark:bg-surface-elevated/50">
            <SlidersIcon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <span className="text-sm font-semibold text-content">Search this vault</span>
          </div>
          <form onSubmit={handleSearch} className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Input
                label="Search"
                placeholder="Title, company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search jobs in this vault"
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
            <Select
              label="Experience"
              value={experienceLevelId}
              onChange={(e) => setExperienceLevelId(e.target.value)}
              options={[
                { value: '', label: 'All levels' },
                ...levels.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
            <div>
              <Input
                label="Location"
                placeholder="City"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                aria-label="Filter by city"
              />
            </div>
            <div>
              <Input
                label="Country"
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                aria-label="Filter by country"
              />
            </div>
            <div>
              <Input
                label="Sector / Industry"
                placeholder="FinTech, SaaS…"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                aria-label="Filter by industry or sector"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" className="flex-1">
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
                <span className="font-medium text-content">{totalItems}</span> job
                {totalItems === 1 ? '' : 's'}
                {vault && (
                  <span className="hidden text-xs text-content-faint sm:inline">
                    · {vault.name}
                  </span>
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
              { value: 'publishedDate', label: 'Published date' },
              { value: 'title', label: 'Title' },
              { value: 'company', label: 'Company' },
            ]}
          />
        </div>

        {loading ? (
          view === 'grid' ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <Skeleton key={i} className="h-56" />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <Skeleton key={i} className="h-28" />
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
              title="No jobs found in this vault"
              description="Try changing your filters or clearing your search."
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
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
