'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { fetchOpportunities, fetchVaultById } from '@/lib/services';
import { Opportunity, OpportunityQuery, PaginatedResult, Vault } from '@/lib/types';
import {
  Button,
  Card,
  Input,
  Pagination,
  Select,
  Skeleton,
  ErrorState,
  EmptyState,
  SlidersIcon,
} from '@/components/ui';
import { SearchIcon, BriefcaseIcon } from '@/components/cards';
import { displayExperience } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { OPPORTUNITY_CATEGORIES, EMPLOYMENT_TYPES } from '@/lib/types';
import Eyebrow from '@/components/marketing/Eyebrow';
import InfoBanner from '@/components/marketing/InfoBanner';

const PAGE_SIZE = 10;

function titleOption(v: string) {
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function LockChip() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
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
          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
        />
      </svg>
      Subscriber access
    </span>
  );
}

function FunctionTag({ value }: { value?: string | null }) {
  if (!value) return <span className="text-content-faint">—</span>;
  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
      {value}
    </span>
  );
}

function OpportunityPageContent() {
  const searchParams = useSearchParams();
  const vaultId = searchParams.get('vaultId') || '';

  const [data, setData] = useState<PaginatedResult<Opportunity> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vault, setVault] = useState<Vault | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [country, setCountry] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (vaultId) {
      fetchVaultById(vaultId).then(setVault);
    } else {
      setVault(null);
    }
  }, [vaultId]);

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
      ...(vaultId ? { vaultId } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, employmentType, country, sortBy, vaultId, load]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(1);
    load({
      page: 1,
      limit: PAGE_SIZE,
      search,
      category,
      employmentType,
      country,
      sortBy,
      sortOrder: 'desc',
      ...(vaultId ? { vaultId } : {}),
    });
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setEmploymentType('');
    setCountry('');
    setPage(1);
    load({
      page: 1,
      limit: PAGE_SIZE,
      search: '',
      category: '',
      employmentType: '',
      country: '',
      sortBy,
      sortOrder: 'desc',
      ...(vaultId ? { vaultId } : {}),
    });
  };

  const current = data?.meta.page ?? 1;
  const totalPages = data?.meta.totalPages ?? 1;
  const totalItems = data?.meta.totalItems ?? 0;
  const hasActiveFilters = Boolean(search || category || employmentType || country);

  return (
    <div className="overflow-hidden">
      {/* SECTION 1 — NAVY HERO */}
      <section className="bg-[#0A1730]">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          {vaultId && (
            <Link
              href="/vaults"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-300 hover:text-white"
            >
              <span aria-hidden>←</span> All vaults
            </Link>
          )}
          <Eyebrow invert>{vaultId ? 'VAULT OPPORTUNITIES' : 'LIVE FREE PREVIEW'}</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl">
            {vaultId
              ? `Opportunities in ${vault?.name ?? 'this vault'}`
              : 'Review the opportunity flow before making any subscription decision.'}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
            {vaultId
              ? 'Every opportunity below belongs to this Vault. Full company, source, contact and application details are unlocked by your active subscription, while remaining fields stay visible.'
              : 'This is the same live opportunity database used across the platform. Non-subscribers can browse the records and visible fields without subscribing. Protected company, source, contact and detailed application information unlock only with the relevant active subscription.'}
          </p>
        </div>
      </section>

      {/* SECTION 2 — PREVIEW NOTICE */}
      <section className="border-b border-line bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <InfoBanner>
            No subscription is required to browse the preview. We encourage you to review the
            current opportunities first and continue only if the available access is genuinely
            useful for your search.
          </InfoBanner>
        </div>
      </section>

      {/* SECTION 3 — LIVE OPPORTUNITY TABLE */}
      <section className="bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Filters */}
          <Card className="overflow-hidden" padding={false}>
            <div className="flex items-center gap-2 border-b border-line bg-surface-muted/60 px-5 py-3 dark:bg-surface-elevated/50">
              <SlidersIcon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <span className="text-sm font-semibold text-content">Filter &amp; search</span>
            </div>
            <form onSubmit={handleSearch} className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-5">
              <Input
                label="Search"
                placeholder="Title, company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search opportunities"
              />
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
                  <Button type="button" variant="outline" onClick={clearFilters}>
                    Reset
                  </Button>
                )}
              </div>
            </form>
          </Card>

          {/* Results count */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-content-muted">
              {!loading && (
                <>
                  <span className="font-medium text-content">{totalItems}</span> result
                  {totalItems === 1 ? '' : 's'}
                </>
              )}
            </p>
            <Select
              className="w-40"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort"
              options={[
                { value: 'createdAt', label: 'Newest first' },
                { value: 'title', label: 'Title' },
              ]}
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="mt-6 space-y-3">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
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
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-[#0A1730] text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                      <th className="whitespace-nowrap px-5 py-3">Role</th>
                      <th className="whitespace-nowrap px-5 py-3">Location</th>
                      <th className="whitespace-nowrap px-5 py-3">Experience</th>
                      <th className="whitespace-nowrap px-5 py-3">Function</th>
                      <th className="whitespace-nowrap px-5 py-3">Company / Source</th>
                      <th className="whitespace-nowrap px-5 py-3">Application Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-surface dark:bg-surface-elevated">
                    {data.items.map((o) => (
                      <tr key={o.id} className="transition-colors hover:bg-surface-muted">
                        <td className="px-5 py-3.5 font-medium text-content">{o.title}</td>
                        <td className="px-5 py-3.5 text-content-muted">
                          {o.location || o.country || '—'}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-content-muted">
                          {displayExperience(o.experienceText, o.minExperience, o.maxExperience)}
                        </td>
                        <td className="px-5 py-3.5">
                          <FunctionTag value={o.functionalArea} />
                        </td>
                        <td className="px-5 py-3.5">
                          {o.isFullAccess ? (
                            o.company || <span className="text-content-faint">—</span>
                          ) : (
                            <LockChip />
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {o.isFullAccess ? (
                            o.applicationUrl ? (
                              <a
                                href={o.applicationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                              >
                                Apply →
                              </a>
                            ) : o.applicationContact ? (
                              <span className="text-content-muted">{o.applicationContact}</span>
                            ) : (
                              <span className="text-content-faint">—</span>
                            )
                          ) : (
                            <LockChip />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
      </section>

      {/* SECTION 4 — NEXT STEP */}
      <section className="bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <Eyebrow>NEXT STEP</Eyebrow>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-content sm:text-4xl">
              {vaultId
                ? 'Everything here belongs to one Vault.'
                : 'Found the opportunity mix relevant?'}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-content-muted">
              {vaultId
                ? `You are viewing the opportunities inside ${vault?.name ?? 'this vault'}. Full company, source, contact and application details unlock with an active subscription for this Vault.`
                : 'Continue to Vaults & Plans to identify which access level matches your geography and experience. If the preview is not useful to you right now, there is no need to subscribe.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={vaultId ? `/vaults/${vaultId}` : '/vaults'}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-400 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
              >
                {vaultId
                  ? `Manage ${vault?.name ?? 'this Vault'} access`
                  : 'Continue to Vaults & Plans'}
                <span aria-hidden="true">→</span>
              </Link>
              {vaultId && (
                <Link
                  href="/vaults"
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-6 py-3 text-base font-semibold text-content transition-colors hover:border-brand-300 dark:bg-surface-elevated"
                >
                  All Vaults &amp; Plans
                </Link>
              )}
            </div>
          </div>

          <div className="mt-16 border-t border-line pt-10">
            <p className="text-xs text-content-faint">
              Illustrative records are shown in this design mock-up. The live website will display
              the current database records available on the platform.
            </p>
            <p className="mt-3 text-sm font-medium text-content-muted">
              Explore first. Decide for yourself.
            </p>
            <p className="mt-1 text-sm text-content-muted">Subscribe only if it adds value.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function FreePreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="overflow-hidden">
          <section className="bg-[#0A1730]">
            <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-24">
              <div className="h-4 w-40 bg-slate-700" />
              <div className="mt-5 h-10 w-full max-w-2xl bg-slate-700" />
            </div>
          </section>
          <section className="bg-surface-muted">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-2xl bg-surface animate-pulse" />
                ))}
              </div>
            </div>
          </section>
        </div>
      }
    >
      <OpportunityPageContent />
    </Suspense>
  );
}
