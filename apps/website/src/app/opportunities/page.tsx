'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { fetchOpportunities, fetchVaultById } from '@/lib/services';
import { Opportunity, OpportunityQuery, PaginatedResult, Vault, Subscription } from '@/lib/types';
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
  GridIcon,
  ListIcon,
} from '@/components/ui';
import {
  SearchIcon,
  BriefcaseIcon,
  PinIcon,
  LayersIcon,
  BarsIcon,
  ProtectedFields,
} from '@/components/cards';
import { Badge, LockIcon } from '@/components/ui';
import { displayExperience, formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { OPPORTUNITY_CATEGORIES, EMPLOYMENT_TYPES } from '@/lib/types';
import Eyebrow from '@/components/marketing/Eyebrow';
import InfoBanner from '@/components/marketing/InfoBanner';
import { useAuth } from '@/lib/auth';

const PAGE_SIZE = 10;

function titleOption(v: string) {
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function FunctionTag({ value }: { value?: string | null }) {
  if (!value) return <span className="text-content-faint">—</span>;
  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
      {value}
    </span>
  );
}

type OpportunityView = 'grid' | 'list';

function ViewToggle({
  view,
  onChange,
}: {
  view: OpportunityView;
  onChange: (v: OpportunityView) => void;
}) {
  const base =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400';
  const active = 'bg-brand-600 text-white shadow-sm';
  const idle = 'text-content-muted hover:text-content';
  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1 dark:bg-surface-elevated"
      role="group"
      aria-label="Toggle view"
    >
      <button
        type="button"
        onClick={() => onChange('grid')}
        aria-pressed={view === 'grid'}
        className={`${base} ${view === 'grid' ? active : idle}`}
      >
        <GridIcon className="h-4 w-4" />
        Grid
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-pressed={view === 'list'}
        className={`${base} ${view === 'list' ? active : idle}`}
      >
        <ListIcon className="h-4 w-4" />
        List
      </button>
    </div>
  );
}

function OpportunityPageContent() {
  const searchParams = useSearchParams();
  const vaultId = searchParams.get('vaultId') || '';
  const { user, loading: authLoading } = useAuth();

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
  const [view, setView] = useState<OpportunityView>('grid');

  const hasActiveSubscription = user?.subscriptions?.some(
    (s: Subscription) => s.status === 'ACTIVE' && new Date(s.endDate) > new Date(),
  );
  const isSubscriber = Boolean(user && hasActiveSubscription);

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

  if (authLoading) {
    return (
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
    );
  }

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
          <Eyebrow invert>
            {vaultId
              ? 'VAULT OPPORTUNITIES'
              : isSubscriber
                ? 'SUBSCRIBER ACCESS'
                : 'LIVE FREE PREVIEW'}
          </Eyebrow>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl">
            {vaultId
              ? `Opportunities in ${vault?.name ?? 'this vault'}`
              : isSubscriber
                ? 'Your active subscription unlocks full opportunity details below.'
                : 'Review the opportunity flow before making any subscription decision.'}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
            {vaultId
              ? 'Every opportunity below belongs to this Vault. Full company, source, contact and application details are unlocked by your active subscription, while remaining fields stay visible.'
              : isSubscriber
                ? 'You are viewing the live opportunity database with full subscriber access. Company names, sources, contacts and application links are visible for opportunities in your unlocked vaults.'
                : 'This is the same live opportunity database used across the platform. Non-subscribers can browse the records and visible fields without subscribing. Protected company, source, contact and detailed application information unlock only with the relevant active subscription.'}
          </p>
        </div>
      </section>

      {!isSubscriber && !vaultId && (
        <>
          {/* SECTION 2 — PREVIEW NOTICE (only for non-subscribers on free preview) */}
          <section className="border-b border-line bg-surface-muted">
            <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
              <InfoBanner>
                No subscription is required to browse the preview. We encourage you to review the
                current opportunities first and continue only if the available access is genuinely
                useful for your search.
              </InfoBanner>
            </div>
          </section>
        </>
      )}

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
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-content-muted">
              {!loading && (
                <>
                  <span className="font-medium text-content">{totalItems}</span> result
                  {totalItems === 1 ? '' : 's'}
                </>
              )}
            </p>
            <div className="flex items-center gap-3">
              <ViewToggle view={view} onChange={setView} />
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
              {view === 'grid' ? (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {data.items.map((o) => (
                    <article
                      key={o.id}
                      className="group flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg dark:bg-surface-elevated"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold leading-snug text-content">
                          {o.title}
                        </h3>
                        <FunctionTag value={o.functionalArea} />
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-content">
                        {o.company || '—'}
                      </p>
                      <dl className="mt-4 space-y-2 text-sm text-content-muted">
                        {o.industry && (
                          <div className="flex items-center gap-1.5">
                            <LayersIcon className="h-4 w-4 shrink-0 text-content-faint" />
                            {o.industry}
                          </div>
                        )}
                        {o.salary && (
                          <div className="flex items-center gap-1.5 font-semibold text-brand-700 dark:text-brand-300">
                            <BriefcaseIcon className="h-4 w-4 shrink-0 text-content-faint" />
                            {o.salary}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <PinIcon className="h-4 w-4 shrink-0 text-content-faint" />
                          {o.location || o.country || '—'}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BarsIcon className="h-4 w-4 shrink-0 text-content-faint" />
                          {displayExperience(o.experienceText, o.minExperience, o.maxExperience)}
                        </div>
                      </dl>

                      {o.isPremium && (
                        <div className="mt-4 rounded-xl border border-dashed border-amber-200 bg-amber-50/40 p-3 dark:border-amber-500/25 dark:bg-amber-500/5">
                          <ProtectedFields opportunity={o} />
                        </div>
                      )}

                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
                        {o.isFullAccess ? (
                          o.applicationUrl ? (
                            <a
                              href={o.applicationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                            >
                              Apply →
                            </a>
                          ) : (
                            <span className="shrink-0 truncate text-xs text-content-faint">
                              {o.applicationContact || '—'}
                            </span>
                          )
                        ) : (
                          <Link
                            href="/plans"
                            className="inline-flex items-center gap-1 shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                          >
                            <LockIcon className="h-3.5 w-3.5" />
                            Unlock Full Access
                          </Link>
                        )}
                        <span className="flex items-center gap-2">
                          <Badge variant="info">{titleOption(o.category)}</Badge>
                          {o.publishedDate && (
                            <span className="hidden text-xs text-content-faint sm:inline">
                              {formatDate(o.publishedDate)}
                            </span>
                          )}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-[#0A1730] text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                        <th className="whitespace-nowrap px-5 py-3">Role</th>
                        <th className="whitespace-nowrap px-5 py-3">Company</th>
                        <th className="whitespace-nowrap px-5 py-3">Salary</th>
                        <th className="whitespace-nowrap px-5 py-3">Location</th>
                        <th className="whitespace-nowrap px-5 py-3">Experience</th>
                        <th className="whitespace-nowrap px-5 py-3">Function</th>
                        <th className="whitespace-nowrap px-5 py-3">Qualification</th>
                        <th className="whitespace-nowrap px-5 py-3">
                          Other Details / How to Apply
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-surface dark:bg-surface-elevated">
                      {data.items.map((o) => (
                        <tr key={o.id} className="transition-colors hover:bg-surface-muted">
                          <td className="px-5 py-3.5 font-medium text-content">{o.title}</td>
                          <td className="px-5 py-3.5 text-content">
                            {o.company || <span className="text-content-faint">—</span>}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-content-muted">
                            {o.salary || <span className="text-content-faint">—</span>}
                          </td>
                          <td className="px-5 py-3.5 text-content-muted">
                            {o.location || o.country || '—'}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-content-muted">
                            {displayExperience(o.experienceText, o.minExperience, o.maxExperience)}
                          </td>
                          <td className="px-5 py-3.5">
                            <FunctionTag value={o.functionalArea} />
                          </td>
                          <td className="px-5 py-3.5 max-w-xs truncate">
                            {o.isFullAccess ? (
                              o.qualification || <span className="text-content-faint">—</span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-content-faint truncate max-w-full">
                                <LockIcon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                {o.lockedPreview?.qualification || 'Vault Access'}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 max-w-xs truncate">
                            {o.isFullAccess ? (
                              o.applicationUrl ? (
                                <a
                                  href={o.applicationUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 truncate block max-w-full"
                                >
                                  Apply →
                                </a>
                              ) : o.applicationContact ? (
                                <span className="text-content-muted truncate block max-w-full">{o.applicationContact}</span>
                              ) : o.description ? (
                                <span className="line-clamp-2 text-content-muted block max-w-full">{o.description}</span>
                              ) : (
                                <span className="text-content-faint">—</span>
                              )
                            ) : (
                              <span className="flex flex-wrap items-center gap-1.5 text-content-faint truncate max-w-full">
                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 shrink-0">
                                  <LockIcon className="h-3.5 w-3.5" />
                                  {o.lockedPreview?.otherDetails || 'Other Details'}
                                </span>
                                <span className="text-content-faint shrink-0">·</span>
                                <span className="inline-flex items-center gap-1 shrink-0">
                                  <LockIcon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                  {o.lockedPreview?.howToApply || 'How to Apply'}
                                </span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
      </section>

      {/* SECTION 4 — NEXT STEP */}
      <section className="bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <Eyebrow>NEXT STEP</Eyebrow>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-content sm:text-4xl">
              {vaultId
                ? 'Everything here belongs to one Vault.'
                : isSubscriber
                  ? 'You have full subscriber access.'
                  : 'Found the opportunity mix relevant?'}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-content-muted">
              {vaultId
                ? `You are viewing the opportunities inside ${vault?.name ?? 'this vault'}. Full company, source, contact and application details unlock with an active subscription for this Vault.`
                : isSubscriber
                  ? 'Your active subscription gives you access to full opportunity details for unlocked vaults. Company names, sources, contacts and application links are visible where your subscription applies.'
                  : 'Continue to Vaults & Plans to identify which access level matches your geography and experience. If the preview is not useful to you right now, there is no need to subscribe.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={vaultId ? `/vaults/${vaultId}` : '/vaults'}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-400 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
              >
                {vaultId ? `Manage ${vault?.name ?? 'this Vault'} access` : 'View Vaults & Plans'}
                <span aria-hidden="true">→</span>
              </Link>
              {vaultId && (
                <Link
                  href="/vaults"
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-6 py-3 text-base font-semibold text-content transition-colors hover:border-brand-300 dark:bg-surface-elevated"
                >
                  All Vaults & Plans
                </Link>
              )}
            </div>
          </div>

          {!isSubscriber && !vaultId && (
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
          )}
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
