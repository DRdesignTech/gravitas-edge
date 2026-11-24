'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchOpportunities, fetchVaultById } from '@/lib/services';
import { Opportunity, OpportunityQuery, PaginatedResult, Vault, Subscription } from '@/lib/types';
import {
  Button,
  Pagination,
  Skeleton,
  ErrorState,
  EmptyState,
  GridIcon,
  ListIcon,
  SlidersIcon,
  CloseIcon,
} from '@/components/ui';
import { LockIcon } from '@/components/ui';
import { displayExperience, formatDate, hasExperience, isMeaningful } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { OPPORTUNITY_CATEGORIES, EMPLOYMENT_TYPES } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { previousInternalRoute } from '@/lib/navigation';
import { canRevealCompanyExperience } from '@/lib/opportunity-access';
import { extractEmail, buildApplyMailto } from '@job-portal/shared';

const PAGE_SIZE = 12;
const LIST_STATE_KEY = 'ge-opps-list-state';
const READ_VIEW_KEY = 'opportunities-view';

type OpportunityView = 'grid' | 'list';
type SortOption = 'new' | 'exp' | 'expd';

interface SavedListState {
  search?: string;
  category?: string;
  employmentType?: string;
  country?: string;
  sort?: SortOption;
  sortBy?: string;
  page?: number;
  scrollY?: number;
}

function parseSort(s: SortOption): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  if (s === 'exp') return { sortBy: 'minExperience', sortOrder: 'asc' };
  if (s === 'expd') return { sortBy: 'minExperience', sortOrder: 'desc' };
  return { sortBy: 'createdAt', sortOrder: 'desc' };
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

function readInitialView(): OpportunityView {
  if (typeof window === 'undefined') return 'grid';
  try {
    if (window.sessionStorage.getItem(READ_VIEW_KEY) === 'list') return 'list';
  } catch {
    // Ignore storage failures.
  }
  return 'grid';
}

function titleOption(v: string) {
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatJobId(id: string): string {
  if (!id) return '';
  if (id.startsWith('GE-')) return id;
  if (id.length <= 10) return id.toUpperCase();
  return `GE-${id.slice(0, 7).toUpperCase()}`;
}

const COUNTRY_FLAGS: Record<string, string> = {
  'United Arab Emirates': '🇦🇪',
  UAE: '🇦🇪',
  'Saudi Arabia': '🇸🇦',
  Singapore: '🇸🇬',
  'United Kingdom': '🇬🇧',
  UK: '🇬🇧',
  Germany: '🇩🇪',
  Qatar: '🇶🇦',
  Kenya: '🇰🇪',
  Canada: '🇨🇦',
  'United States': '🇺🇸',
  USA: '🇺🇸',
  US: '🇺🇸',
  India: '🇮🇳',
  Australia: '🇦🇺',
  Oman: '🇴🇲',
  Nigeria: '🇳🇬',
};

function formatAgo(dateString?: string | null): string {
  if (!dateString) return 'Recent';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'Recent';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  const weeks = Math.floor(diffDays / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(diffDays / 30);
  return `${months}m ago`;
}

function ViewToggle({
  view,
  onChange,
}: {
  view: OpportunityView;
  onChange: (v: OpportunityView) => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-xl border border-[#E9E5DC] bg-white p-1 shadow-2xs dark:border-[#1E3557] dark:bg-[#0E2340]"
      role="group"
      aria-label="Choose view layout"
    >
      <button
        type="button"
        onClick={() => onChange('grid')}
        aria-pressed={view === 'grid'}
        aria-label="Grid view"
        title="Grid view"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6952F] ${
          view === 'grid'
            ? 'bg-[#061B36] text-white shadow-2xs dark:bg-[#1D3B66]'
            : 'text-[#5B6479] hover:bg-slate-100 hover:text-[#061B36] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
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
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6952F] ${
          view === 'list'
            ? 'bg-[#061B36] text-white shadow-2xs dark:bg-[#1D3B66]'
            : 'text-[#5B6479] hover:bg-slate-100 hover:text-[#061B36] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
        }`}
      >
        <ListIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function OpportunityPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vaultId = searchParams.get('vaultId') || '';
  const initialCountry = searchParams.get('country') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialSearch = searchParams.get('search') || '';

  const { user, loading: authLoading, hasVaultAccess } = useAuth();

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

  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [employmentType, setEmploymentType] = useState('');
  const [country, setCountry] = useState(initialCountry);
  const [sort, setSort] = useState<SortOption>('new');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<OpportunityView>(readInitialView);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Prevent background scrolling when mobile filter drawer is open & close on Escape
  useEffect(() => {
    if (!mobileFilterOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileFilterOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileFilterOpen]);

  const didRestore = useRef(false);
  const pendingScroll = useRef(0);
  const searchParamsStr = searchParams.toString();
  const prevSearchParamsRef = useRef(searchParamsStr);

  // Synchronize URL query parameters (e.g. clicking country links in Footer or Hero search)
  useEffect(() => {
    if (prevSearchParamsRef.current !== searchParamsStr) {
      prevSearchParamsRef.current = searchParamsStr;
      const targetCountry = searchParams.get('country') || '';
      const targetCategory = searchParams.get('category') || '';
      const targetSearch = searchParams.get('search') || '';

      setCountry(targetCountry);
      setCategory(targetCategory);
      setSearch(targetSearch);
      setPage(1);
      pendingScroll.current = 0;
    }
  }, [searchParamsStr, searchParams]);

  // Handle direct footer country selection event for instant reactive filtering
  useEffect(() => {
    const handleFooterCountry = (e: CustomEvent<string>) => {
      const selected = e.detail || '';
      setCountry(selected);
      setPage(1);
      pendingScroll.current = 0;
      const params = new URLSearchParams(window.location.search);
      if (selected) {
        params.set('country', selected);
      } else {
        params.delete('country');
      }
      params.delete('page');
      const qs = params.toString();
      prevSearchParamsRef.current = qs;
      router.replace(`/opportunities${qs ? `?${qs}` : ''}`, { scroll: false });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('ge-filter-country' as any, handleFooterCountry as any);
    return () => {
      window.removeEventListener('ge-filter-country' as any, handleFooterCountry as any);
    };
  }, [router]);

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
      if (typeof window !== 'undefined') {
        const prev = previousInternalRoute();
        const hasExplicitUrlParams = Boolean(
          searchParams.get('country') ||
          searchParams.get('category') ||
          searchParams.get('search') ||
          searchParams.get('vaultId')
        );

        if (!hasExplicitUrlParams && prev && /^\/opportunities\/.+/.test(prev)) {
          const saved = readSavedListState();
          if (saved) {
            const savedSort: SortOption =
              saved.sort ||
              (saved.sortBy === 'minExperience' ? 'exp' : 'new');
            const next = {
              search: saved.search ?? '',
              category: saved.category ?? '',
              employmentType: saved.employmentType ?? '',
              country: saved.country ?? '',
              sort: savedSort,
              page: saved.page || 1,
            };
            const changed =
              next.search !== search ||
              next.category !== category ||
              next.employmentType !== employmentType ||
              next.country !== country ||
              next.sort !== sort ||
              next.page !== page;
            if (changed) {
              setSearch(next.search);
              setCategory(next.category);
              setEmploymentType(next.employmentType);
              setCountry(next.country);
              setSort(next.sort);
              setPage(next.page);
            }
            pendingScroll.current = Number(saved.scrollY || 0);
            if (changed) return;
          }
        } else if (hasExplicitUrlParams) {
          pendingScroll.current = 0;
        }
      }
    }

    const { sortBy: apiSortBy, sortOrder: apiSortOrder } = parseSort(sort);
    load({
      page,
      limit: PAGE_SIZE,
      search,
      category,
      employmentType,
      country,
      sortBy: apiSortBy,
      sortOrder: apiSortOrder,
      ...(vaultId ? { vaultId } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, employmentType, country, sort, vaultId, load]);

  // Persist the listing context
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
          sort,
          page,
          scrollY: window.scrollY,
        }),
      );
    } catch {
      // Ignore storage failures.
    }
  }, [data, search, category, employmentType, country, sort, page]);

  // Scroll position capture
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

  // Restore scroll position
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
    const { sortBy: apiSortBy, sortOrder: apiSortOrder } = parseSort(sort);
    load({
      page: 1,
      limit: PAGE_SIZE,
      search,
      category,
      employmentType,
      country,
      sortBy: apiSortBy,
      sortOrder: apiSortOrder,
      ...(vaultId ? { vaultId } : {}),
    });
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setEmploymentType('');
    setCountry('');
    setPage(1);
    if (searchParams.toString()) {
      prevSearchParamsRef.current = '';
      router.replace('/opportunities', { scroll: false });
    }
    const { sortBy: apiSortBy, sortOrder: apiSortOrder } = parseSort(sort);
    load({
      page: 1,
      limit: PAGE_SIZE,
      search: '',
      category: '',
      employmentType: '',
      country: '',
      sortBy: apiSortBy,
      sortOrder: apiSortOrder,
      ...(vaultId ? { vaultId } : {}),
    });
  };

  const displayItems = useMemo(() => {
    if (!data?.items) return [];
    const items = [...data.items];
    if (sort === 'exp') {
      return items.sort((a, b) => {
        const aExp = a.minExperience ?? 0;
        const bExp = b.minExperience ?? 0;
        return aExp - bExp;
      });
    }
    if (sort === 'expd') {
      return items.sort((a, b) => {
        const aExp = a.minExperience ?? 0;
        const bExp = b.minExperience ?? 0;
        return bExp - aExp;
      });
    }
    return items;
  }, [data?.items, sort]);

  const current = data?.meta.page ?? 1;
  const totalPages = data?.meta.totalPages ?? 1;
  const totalItems = data?.meta.totalItems ?? 0;
  const hasActiveFilters = Boolean(search || category || employmentType || country);
  const activeFilterCount = [search, category, employmentType, country].filter(Boolean).length;

  const handleMobileApply = (e: React.FormEvent) => {
    e.preventDefault();
    setMobileFilterOpen(false);
    handleSearch(e);
  };

  const handleMobileReset = () => {
    clearFilters();
    setMobileFilterOpen(false);
  };

  // Available unique countries in current dataset
  const availableCountries = useMemo(() => {
    const list = Object.keys(COUNTRY_FLAGS);
    return list.sort();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FEFDF9] dark:bg-[#06142A]">
        <div className="bg-gradient-to-b from-[#061B36] to-[#0A2645] py-16 px-4">
          <div className="mx-auto max-w-[1240px]">
            <div className="h-4 w-32 bg-white/20 rounded-md animate-pulse mb-3" />
            <div className="h-10 w-80 bg-white/20 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="mx-auto max-w-[1240px] px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-[#E9E5DC]/40 dark:bg-[#1E3557]/40 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FEFDF9] dark:bg-[#06142A] text-[#1A2236] dark:text-[#EAEFFB]">
      {/* ─────────────────────────────────────────────────────────────
          1. PAGE HEADER (MATCHING REDESIGN .pagehead)
          ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#061B36] via-[#092244] to-[#0A2645] pb-12 pt-14 text-white isolate sm:pb-16 sm:pt-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#15803D]/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-[#D6952F]/15 blur-3xl"
        />

        <div className="relative mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <div className="mb-3 flex items-center gap-1.5 text-xs text-[#AEB9D6]">
            <Link
              href="/"
              className="text-[#F0C27B] hover:text-white transition-colors"
            >
              Home
            </Link>
            <span className="text-[#8C9AC0]">/</span>
            <span className="text-white">
              {vaultId ? (vault?.name ?? 'Vault Opportunities') : 'Opportunities'}
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-sans text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {vaultId
              ? `Opportunities in ${vault?.name ?? 'this vault'}`
              : isSubscriber
              ? 'Subscriber Opportunity Access'
              : 'Search Opportunities'}
          </h1>

          {/* Subtitle */}
          <p className="mt-3 max-w-3xl text-sm sm:text-base leading-relaxed text-[#C9D3EA]">
            {vaultId
              ? 'Every opportunity below belongs to this Vault. Full company, experience, source, contact and application details are unlocked by your active subscription.'
              : isSubscriber
              ? 'You are viewing the live opportunity database with full subscriber access. Direct recruiter details and application links are unlocked for your active vaults.'
              : 'Filter live curated roles across every country. Search by Job ID or keyword to jump to a specific listing.'}
          </p>

          {/* Quick Corridor Filter Shortcuts */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F0C27B] mr-1">
              Priority Corridors:
            </span>
            <button
              type="button"
              onClick={() => {
                setCountry('United Kingdom');
                setSearch('London');
                setPage(1);
                const params = new URLSearchParams(window.location.search);
                params.set('country', 'United Kingdom');
                params.set('search', 'London');
                params.delete('page');
                const qs = params.toString();
                prevSearchParamsRef.current = qs;
                router.replace(`/opportunities${qs ? `?${qs}` : ''}`, { scroll: false });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                country === 'United Kingdom' && search === 'London'
                  ? 'bg-[#D6952F] text-[#061B36] border-[#D6952F] font-bold shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <span>🇬🇧 London Roles</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCountry('United Arab Emirates');
                setSearch('');
                setPage(1);
                const params = new URLSearchParams(window.location.search);
                params.set('country', 'United Arab Emirates');
                params.delete('search');
                params.delete('page');
                const qs = params.toString();
                prevSearchParamsRef.current = qs;
                router.replace(`/opportunities${qs ? `?${qs}` : ''}`, { scroll: false });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                country === 'United Arab Emirates'
                  ? 'bg-[#D6952F] text-[#061B36] border-[#D6952F] font-bold shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <span>🇦🇪 UAE &amp; Dubai</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCountry('Saudi Arabia');
                setSearch('');
                setPage(1);
                const params = new URLSearchParams(window.location.search);
                params.set('country', 'Saudi Arabia');
                params.delete('search');
                params.delete('page');
                const qs = params.toString();
                prevSearchParamsRef.current = qs;
                router.replace(`/opportunities${qs ? `?${qs}` : ''}`, { scroll: false });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                country === 'Saudi Arabia'
                  ? 'bg-[#D6952F] text-[#061B36] border-[#D6952F] font-bold shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <span>🇸🇦 Saudi &amp; GCC</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCountry('Singapore');
                setSearch('');
                setPage(1);
                const params = new URLSearchParams(window.location.search);
                params.set('country', 'Singapore');
                params.delete('search');
                params.delete('page');
                const qs = params.toString();
                prevSearchParamsRef.current = qs;
                router.replace(`/opportunities${qs ? `?${qs}` : ''}`, { scroll: false });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                country === 'Singapore'
                  ? 'bg-[#D6952F] text-[#061B36] border-[#D6952F] font-bold shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <span>🇸🇬 Singapore</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCountry('India');
                setSearch('');
                setPage(1);
                const params = new URLSearchParams(window.location.search);
                params.set('country', 'India');
                params.delete('search');
                params.delete('page');
                const qs = params.toString();
                prevSearchParamsRef.current = qs;
                router.replace(`/opportunities${qs ? `?${qs}` : ''}`, { scroll: false });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                country === 'India'
                  ? 'bg-[#D6952F] text-[#061B36] border-[#D6952F] font-bold shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <span>🇮🇳 India Hubs</span>
            </button>
            {(country || search) && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-[#F0C27B] hover:text-white underline ml-2 cursor-pointer"
              >
                Clear Filter
              </button>
            )}
          </div>

          {/* Non-Subscriber Informational Banner */}
          {!isSubscriber && !vaultId && (
            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 rounded-xl border border-[#F0C27B]/50 bg-[#FBF0DE] p-4 text-xs sm:text-sm text-[#061B36] shadow-sm dark:bg-[#10243E] dark:border-[#D6952F]/40 dark:text-[#F0C27B]">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#061B36] text-[10px] text-white dark:bg-[#F0C27B] dark:text-[#061B36]">
                  ℹ
                </span>
                <span>
                  No subscription is required to browse the preview. Review current opportunities first and subscribe only if the access adds genuine value to your search.
                </span>
              </div>
              <Link
                href="/plans"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#061B36] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#10243E] dark:bg-[#F0C27B] dark:text-[#061B36] transition-colors"
              >
                View Plans →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN LAYOUT (2-COLUMN GRID: FILTERS ON LEFT, OPP CARDS ON RIGHT)
          ───────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[270px_1fr] items-start">
          {/* ═════════════════════════════════════════════════════════
              LEFT COLUMN: DESKTOP FILTERS ASIDE (hidden on mobile < lg)
              ═════════════════════════════════════════════════════════ */}
          <aside className="hidden lg:block lg:sticky lg:top-24 rounded-2xl border border-[#E9E5DC] bg-white p-5 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
            <div className="flex items-center justify-between border-b border-[#E9E5DC] pb-3 mb-4 dark:border-[#1E3557]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#061B36] dark:text-white">
                Filter Roles
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-[#D6952F] hover:underline"
                >
                  Reset all
                </button>
              )}
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              {/* Keyword / Job ID */}
              <div>
                <label
                  htmlFor="opp-filter-search"
                  className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#5B6479] dark:text-slate-400"
                >
                  Keyword or Job ID
                </label>
                <input
                  id="opp-filter-search"
                  type="text"
                  placeholder="e.g. Finance or GE-AE-3100"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-[#061B36] placeholder-[#8C9AC0] focus:border-[#D6952F] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white sm:text-sm"
                />
              </div>

              {/* Country Selection */}
              <div>
                <label
                  htmlFor="opp-filter-country"
                  className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#5B6479] dark:text-slate-400"
                >
                  Country
                </label>
                <select
                  id="opp-filter-country"
                  value={country}
                  onChange={(e) => {
                    const newCountry = e.target.value;
                    setCountry(newCountry);
                    setPage(1);
                    const params = new URLSearchParams(window.location.search);
                    if (newCountry) {
                      params.set('country', newCountry);
                    } else {
                      params.delete('country');
                    }
                    params.delete('page');
                    const qs = params.toString();
                    prevSearchParamsRef.current = qs;
                    router.replace(`/opportunities${qs ? `?${qs}` : ''}`, { scroll: false });
                  }}
                  className="w-full rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-[#061B36] focus:border-[#D6952F] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white sm:text-sm"
                >
                  <option value="">All countries</option>
                  {availableCountries.map((c) => (
                    <option key={c} value={c}>
                      {COUNTRY_FLAGS[c] || '🌐'} {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Industry / Category */}
              <div>
                <label
                  htmlFor="opp-filter-category"
                  className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#5B6479] dark:text-slate-400"
                >
                  Industry / Sector
                </label>
                <select
                  id="opp-filter-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-[#061B36] focus:border-[#D6952F] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white sm:text-sm"
                >
                  <option value="">All industries</option>
                  {OPPORTUNITY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {titleOption(c)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Work Model / Employment Type */}
              <div>
                <label
                  htmlFor="opp-filter-type"
                  className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#5B6479] dark:text-slate-400"
                >
                  Work Model
                </label>
                <select
                  id="opp-filter-type"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-[#061B36] focus:border-[#D6952F] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white sm:text-sm"
                >
                  <option value="">Any model</option>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {titleOption(t)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#061B36] py-2.5 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-[#10243E] dark:bg-[#1D3B66] dark:hover:bg-[#254A7F] transition-colors"
                >
                  Apply Filters
                </button>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="w-full rounded-xl border border-[#E9E5DC] bg-white py-2 text-xs font-semibold text-[#5B6479] hover:bg-slate-50 dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-slate-300 dark:hover:bg-[#152E50] transition-colors"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            </form>
          </aside>

          {/* ═════════════════════════════════════════════════════════
              MOBILE FILTER SIDEBAR DRAWER (< lg)
              ═════════════════════════════════════════════════════════ */}
          {mobileFilterOpen && (
            <div
              className="fixed inset-0 z-50 lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Filter opportunities"
            >
              {/* Backdrop overlay */}
              <div
                className="fixed inset-0 bg-[#061B36]/60 backdrop-blur-xs transition-opacity"
                onClick={() => setMobileFilterOpen(false)}
                aria-hidden="true"
              />

              {/* Slide-over sidebar container */}
              <div className="fixed inset-y-0 left-0 flex max-w-full pr-10">
                <div className="relative w-screen max-w-xs sm:max-w-sm bg-white dark:bg-[#0A1E38] shadow-2xl flex flex-col border-r border-[#E9E5DC] dark:border-[#1E3557]">
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between border-b border-[#E9E5DC] px-5 py-4 dark:border-[#1E3557]">
                    <div className="flex items-center gap-2">
                      <SlidersIcon className="h-4 w-4 text-[#D6952F]" />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-[#061B36] dark:text-white">
                        Filter Roles
                      </h2>
                      {activeFilterCount > 0 && (
                        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#D6952F] px-1.5 text-[10px] font-bold text-white">
                          {activeFilterCount}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileFilterOpen(false)}
                      className="rounded-lg p-1.5 text-[#5B6479] hover:bg-slate-100 hover:text-[#061B36] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                      aria-label="Close filter drawer"
                    >
                      <CloseIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Drawer Form Fields */}
                  <form
                    onSubmit={handleMobileApply}
                    className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
                  >
                    {/* Keyword / Job ID */}
                    <div>
                      <label
                        htmlFor="m-filter-search"
                        className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#5B6479] dark:text-slate-400"
                      >
                        Keyword or Job ID
                      </label>
                      <input
                        id="m-filter-search"
                        type="text"
                        placeholder="e.g. Finance or GE-AE-3100"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-[#061B36] placeholder-[#8C9AC0] focus:border-[#D6952F] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white sm:text-sm"
                      />
                    </div>

                    {/* Country Selection */}
                    <div>
                      <label
                        htmlFor="m-filter-country"
                        className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#5B6479] dark:text-slate-400"
                      >
                        Country
                      </label>
                      <select
                        id="m-filter-country"
                        value={country}
                        onChange={(e) => {
                          const newCountry = e.target.value;
                          setCountry(newCountry);
                          setPage(1);
                          const params = new URLSearchParams(window.location.search);
                          if (newCountry) {
                            params.set('country', newCountry);
                          } else {
                            params.delete('country');
                          }
                          params.delete('page');
                          const qs = params.toString();
                          prevSearchParamsRef.current = qs;
                          router.replace(`/opportunities${qs ? `?${qs}` : ''}`, { scroll: false });
                        }}
                        className="w-full rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-[#061B36] focus:border-[#D6952F] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white sm:text-sm"
                      >
                        <option value="">All countries</option>
                        {availableCountries.map((c) => (
                          <option key={c} value={c}>
                            {COUNTRY_FLAGS[c] || '🌐'} {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Industry / Category */}
                    <div>
                      <label
                        htmlFor="m-filter-category"
                        className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#5B6479] dark:text-slate-400"
                      >
                        Industry / Sector
                      </label>
                      <select
                        id="m-filter-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-[#061B36] focus:border-[#D6952F] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white sm:text-sm"
                      >
                        <option value="">All industries</option>
                        {OPPORTUNITY_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {titleOption(c)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Work Model / Employment Type */}
                    <div>
                      <label
                        htmlFor="m-filter-type"
                        className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#5B6479] dark:text-slate-400"
                      >
                        Work Model
                      </label>
                      <select
                        id="m-filter-type"
                        value={employmentType}
                        onChange={(e) => setEmploymentType(e.target.value)}
                        className="w-full rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-[#061B36] focus:border-[#D6952F] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white sm:text-sm"
                      >
                        <option value="">Any model</option>
                        {EMPLOYMENT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {titleOption(t)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 space-y-2 border-t border-[#E9E5DC] dark:border-[#1E3557]">
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-[#061B36] py-3 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-[#10243E] dark:bg-[#1D3B66] dark:hover:bg-[#254A7F] transition-colors"
                      >
                        Apply Filters
                      </button>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleMobileReset}
                          className="w-full rounded-xl border border-[#E9E5DC] bg-white py-2 text-xs font-semibold text-[#5B6479] hover:bg-slate-50 dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-slate-300 dark:hover:bg-[#152E50] transition-colors"
                        >
                          Reset filters
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════
              RIGHT COLUMN: RESULTS LIST / CARDS (.cols-opp)
              ═════════════════════════════════════════════════════════ */}
          <main className="min-w-0">
            {/* Results Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9E5DC] pb-3 mb-6 dark:border-[#1E3557]">
              <div className="flex items-center gap-2.5">
                {/* Mobile Filter Button (< lg) */}
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  aria-label="Open filter sidebar"
                  className="inline-flex lg:hidden items-center gap-2 rounded-xl border border-[#E9E5DC] bg-white px-3 py-1.5 text-xs font-bold text-[#061B36] shadow-2xs hover:border-[#D6952F] hover:text-[#D6952F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6952F] dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-white dark:hover:border-[#D6952F] transition-colors"
                >
                  <SlidersIcon className="h-4 w-4 text-[#D6952F]" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#D6952F] px-1 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <div>
                  <span className="text-sm font-bold text-[#061B36] dark:text-white">
                    {!loading && (
                      <>
                        {totalItems} {totalItems === 1 ? 'opportunity' : 'opportunities'}
                      </>
                    )}
                  </span>
                  {country && (
                    <span className="ml-2 text-xs text-[#5B6479] dark:text-slate-400">
                      in <strong>{country}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <ViewToggle view={view} onChange={handleViewChange} />
                <select
                  id="sSort"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as SortOption);
                    setPage(1);
                  }}
                  aria-label="Sort opportunities"
                  className="rounded-full border border-[#E9E5DC] bg-white px-4 py-1.5 text-xs font-semibold text-[#061B36] shadow-2xs hover:border-[#D6952F] focus:border-[#D6952F] focus:outline-none dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-white cursor-pointer"
                >
                  <option value="new">Newest first</option>
                  <option value="exp">Experience: low to high</option>
                  <option value="expd">Experience: high to low</option>
                </select>
              </div>
            </div>

            {/* Mobile Active Filter Chips */}
            {hasActiveFilters && (
              <div className="flex lg:hidden flex-wrap items-center gap-1.5 mb-5">
                {search && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF8F5] border border-[#E9E5DC] px-2.5 py-1 text-[11px] font-medium text-[#061B36] dark:bg-[#0E2340] dark:border-[#1E3557] dark:text-slate-200">
                    Keyword: &ldquo;{search}&rdquo;
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        handleSearch();
                      }}
                      aria-label="Remove search filter"
                      className="text-[#8C9AC0] hover:text-[#061B36] dark:hover:text-white"
                    >
                      <CloseIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {country && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF8F5] border border-[#E9E5DC] px-2.5 py-1 text-[11px] font-medium text-[#061B36] dark:bg-[#0E2340] dark:border-[#1E3557] dark:text-slate-200">
                    {COUNTRY_FLAGS[country] || '🌐'} {country}
                    <button
                      type="button"
                      onClick={() => {
                        setCountry('');
                        setPage(1);
                        const params = new URLSearchParams(window.location.search);
                        params.delete('country');
                        params.delete('page');
                        const qs = params.toString();
                        prevSearchParamsRef.current = qs;
                        router.replace(`/opportunities${qs ? `?${qs}` : ''}`, { scroll: false });
                      }}
                      aria-label="Remove country filter"
                      className="text-[#8C9AC0] hover:text-[#061B36] dark:hover:text-white"
                    >
                      <CloseIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {category && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF8F5] border border-[#E9E5DC] px-2.5 py-1 text-[11px] font-medium text-[#061B36] dark:bg-[#0E2340] dark:border-[#1E3557] dark:text-slate-200">
                    {titleOption(category)}
                    <button
                      type="button"
                      onClick={() => setCategory('')}
                      aria-label="Remove category filter"
                      className="text-[#8C9AC0] hover:text-[#061B36] dark:hover:text-white"
                    >
                      <CloseIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {employmentType && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF8F5] border border-[#E9E5DC] px-2.5 py-1 text-[11px] font-medium text-[#061B36] dark:bg-[#0E2340] dark:border-[#1E3557] dark:text-slate-200">
                    {titleOption(employmentType)}
                    <button
                      type="button"
                      onClick={() => setEmploymentType('')}
                      aria-label="Remove employment type filter"
                      className="text-[#8C9AC0] hover:text-[#061B36] dark:hover:text-white"
                    >
                      <CloseIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[11px] font-bold text-[#D6952F] hover:underline ml-1"
                >
                  Reset all
                </button>
              </div>
            )}

            {/* Content States */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-56 rounded-2xl border border-[#E9E5DC] bg-white p-5 animate-pulse dark:border-[#1E3557] dark:bg-[#0E2340]"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-[#E9E5DC] bg-white p-8 dark:border-[#1E3557] dark:bg-[#0E2340]">
                <ErrorState message={error} onRetry={() => handleSearch()} />
              </div>
            ) : !data || data.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E9E5DC] bg-white p-10 text-center dark:border-[#1E3557] dark:bg-[#0E2340]">
                <EmptyState
                  title="No live opportunities match these filters"
                  description="Try widening the search keywords, changing the country selection, or clearing active filters."
                  action={
                    <Button variant="outline" onClick={clearFilters}>
                      Clear all filters
                    </Button>
                  }
                />
              </div>
            ) : (
              <>
                {/* ─── GRID VIEW ────────────────────────────────────── */}
                {view === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {displayItems.map((o) => {
                      const canReveal = canRevealCompanyExperience(o, hasVaultAccess);
                      const isFull = o.isFullAccess;
                      const email = extractEmail(o.applicationContact, o.applicationUrl);
                      const flag = (o.country && COUNTRY_FLAGS[o.country]) || '🌐';

                      return (
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
                          className={`group relative flex flex-col justify-between rounded-2xl border border-[#E9E5DC] border-l-4 ${
                            isFull
                              ? 'border-l-[#22C55E] dark:border-l-[#22C55E]'
                              : 'border-l-[#D6952F] dark:border-l-[#F0C27B]'
                          } bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-[#1E3557] dark:bg-[#0E2340] cursor-pointer`}
                        >
                          <div>
                            {/* Top row: Location chip + Job ID */}
                            <div className="flex items-start justify-between gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF8F5] px-2.5 py-1 text-[11px] font-semibold text-[#061B36] border border-[#E9E5DC] dark:bg-[#152943] dark:border-[#1E3557] dark:text-slate-200">
                                <span>{flag}</span>
                                <span>
                                  {o.location ? `${o.location}, ` : ''}
                                  {o.country}
                                </span>
                              </span>
                              <span className="font-mono text-[11px] font-bold text-[#8C9AC0]">
                                {formatJobId(o.id)}
                              </span>
                            </div>

                            {/* Job Title & Live indicator */}
                            <div className="mt-3 flex items-start justify-between gap-3">
                              <h3 className="font-sans text-[15px] sm:text-[16px] font-bold leading-snug text-[#061B36] group-hover:text-[#D6952F] transition-colors dark:text-white">
                                {o.title}
                              </h3>
                              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                                Live
                              </span>
                            </div>

                            {/* Metadata list */}
                            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#5B6479] dark:text-slate-400">
                              {o.industry && (
                                <span className="inline-flex items-center gap-1">
                                  <span>💼</span>
                                  <span>{o.industry}</span>
                                </span>
                              )}
                              {hasExperience(o.experienceText, o.minExperience, o.maxExperience) && (
                                <span className="inline-flex items-center gap-1">
                                  <span>⏳</span>
                                  <span>
                                    {displayExperience(o.experienceText, o.minExperience, o.maxExperience)}
                                  </span>
                                </span>
                              )}
                              {o.employmentType && (
                                <span className="inline-flex items-center gap-1">
                                  <span>🏢</span>
                                  <span>{titleOption(o.employmentType)}</span>
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-[#8C9AC0]">
                                <span>🗓</span>
                                <span>{formatAgo(o.publishedDate || o.createdAt)}</span>
                              </span>
                            </div>

                            {/* Compensation / Salary */}
                            <div className="mt-3">
                              {isMeaningful(o.salary) ? (
                                <p className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-emerald-400">
                                  {o.salary}
                                </p>
                              ) : (
                                <p className="text-xs text-[#8C9AC0] italic">
                                  Compensation not disclosed
                                </p>
                              )}
                            </div>

                            {/* Vault tags */}
                            {o.vaults && o.vaults.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1">
                                {o.vaults.map((v) => (
                                  <span
                                    key={v.id}
                                    className="rounded bg-[#061B36] px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-[#1D3B66]"
                                  >
                                    {v.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Bottom Action / Lock Row */}
                          <div className="mt-4 pt-3 border-t border-[#E9E5DC] dark:border-[#1E3557] flex items-center justify-between gap-2 text-xs">
                            {isFull ? (
                              <>
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  ✓ Unlocked Subscriber Access
                                </span>
                                {email ? (
                                  <a
                                    href={buildApplyMailto(email, {
                                      title: o.title,
                                      company: canReveal ? o.company : undefined,
                                    })}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 rounded-lg bg-[#22C55E] px-3 py-1 font-bold text-white hover:bg-emerald-600 transition-colors"
                                  >
                                    Apply →
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-[#8C9AC0]">
                                    Direct Pathway
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="text-[11px] text-[#5B6479] dark:text-slate-400 flex items-center gap-1 truncate">
                                  <span>🔒</span>
                                  <span className="truncate">
                                    {o.applicationContact ? 'Direct hiring contact' : 'Application pathway'} available
                                  </span>
                                </span>
                                <Link
                                  href="/plans"
                                  onClick={(e) => e.stopPropagation()}
                                  className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-[#F0C27B] px-3 py-1 text-xs font-bold text-[#061B36] hover:bg-[#D6952F] transition-colors"
                                >
                                  <LockIcon className="h-3 w-3" />
                                  Unlock
                                </Link>
                              </>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  /* ─── LIST VIEW ────────────────────────────────────── */
                  <div className="space-y-4">
                    {displayItems.map((o) => {
                      const canReveal = canRevealCompanyExperience(o, hasVaultAccess);
                      const isFull = o.isFullAccess;
                      const email = extractEmail(o.applicationContact, o.applicationUrl);
                      const flag = (o.country && COUNTRY_FLAGS[o.country]) || '🌐';

                      return (
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
                          className={`group relative flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-[#E9E5DC] border-l-4 ${
                            isFull
                              ? 'border-l-[#22C55E] dark:border-l-[#22C55E]'
                              : 'border-l-[#D6952F] dark:border-l-[#F0C27B]'
                          } bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-[#1E3557] dark:bg-[#0E2340] cursor-pointer`}
                        >
                          <div className="flex-1 min-w-0">
                            {/* Top row */}
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF8F5] px-2.5 py-0.5 text-[11px] font-semibold text-[#061B36] border border-[#E9E5DC] dark:bg-[#152943] dark:border-[#1E3557] dark:text-slate-200">
                                <span>{flag}</span>
                                <span>{o.country}</span>
                              </span>
                              <span className="font-mono text-[11px] font-bold text-[#8C9AC0]">
                                {formatJobId(o.id)}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                                Live
                              </span>
                            </div>

                            {/* Job Title */}
                            <h3 className="mt-2 font-sans text-[16px] font-bold text-[#061B36] group-hover:text-[#D6952F] transition-colors dark:text-white leading-snug">
                              {o.title}
                            </h3>

                            {/* Meta */}
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#5B6479] dark:text-slate-400">
                              {o.industry && <span>💼 {o.industry}</span>}
                              {hasExperience(o.experienceText, o.minExperience, o.maxExperience) && (
                                <span>
                                  ⏳ {displayExperience(o.experienceText, o.minExperience, o.maxExperience)}
                                </span>
                              )}
                              {o.employmentType && <span>🏢 {titleOption(o.employmentType)}</span>}
                              <span className="text-[#8C9AC0]">
                                🗓 {formatAgo(o.publishedDate || o.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Right Side: Compensation & Unlock CTA */}
                          <div className="flex flex-row md:flex-col items-start md:items-end justify-between md:justify-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-[#E9E5DC] dark:border-[#1E3557]">
                            <div className="text-left md:text-right">
                              {isMeaningful(o.salary) ? (
                                <p className="text-sm font-bold text-[#061B36] dark:text-emerald-400">
                                  {o.salary}
                                </p>
                              ) : (
                                <p className="text-xs text-[#8C9AC0] italic">
                                  Compensation not disclosed
                                </p>
                              )}
                            </div>

                            <div>
                              {isFull ? (
                                email ? (
                                  <a
                                    href={buildApplyMailto(email, {
                                      title: o.title,
                                      company: canReveal ? o.company : undefined,
                                    })}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 rounded-lg bg-[#22C55E] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 transition-colors"
                                  >
                                    Apply →
                                  </a>
                                ) : (
                                  <span className="text-xs font-semibold text-emerald-600">
                                    Unlocked
                                  </span>
                                )
                              ) : (
                                <Link
                                  href="/plans"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#F0C27B] px-3.5 py-1.5 text-xs font-bold text-[#061B36] hover:bg-[#D6952F] transition-colors"
                                >
                                  <LockIcon className="h-3.5 w-3.5" />
                                  Unlock
                                </Link>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <Pagination
                      currentPage={current}
                      totalPages={totalPages}
                      onPageChange={(p) => {
                        setPage(p);
                        window.scrollTo({ top: 200, behavior: 'smooth' });
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. NEXT STEP / CTA SECTION (.banner)
          ───────────────────────────────────────────────────────────── */}
      <section className="border-t border-[#E9E5DC] bg-[#FAF8F5] py-14 dark:border-[#1E3557] dark:bg-[#07172B]">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[#F0C27B]/60 bg-gradient-to-br from-[#FBF0DE] to-[#FFF9F0] p-7 sm:p-10 shadow-sm dark:from-[#0E2340] dark:to-[#081B33] dark:border-[#D6952F]/30">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#D6952F] dark:text-[#F0C27B]">
                  Next Step
                </span>
                <h2 className="mt-1 font-sans text-2xl sm:text-3xl font-extrabold text-[#061B36] dark:text-white">
                  {vaultId
                    ? 'Everything here belongs to this Opportunity Vault.'
                    : isSubscriber
                    ? 'You have active subscriber access.'
                    : 'Found the opportunities relevant to your search?'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm sm:text-base text-[#5B6479] dark:text-slate-300 leading-relaxed">
                  {vaultId
                    ? `Explore the complete Opportunity Vaults and Plans to manage access to ${vault?.name ?? 'this vault'}.`
                    : isSubscriber
                    ? 'You can view full hiring contacts, recruiter emails, and application routes across all your active vaults.'
                    : 'Subscribe to an Opportunity Vault to unlock direct hiring contacts, recruiter emails, and application routes. If the preview does not fit your search, there is no need to subscribe.'}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-3">
                <Link
                  href={vaultId ? `/vaults/${vaultId}` : '/plans'}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#061B36] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#10243E] dark:bg-[#F0C27B] dark:text-[#061B36] dark:hover:bg-[#D6952F] transition-all hover:-translate-y-0.5"
                >
                  {vaultId ? `Manage ${vault?.name ?? 'Vault'} access` : 'View Vaults & Plans →'}
                </Link>
                <Link
                  href="/vaults"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E9E5DC] bg-white px-5 py-3 text-sm font-bold text-[#061B36] hover:bg-slate-50 dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-white dark:hover:bg-[#152E50] transition-colors"
                >
                  All Opportunity Vaults
                </Link>
              </div>
            </div>

            {!isSubscriber && !vaultId && (
              <div className="mt-8 border-t border-[#F0C27B]/30 pt-4 text-xs text-[#8C9AC0] dark:text-slate-400">
                <p>
                  Explore first. Decide for yourself. Subscribe only if the opportunity information adds genuine value to your career search.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function OpportunityPageWrapper() {
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  return <OpportunityPageContent key={searchKey} />;
}

export default function FreePreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FEFDF9] dark:bg-[#06142A]">
          <div className="bg-gradient-to-b from-[#061B36] to-[#0A2645] py-16 px-4">
            <div className="mx-auto max-w-[1240px]">
              <div className="h-4 w-32 bg-white/20 rounded-md animate-pulse mb-3" />
              <div className="h-10 w-80 bg-white/20 rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="mx-auto max-w-[1240px] px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 rounded-2xl bg-[#E9E5DC]/40 dark:bg-[#1E3557]/40 animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <OpportunityPageWrapper />
    </Suspense>
  );
}
