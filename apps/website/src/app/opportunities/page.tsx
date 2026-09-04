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
  PageHeader,
  Badge,
} from '@/components/ui';
import { OpportunityCard, SearchIcon, BriefcaseIcon } from '@/components/cards';
import { getErrorMessage } from '@/lib/errors';
import { OPPORTUNITY_CATEGORIES, EMPLOYMENT_TYPES } from '@/lib/types';

const PAGE_SIZE = 9;

function titleOption(v: string) {
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

  const current = data?.meta.page ?? 1;
  const totalPages = data?.meta.totalPages ?? 1;
  const totalItems = data?.meta.totalItems ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        title="Opportunities"
        subtitle="Search curated roles across India and the globe."
      />

      {/* Filters */}
      <Card className="mt-7" padding={false}>
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
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              <SearchIcon className="h-4 w-4" /> Search
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-content-muted">
          {!loading && (
            <>
              <span className="font-medium text-content">{totalItems}</span> result
              {totalItems === 1 ? '' : 's'}
            </>
          )}
          {data?.items.some((o) => o.isPremium) && (
            <Badge variant="premium" className="ml-2 hidden sm:inline-flex">
              ⚡ Premium
            </Badge>
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
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
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
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setCategory('');
                  setEmploymentType('');
                  setCountry('');
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.items.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} />
            ))}
          </div>
          <Pagination
            className="mt-8"
            currentPage={current}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
