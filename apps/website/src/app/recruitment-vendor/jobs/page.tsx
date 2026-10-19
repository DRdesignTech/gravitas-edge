'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, GridIcon, ListIcon, Pagination, Skeleton, useToast } from '@/components/ui';
import { BarsIcon, IdIcon, LayersIcon, PinIcon, SearchIcon } from '@/components/cards';
import Eyebrow from '@/components/marketing/Eyebrow';
import { formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { fetchRvaOpportunities } from '@/lib/services';
import { RvaOpportunity } from '@/lib/types';
import { useAuth } from '@/lib/auth';

const PAGE_SIZE = 10;
const VIEW_KEY = 'rva-jobs-view';

function RvaChip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-line bg-surface-muted/70 px-2.5 py-1 text-xs font-medium text-content-muted dark:bg-surface">
      {icon && <span className="shrink-0 text-content-faint">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  );
}

function RvaMeta({ opportunity }: { opportunity: RvaOpportunity }) {
  const geography = opportunity.geography || opportunity.location;
  const published = formatDate(opportunity.publishedDate);
  return (
    <div className="flex flex-wrap gap-1.5">
      {opportunity.jobId && (
        <RvaChip icon={<IdIcon className="h-3.5 w-3.5" />}>#{opportunity.jobId}</RvaChip>
      )}
      <Badge variant="info" className="shrink-0">
        {opportunity.categoryLabel}
      </Badge>
      {opportunity.sector && (
        <RvaChip icon={<LayersIcon className="h-3.5 w-3.5" />}>{opportunity.sector}</RvaChip>
      )}
      {geography && <RvaChip icon={<PinIcon className="h-3.5 w-3.5" />}>{geography}</RvaChip>}
      {opportunity.experienceText && (
        <RvaChip icon={<BarsIcon className="h-3.5 w-3.5" />}>{opportunity.experienceText}</RvaChip>
      )}
      {published && <RvaChip>{published}</RvaChip>}
    </div>
  );
}

export default function RvaJobsPage() {
  const { user, loading: authLoading, hasRvaAccess } = useAuth();
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [opportunities, setOpportunities] = useState<RvaOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const rvaEntitled = hasRvaAccess === true;

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(VIEW_KEY);
      if (stored === 'list' || stored === 'grid') setView(stored);
      else if (window.innerWidth < 768) setView('list');
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const handleViewChange = (v: 'grid' | 'list') => {
    setView(v);
    try {
      window.sessionStorage.setItem(VIEW_KEY, v);
    } catch {
      // Ignore storage failures.
    }
  };

  const fetchPage = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchRvaOpportunities({
          page: pageNum,
          limit: PAGE_SIZE,
          search: searchQuery || undefined,
        });
        setOpportunities(res.items);
        setTotalPages(res.meta.totalPages);
        setPage(pageNum);
      } catch (e) {
        setError(getErrorMessage(e));
        showToast(getErrorMessage(e), 'error');
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, showToast],
  );

  useEffect(() => {
    if (!rvaEntitled) return;
    fetchPage(1);
  }, [fetchPage, rvaEntitled]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    fetchPage(1);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  if (authLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  // The RVA opportunities directory is part of the paid Recruitment Vendor
  // Access product: it is only shown to users with an active RVA subscription.
  if (!rvaEntitled) {
    return (
      <div className="section-glow relative">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-24">
          <Eyebrow>RECRUITMENT VENDOR ACCESS</Eyebrow>
          <h1 className="mt-3 font-serif-heading text-3xl font-bold leading-tight text-content sm:text-4xl">
            RVA Opportunities
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-content-muted">
            This directory is available to users with an active Recruitment Vendor Access plan.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {!user && (
              <Link href="/login">
                <Button variant="outline">Sign in</Button>
              </Link>
            )}
            <Link href="/recruitment-vendor#plans">
              <Button>View RVA plans</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-clip">
      <section className="relative border-b border-line bg-surface-muted/60">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="max-w-2xl">
            <Eyebrow>RECRUITMENT VENDOR ACCESS</Eyebrow>
            <h1 className="mt-3 font-serif-heading text-3xl font-bold leading-tight text-content sm:text-4xl">
              Recruitment Vendor Opportunities
            </h1>
            <p className="mt-3 text-base leading-relaxed text-content-muted">
              Browse every published RVA opportunity. Full commercial and contact details are
              available on each opportunity page.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <form onSubmit={handleSearch} className="w-full max-w-2xl">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-content-muted/50" />
                  <input
                    id="rva-jobs-search"
                    type="text"
                    placeholder="Search by role, organization, industry, geography, Job ID or keyword"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-5 py-3.5 pl-12 pr-10 text-base text-content placeholder:text-hint shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface-elevated"
                    aria-label="Search recruitment vendor opportunities"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
                      aria-label="Clear search"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <Button type="submit" className="shrink-0 gap-2">
                  <SearchIcon className="h-4 w-4" />
                  Search
                </Button>
              </div>
            </form>

            <div className="inline-flex shrink-0 items-center gap-0.5 self-start rounded-xl border border-line bg-surface p-0.5 shadow-sm dark:bg-surface-elevated sm:self-auto">
              <button
                type="button"
                onClick={() => handleViewChange('grid')}
                aria-pressed={view === 'grid'}
                aria-label="Grid view"
                className={`inline-flex h-9 w-10 items-center justify-center rounded-lg transition-colors ${
                  view === 'grid'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-content-muted hover:bg-surface-muted hover:text-content'
                }`}
              >
                <GridIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleViewChange('list')}
                aria-pressed={view === 'list'}
                aria-label="List view"
                className={`inline-flex h-9 w-10 items-center justify-center rounded-lg transition-colors ${
                  view === 'list'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-content-muted hover:bg-surface-muted hover:text-content'
                }`}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-glow relative">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {loading && (
            <div className={`grid gap-4 ${view === 'grid' ? 'sm:grid-cols-2 lg:grid-cols-3' : ''}`}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-line bg-surface-muted px-6 py-10 text-center">
              <p className="text-sm text-content-muted">{error}</p>
            </div>
          )}

          {!loading && !error && opportunities.length === 0 && (
            <div className="rounded-2xl border border-line bg-surface-muted px-6 py-10 text-center">
              <p className="text-sm text-content-muted">
                {searchQuery
                  ? 'No opportunities match your search.'
                  : 'New opportunities will appear here as they are published.'}
              </p>
            </div>
          )}

          {!loading && !error && opportunities.length > 0 && (
            <>
              {view === 'grid' ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {opportunities.map((o) => (
                    <Link
                      key={o.id}
                      href={`/recruitment-vendor/jobs/${o.id}`}
                      className="group card-premium relative flex h-full flex-col overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
                    >
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold leading-snug text-content transition-colors group-hover:text-brand-700">
                            {o.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm text-content-muted">
                            {o.organization || o.company || ''}
                          </p>
                        </div>
                        <Badge variant="info">{o.categoryLabel}</Badge>
                      </div>
                      <div className="relative mt-3">
                        <RvaMeta opportunity={o} />
                      </div>
                      <div className="mt-auto pt-3 text-xs font-semibold text-brand-600 group-hover:text-brand-700">
                        View details →
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {opportunities.map((o) => (
                    <Link
                      key={o.id}
                      href={`/recruitment-vendor/jobs/${o.id}`}
                      className="group flex flex-col gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm transition-colors hover:border-brand-300 hover:bg-surface-muted dark:bg-surface-elevated sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[15px] font-bold leading-snug text-content transition-colors group-hover:text-brand-700">
                          {o.title}
                        </h3>
                        <div className="mt-1.5">
                          <RvaMeta opportunity={o} />
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-brand-600 group-hover:text-brand-700">
                        View details →
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <div className="mt-8">
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchPage} />
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
