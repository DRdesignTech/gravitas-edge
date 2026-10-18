'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
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
  GlobeIcon,
  ProtectedFields,
  PremiumAccessPanel,
} from '@/components/cards';
import { Badge, LockIcon, UnlockIcon } from '@/components/ui';
import { displayExperience, formatDate, hasExperience, isMeaningful } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { OPPORTUNITY_CATEGORIES, EMPLOYMENT_TYPES } from '@/lib/types';
import Eyebrow from '@/components/marketing/Eyebrow';
import InfoBanner from '@/components/marketing/InfoBanner';
import { useAuth } from '@/lib/auth';
import { previousInternalRoute } from '@/lib/navigation';
import { extractEmail, buildApplyMailto } from '@job-portal/shared';

const PAGE_SIZE = 10;

const LIST_STATE_KEY = 'ge-opps-list-state';

interface SavedListState {
  search?: string;
  category?: string;
  employmentType?: string;
  country?: string;
  sortBy?: string;
  page?: number;
  scrollY?: number;
}

function readSavedListState(): SavedListState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(LIST_STATE_KEY);
    return raw ? (JSON.parse(raw) as SavedListState) : null;
  } catch {
    return null;
  }
}

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
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-xl border border-line bg-surface p-0.5 shadow-sm dark:bg-surface-elevated"
      role="group"
      aria-label="Choose view layout"
    >
      <button
        type="button"
        onClick={() => onChange('grid')}
        aria-pressed={view === 'grid'}
        aria-label="Grid view"
        title="Grid view"
        className={`inline-flex h-9 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
          view === 'grid'
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-content-muted hover:text-content'
        }`}
      >
        <GridIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-pressed={view === 'list'}
        aria-label="List view"
        title="List view"
        className={`inline-flex h-9 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
          view === 'list'
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-content-muted hover:text-content'
        }`}
      >
        <ListIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

const READ_VIEW_KEY = 'opportunities-view';

function readInitialView(): OpportunityView {
  if (typeof window === 'undefined') return 'grid';
  try {
    if (window.sessionStorage.getItem(READ_VIEW_KEY) === 'list') return 'list';
  } catch {
    // Ignore storage failures.
  }
  return 'grid';
}

function MetaChip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-line bg-surface-muted/70 px-2.5 py-1 text-xs font-medium text-content-muted dark:bg-surface">
      <span className="shrink-0 text-content-faint">{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

function OpportunityMeta({ o }: { o: Opportunity }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {o.location && <MetaChip icon={<PinIcon className="h-3.5 w-3.5" />}>{o.location}</MetaChip>}
      {o.country && <MetaChip icon={<GlobeIcon className="h-3.5 w-3.5" />}>{o.country}</MetaChip>}
      {o.employmentType && (
        <MetaChip icon={<BriefcaseIcon className="h-3.5 w-3.5" />}>
          {titleOption(o.employmentType)}
        </MetaChip>
      )}
      {o.industry && (
        <MetaChip icon={<LayersIcon className="h-3.5 w-3.5" />}>{o.industry}</MetaChip>
      )}
      {hasExperience(o.experienceText, o.minExperience, o.maxExperience) && (
        <MetaChip icon={<BarsIcon className="h-3.5 w-3.5" />}>
          {displayExperience(o.experienceText, o.minExperience, o.maxExperience)}
        </MetaChip>
      )}
    </div>
  );
}

function PremiumLockedBox({ o }: { o: Opportunity }) {
  const locked = !o.isFullAccess;
  if (!locked) {
    return (
      <div className="rounded-xl border border-brand-200/70 bg-gradient-to-br from-brand-50/40 via-surface to-surface p-3.5 dark:border-brand-500/20 dark:from-brand-500/[0.06] dark:via-surface-elevated dark:to-surface-elevated">
        <div className="mb-2.5 flex items-center gap-1.5">
          <UnlockIcon className="h-3.5 w-3.5 shrink-0 text-brand-600/80 dark:text-brand-400/80" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-content-faint">
            Full access details
          </span>
        </div>
        <ProtectedFields opportunity={o} showLock={false} />
      </div>
    );
  }
  return (
    <PremiumAccessPanel
      vaultId={o.vaults?.[0]?.id}
      onClick={(e: React.MouseEvent<HTMLElement>) => e.stopPropagation()}
    />
  );
}

function OpportunityAction({ o }: { o: Opportunity }) {
  if (o.isFullAccess) {
    const email = extractEmail(o.applicationContact, o.applicationUrl);
    if (email) {
      return (
        <a
          href={buildApplyMailto(email, { title: o.title, company: o.company })}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex shrink-0 items-center gap-1 truncate rounded-full bg-brand-50 px-3.5 py-1.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
        >
          Apply <span aria-hidden="true">→</span>
        </a>
      );
    }
    return (
      <span className="shrink-0 truncate rounded-full border border-line bg-surface-muted/70 px-3.5 py-1.5 text-xs text-content-muted">
        Application email unavailable
      </span>
    );
  }
  return (
    <Link
      href="/plans"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-sm font-semibold text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
    >
      <LockIcon className="h-3.5 w-3.5" />
      Unlock Full Access
    </Link>
  );
}

function OpportunityPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vaultId = searchParams.get('vaultId') || '';
  const { user, loading: authLoading } = useAuth();

  const openOpportunity = useCallback(
    (id: string) => {
      router.push(`/opportunities/${id}`);
    },
    [router],
  );

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
  const [view, setView] = useState<OpportunityView>(readInitialView);

  const didRestore = useRef(false);
  const pendingScroll = useRef(0);

  const handleViewChange = (v: OpportunityView) => {
    setView(v);
    try {
      window.sessionStorage.setItem(READ_VIEW_KEY, v);
    } catch {
      // Ignore storage failures.
    }
  };

  const hasActiveSubscription = user?.subscriptions?.some(
    (s: Subscription) => s.status === 'ACTIVE' && new Date(s.endDate) > new Date(),
  );
  const isSubscriber = Boolean(user && hasActiveSubscription);

  useEffect(() => {
    if (vaultId) {
      fetchVaultById(vaultId)
        .then(setVault)
        .catch(() => setVault(null));
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
    if (!didRestore.current) {
      didRestore.current = true;
      // Restore the exact listing (filters/page/scroll) when the visitor returns
      // from an opportunity detail page, so Browser Back lands where they were.
      if (typeof window !== 'undefined') {
        const prev = previousInternalRoute();
        if (prev && /^\/opportunities\/.+/.test(prev)) {
          const saved = readSavedListState();
          if (saved) {
            const next = {
              search: saved.search || '',
              category: saved.category || '',
              employmentType: saved.employmentType || '',
              country: saved.country || '',
              sortBy: saved.sortBy || 'createdAt',
              page: saved.page || 1,
            };
            const changed =
              next.search !== search ||
              next.category !== category ||
              next.employmentType !== employmentType ||
              next.country !== country ||
              next.sortBy !== sortBy ||
              next.page !== page;
            if (changed) {
              setSearch(next.search);
              setCategory(next.category);
              setEmploymentType(next.employmentType);
              setCountry(next.country);
              setSortBy(next.sortBy);
              setPage(next.page);
            }
            pendingScroll.current = Number(saved.scrollY || 0);
            if (changed) {
              // Restored state re-renders this effect, which runs the load below.
              return;
            }
            // Values already match — load directly with the restored query.
          }
        }
      }
    }
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

  // Persist the listing context so a later Back restores it exactly.
  useEffect(() => {
    if (!data || typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(
        LIST_STATE_KEY,
        JSON.stringify({
          search,
          category,
          employmentType,
          country,
          sortBy,
          page,
          scrollY: window.scrollY,
        }),
      );
    } catch {
      // Ignore storage failures.
    }
  }, [data, search, category, employmentType, country, sortBy, page]);

  // Keep the recorded scroll position fresh, and capture it when leaving the
  // page (e.g. clicking into a detail), so the restored page lands mid-list.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timer: number | undefined;
    const saveScroll = () => {
      try {
        const raw = window.sessionStorage.getItem(LIST_STATE_KEY);
        const cur = raw ? (JSON.parse(raw) as SavedListState) : {};
        cur.scrollY = window.scrollY;
        window.sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify(cur));
      } catch {
        // Ignore storage failures.
      }
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(saveScroll, 150);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      saveScroll();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Restore the saved scroll position after the restored listing renders.
  useEffect(() => {
    if (pendingScroll.current > 0) {
      const y = pendingScroll.current;
      pendingScroll.current = 0;
      window.scrollTo(0, y);
    }
  }, [data]);

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
        <section className="bg-[#061B36]">
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
      <section className="bg-[#061B36]">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          {vaultId && (
            <Link
              href="/vaults"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#C8943E] hover:text-white"
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
                : 'Review the current opportunities before you decide about a subscription.'}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
            {vaultId
              ? 'Every opportunity below belongs to this Vault. Full company, source, contact and application details are unlocked by your active subscription, while remaining fields stay visible.'
              : isSubscriber
                ? 'You are viewing the live opportunity database with full subscriber access. Company names, sources, contacts and application links are visible for opportunities in your unlocked vaults.'
                : 'These are the same opportunities used across the platform. You can browse them and see the visible details without subscribing. Company, source, contact and detailed application information become available only with the relevant active subscription.'}
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
              <ViewToggle view={view} onChange={handleViewChange} />
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
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                  {data.items.map((o) => (
                    <article
                      key={o.id}
                      onClick={() => openOpportunity(o.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openOpportunity(o.id);
                        }
                      }}
                      role="link"
                      tabIndex={0}
                      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:bg-surface-elevated dark:hover:border-brand-500/50"
                    >
                      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-600 to-brand-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:from-brand-400 dark:to-brand-300" />
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#061B36] text-base font-bold text-[#E3B968] shadow-sm">
                              {(o.company || o.title || '?')[0]?.toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <h3 className="truncate text-[15px] font-bold leading-snug text-content group-hover:text-brand-700 dark:group-hover:text-brand-300">
                                {o.title}
                              </h3>
                            </div>
                          </div>
                          <FunctionTag value={o.functionalArea} />
                        </div>

                        {isMeaningful(o.salary) && (
                          <p
                            className="mt-2.5 truncate text-base font-bold text-brand-700 dark:text-brand-300"
                            title={o.salary}
                          >
                            {o.salary}
                          </p>
                        )}

                        <div className="mt-2">
                          <OpportunityMeta o={o} />
                        </div>

                        {o.isPremium && (
                          <div className="mt-4">
                            <PremiumLockedBox o={o} />
                          </div>
                        )}

                        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
                          <OpportunityAction o={o} />
                          <span className="flex items-center gap-2">
                            <Badge variant="info">{titleOption(o.category)}</Badge>
                            {o.publishedDate && (
                              <span className="hidden text-xs text-content-faint sm:inline">
                                {formatDate(o.publishedDate)}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {data.items.map((o) => (
                    <article
                      key={o.id}
                      onClick={() => openOpportunity(o.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openOpportunity(o.id);
                        }
                      }}
                      role="link"
                      tabIndex={0}
                      className="group relative flex cursor-pointer flex-col gap-4 overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:bg-surface-elevated dark:hover:border-brand-500/50 sm:p-6 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-6"
                    >
                      <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-brand-600 to-brand-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:from-brand-400 dark:to-brand-300" />
<div className="min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#061B36] text-base font-bold text-[#E3B968] shadow-sm">
                                  {(o.company || o.title || '?')[0]?.toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                  <h3 className="truncate text-[15px] font-bold leading-snug text-content group-hover:text-brand-700 dark:group-hover:text-brand-300">
                                    {o.title}
                                  </h3>
                                </div>
                              </div>
                              <FunctionTag value={o.functionalArea} />
                            </div>

                            {isMeaningful(o.salary) && (
                          <p
                            className="mt-3 truncate text-base font-bold text-brand-700 dark:text-brand-300"
                            title={o.salary}
                          >
                            {o.salary}
                          </p>
                        )}

                        <div className="mt-3">
                          <OpportunityMeta o={o} />
                        </div>
                      </div>

                      <div className="min-w-0 space-y-4 lg:border-l lg:border-line lg:pl-6">
                        {o.isPremium && <PremiumLockedBox o={o} />}

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                          <OpportunityAction o={o} />
                          <span className="flex items-center gap-2">
                            <Badge variant="info">{titleOption(o.category)}</Badge>
                            {o.publishedDate && (
                              <span className="text-xs text-content-faint">
                                {formatDate(o.publishedDate)}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <Pagination
                className="mt-10"
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
                  : 'Continue to Vaults & Plans to find the access level that matches your location and experience. If the preview is not useful to you right now, there is no need to subscribe.'}
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
          <section className="bg-[#061B36]">
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
