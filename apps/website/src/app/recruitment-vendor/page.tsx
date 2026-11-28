'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  ErrorState,
  GridIcon,
  ListIcon,
  LockIcon,
  Pagination,
  Skeleton,
  useToast,
} from '@/components/ui';
import {
  BarsIcon,
  BriefcaseIcon,
  IdIcon,
  LayersIcon,
  PinIcon,
  SearchIcon,
} from '@/components/cards';
import Eyebrow from '@/components/marketing/Eyebrow';
import ScrollReveal from '@/components/marketing/ScrollReveal';
import VendorHeroCarousel from '@/components/marketing/VendorHeroCarousel';
import {
  VendorServicesSection,
  VendorProcessSection,
  VendorComparisonSection,
  VendorEnquirySection,
} from '@/components/marketing/VendorSections';
import { formatDate, formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/lib/auth';
import { fetchRvaOverview, fetchRvaOpportunities, purchaseRvaPlan } from '@/lib/services';
import { RvaFaq, RvaOpportunity, RvaOverview, RvaPlan } from '@/lib/types';

const PREVIEW_LIMIT = 6;
const VIEW_KEY = 'rva-preview-view';

/** Category blurb keyed by the canonical RVA category value (labels come from the API). */
const CATEGORY_BLURBS: Record<string, string> = {
  VENDOR_ENABLEMENT: 'Vendor registration, empanelment and partner onboarding opportunities.',
  RFP_EOI_RFQ: 'Requests for proposal, expressions of interest and tender opportunities.',
  STAFFING_RPO: 'Staffing, RPO and contingent workforce partnership requirements.',
  EXECUTIVE_SEARCH: 'Executive search, leadership and C-suite mandates.',
  OTHER: 'Other recruitment and talent partnership opportunities.',
};

/** Primary categories shown in the "key areas" grid (OTHER is excluded by design). */
const PRIMARY_CATEGORIES = ['VENDOR_ENABLEMENT', 'RFP_EOI_RFQ', 'STAFFING_RPO', 'EXECUTIVE_SEARCH'];

/** The navy feature strip beneath the hero. */
const HERO_FEATURES: { label: string; paths: string[] }[] = [
  {
    label: 'Direct Mandates',
    paths: [
      'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-1.309 0-2.584-.104-3.827-.304a2.18 2.18 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z',
    ],
  },
  {
    label: 'Verified Companies',
    paths: [
      'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
    ],
  },
  {
    label: 'Global Corporates',
    paths: [
      'M12 3.75a8.25 8.25 0 100 16.5 8.25 8.25 0 000-16.5Z',
      'M3.75 12h16.5M12 3.75c2.4 2.3 3.6 5 3.6 8.25s-1.2 5.95-3.6 8.25c-2.4-2.3-3.6-5-3.6-8.25s1.2-5.95 3.6-8.25Z',
    ],
  },
  {
    label: 'Regularly Updated',
    paths: ['M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4'],
  },
];

function scrollToId(id: string) {
  if (typeof window === 'undefined') return;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.4}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function ArrowRight({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function ChevronIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function CategoryIcon({ value, className = 'h-6 w-6' }: { value: string; className?: string }) {
  const common = {
    className,
    fill: 'none',
    viewBox: '0 0 24 24',
    strokeWidth: 1.7,
    stroke: 'currentColor',
    'aria-hidden': true,
  } as const;
  switch (value) {
    case 'RFP_EOI_RFQ':
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 9v6m-3-3h6M8.25 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      );
    case 'STAFFING_RPO':
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
      );
    case 'EXECUTIVE_SEARCH':
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.519-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-1.309 0-2.584-.104-3.827-.304a2.18 2.18 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z"
          />
        </svg>
      );
  }
}

export default function RecruitmentVendorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [overview, setOverview] = useState<RvaOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buyingPlanId, setBuyingPlanId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [opportunities, setOpportunities] = useState<RvaOpportunity[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingPage, setLoadingPage] = useState(false);

  const loadOverview = useCallback(() => {
    setLoading(true);
    setError('');
    fetchRvaOverview(PREVIEW_LIMIT)
      .then(setOverview)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const goToPage = useCallback(
    async (newPage: number) => {
      if (newPage < 1 || newPage > totalPages || loadingPage) return;
      setLoadingPage(true);
      try {
        const res = await fetchRvaOpportunities({
          page: newPage,
          limit: PREVIEW_LIMIT,
          search: searchQuery || undefined,
          category: selectedCategory || undefined,
        });
        setOpportunities(res.items);
        setTotalPages(res.meta.totalPages);
        setPage(newPage);
      } catch (e) {
        showToast(getErrorMessage(e), 'error');
      } finally {
        setLoadingPage(false);
      }
    },
    [totalPages, loadingPage, searchQuery, selectedCategory, showToast],
  );

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Initialize opportunities from overview preview
  useEffect(() => {
    if (overview?.previewOpportunities) {
      setOpportunities(overview.previewOpportunities);
      setTotalPages(overview.previewMeta.totalPages);
      setPage(1);
    }
  }, [overview]);

  // Refetch opportunities when search query or selectedCategory changes
  useEffect(() => {
    if (searchQuery !== undefined) {
      setLoadingPage(true);
      fetchRvaOpportunities({
        page: 1,
        limit: PREVIEW_LIMIT,
        search: searchQuery || undefined,
        category: selectedCategory || undefined,
      })
        .then((res) => {
          setOpportunities(res.items);
          setTotalPages(res.meta.totalPages);
          setPage(1);
        })
        .catch((e) => showToast(getErrorMessage(e), 'error'))
        .finally(() => setLoadingPage(false));
    }
  }, [searchQuery, selectedCategory, showToast]);

  // Restore the user's preferred layout (defaulting to list on small screens).
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

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  const handleCategoryClick = (categoryValue: string) => {
    if (selectedCategory === categoryValue) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryValue);
      scrollToId('free-preview');
    }
    setPage(1);
  };

  const handleChoosePlan = async (plan: RvaPlan) => {
    if (!user) {
      router.push('/register');
      return;
    }
    if (buyingPlanId) return;
    setBuyingPlanId(plan.id);
    try {
      const started = await purchaseRvaPlan(plan.id, undefined, true);
      router.push(`/recruitment-vendor/checkout/${started.paymentId}`);
    } catch (e) {
      setBuyingPlanId(null);
      showToast(getErrorMessage(e), 'error');
    }
  };

  const categories = (overview?.categories ?? []).filter((c) =>
    PRIMARY_CATEGORIES.includes(c.value),
  );
  const plans = (overview?.plans ?? []).filter(
    (plan): plan is RvaPlan & { autoPayAmount: number } => plan.autoPayAmount != null,
  );
  const faqs = overview?.faqs ?? [];
  const publishedCount = overview?.publishedOpportunityCount ?? 0;
  const hasSearch = searchQuery.trim().length > 0;
  const hasActiveFilter = hasSearch || selectedCategory !== null;

  const filteredOpportunities = useMemo(() => {
    let list = opportunities;
    if (selectedCategory) {
      list = list.filter((o) => o.category === selectedCategory);
    }
    const terms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return list;
    return list.filter((o) => {
      const haystack = [
        o.title,
        o.role,
        o.company,
        o.organization,
        o.location,
        o.geography,
        o.country,
        o.categoryLabel,
        o.sector,
        o.experienceText,
        o.jobId,
        o.referenceId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [opportunities, searchQuery, selectedCategory]);

  return (
    <div className="overflow-x-clip">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. HERO CAROUSEL                                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <VendorHeroCarousel
        publishedCount={publishedCount}
        loading={loading}
        scrollToId={scrollToId}
      />

      {/* Bottom feature strip — navy bar with gold outline icons. */}
      <div className="relative z-10 border-t border-[#C8943E]/20 bg-[#061B36]">
        <div className="mx-auto grid w-full max-w-[1320px] grid-cols-2 divide-x divide-white/10 px-2 py-3 sm:grid-cols-4 sm:px-6 sm:py-5 lg:px-8">
          {HERO_FEATURES.map((feature, idx) => (
            <ScrollReveal
              key={feature.label}
              delay={idx * 80}
              className="flex flex-col items-center gap-1.5 px-1.5 text-center sm:gap-2"
            >
              <svg
                className="h-6 w-6 text-[#C8943E]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.7}
                stroke="currentColor"
                aria-hidden="true"
              >
                {feature.paths.map((d) => (
                  <path key={d} strokeLinecap="round" strokeLinejoin="round" d={d} />
                ))}
              </svg>
              <span className="text-[11px] font-medium leading-tight text-white/90 sm:text-sm">
                {feature.label}
              </span>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 2. DEDICATED VENDOR SERVICES & INTRODUCTION                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <VendorServicesSection />

      {error && (
        <section className="border-t border-line bg-surface-muted">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-line bg-surface dark:bg-surface-elevated">
              <ErrorState message={error} onRetry={loadOverview} />
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 2. CATEGORIES                                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {!error && (
        <section id="categories" className="section-glow relative bg-surface-muted">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <ScrollReveal className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
              <Eyebrow>WHAT YOU&apos;LL FIND</Eyebrow>
              <h2 className="mt-3 font-serif-heading text-3xl font-bold leading-tight text-content sm:text-4xl">
                Opportunities Across Key Areas
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-content-muted">
                The vault is organised by the types of partnerships companies are looking to build.
              </p>
            </ScrollReveal>

            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {categories.map((category, idx) => {
                  const isSelected = selectedCategory === category.value;
                  return (
                    <ScrollReveal key={category.value} delay={idx * 80} className="h-full">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleCategoryClick(category.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleCategoryClick(category.value);
                          }
                        }}
                        className={`group relative flex h-full flex-col rounded-2xl p-5 text-left transition-all duration-300 cursor-pointer select-none ${
                          isSelected
                            ? 'border-2 border-[#D6952F] bg-gradient-to-b from-[#D6952F]/15 via-surface to-surface dark:from-[#D6952F]/20 dark:via-surface-elevated dark:to-surface-elevated shadow-[0_12px_28px_-6px_rgba(214,149,47,0.35)] -translate-y-1.5 ring-2 ring-[#D6952F]/40'
                            : 'card-static border border-line hover:-translate-y-1 hover:border-[#D6952F]/60 hover:shadow-card-hover'
                        }`}
                      >
                        {/* Top icon & active badge indicator */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-105 ${
                              isSelected
                                ? 'bg-[#D6952F] text-[#061B36] shadow-md ring-2 ring-[#D6952F]'
                                : 'bg-gradient-to-br from-[#061B36] to-brand-600 text-[#E3B968] ring-1 ring-inset ring-[#C8943E]/30'
                            }`}
                          >
                            <CategoryIcon value={category.value} className="h-6 w-6" />
                          </span>

                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#D6952F] px-2.5 py-0.5 text-[11px] font-bold text-[#061B36] shadow-sm">
                              <span>Active</span>
                              <span>✕</span>
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-brand-600 dark:text-[#E3B968] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <span>Filter</span>
                              <span>→</span>
                            </span>
                          )}
                        </div>

                        <h3 className="mt-4 text-base font-bold leading-snug text-content group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors">
                          {category.label}
                        </h3>

                        <p className="mt-2 flex-1 text-sm leading-relaxed text-content-muted">
                          {CATEGORY_BLURBS[category.value] ??
                            'Recruitment partnership opportunities.'}
                        </p>

                        <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#C8943E]">
                            {category.count}{' '}
                            {category.count === 1 ? 'opportunity' : 'opportunities'}
                          </p>
                          <span className="text-xs font-semibold text-brand-600 dark:text-[#E3B968] group-hover:underline">
                            {isSelected ? 'Click to clear ✕' : 'Filter preview →'}
                          </span>
                        </div>
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 3. RECENT OPPORTUNITIES (FREE PREVIEW)                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {!error && (
        <section
          id="free-preview"
          className="section-glow-navy relative border-t border-line bg-surface scroll-mt-20"
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <ScrollReveal className="mb-8 max-w-2xl">
              <Eyebrow>SEE BEFORE YOU SUBSCRIBE</Eyebrow>
              <h2 className="mt-3 font-serif-heading text-2xl font-bold tracking-tight text-content sm:text-3xl">
                Explore Recent Opportunities
              </h2>
              <p className="mt-2 text-sm text-content-muted sm:text-base">
                A preview of recently published opportunities. Commercial and contact details are
                masked until you subscribe.
              </p>
            </ScrollReveal>

            {/* Selected category filter pill bar */}
            {selectedCategory && (
              <div className="mb-6 flex flex-wrap items-center gap-2.5 rounded-2xl border border-[#D6952F]/40 bg-[#D6952F]/10 px-4 py-3 text-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-[#D6952F]">
                  Active Filter:
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1 text-xs font-bold text-content shadow-sm border border-line">
                  <span>
                    {categories.find((c) => c.value === selectedCategory)?.label ||
                      selectedCategory}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="ml-1 text-content-muted hover:text-red-500 font-bold transition-colors"
                    title="Remove filter"
                  >
                    ✕
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline sm:ml-auto"
                >
                  Show All Categories (Reset Filter)
                </button>
              </div>
            )}

            {/* Search + layout toggle */}
            {!loading && (opportunities.length > 0 || hasActiveFilter) && (
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="w-full max-w-2xl md:max-w-3xl">
                  <form onSubmit={handleSearch}>
                    <div className="flex flex-col gap-2">
                      <div className="relative flex-1">
                        <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-content-muted/50" />
                        <input
                          id="rva-preview-search"
                          type="text"
                          placeholder="Search by role, company, location, salary, experience..."
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="w-full rounded-xl border border-line bg-surface px-5 py-3.5 pl-12 pr-10 text-base text-content placeholder:text-hint shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface-elevated"
                          aria-label="Search recruitment vendor opportunities by keywords"
                        />
                        {searchInput && (
                          <button
                            type="button"
                            onClick={clearSearch}
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
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                      <p className="text-center text-xs text-content-muted">
                        You can search anything — try multiple keywords like opportunity type,
                        organisation, industry, geography, or Job ID
                      </p>
                      <button
                        type="submit"
                        className="mx-auto inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={loadingPage}
                      >
                        <SearchIcon className="h-5 w-5" />
                        Search
                      </button>
                    </div>
                  </form>
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
                    title="List view"
                    className={`inline-flex h-9 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                      view === 'list'
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-content-muted hover:bg-surface-muted hover:text-content'
                    }`}
                  >
                    <ListIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-56" />
                ))}
              </div>
            ) : hasActiveFilter && filteredOpportunities.length === 0 ? (
              <div className="rounded-2xl border border-line bg-surface-muted px-6 py-10 text-center">
                <p className="text-sm text-content-muted">
                  No opportunities match your filter.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      clearSearch();
                      setSelectedCategory(null);
                    }}
                    className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 underline"
                  >
                    Reset all filters
                  </button>
                </p>
              </div>
            ) : opportunities.length === 0 ? (
              <div className="rounded-2xl border border-line bg-surface-muted px-6 py-10 text-center">
                <p className="text-sm text-content-muted">
                  New opportunities will appear here as they are published.
                </p>
              </div>
            ) : view === 'grid' ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredOpportunities.map((o, idx) => (
                  <ScrollReveal key={o.id} delay={(idx % 3) * 80} className="h-full">
                    <PreviewCard opportunity={o} onUnlock={() => scrollToId('plans')} />
                  </ScrollReveal>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredOpportunities.map((o, idx) => (
                  <ScrollReveal key={o.id} delay={Math.min(idx * 55, 275)}>
                    <PreviewRow opportunity={o} onUnlock={() => scrollToId('plans')} />
                  </ScrollReveal>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={goToPage} />
              </div>
            )}

            <ScrollReveal delay={100}>
              <div className="mt-10 flex flex-col items-start gap-2 rounded-2xl border border-line bg-surface-muted px-5 py-4 text-sm text-content-muted dark:bg-surface/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p>
                  Full commercial and contact details become available with a Recruitment Vendor
                  Access plan.
                </p>
                <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1">
                  <button
                    type="button"
                    onClick={() => scrollToId('plans')}
                    className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >
                    View Access Plans →
                  </button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 4. VENDOR ONBOARDING PROCESS (HOW IT WORKS)                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <VendorProcessSection />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 5. VENDOR VALUE COMPARISON (AGENCY ADVANTAGE)                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <VendorComparisonSection />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 6. PLANS                                                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {!error && (
        <section id="plans" className="section-glow-navy relative border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <ScrollReveal className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
              <Eyebrow>ACCESS THE FULL VAULT</Eyebrow>
              <h2 className="mt-3 font-serif-heading text-3xl font-bold leading-tight text-content sm:text-4xl">
                Choose Your Access Plan
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-content-muted">
                Full access to all Recruitment Vendor Access opportunities for the duration of your
                plan.
              </p>
            </ScrollReveal>

            {loading ? (
              <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-72" />
                ))}
              </div>
            ) : plans.length === 0 ? (
              <div className="rounded-2xl border border-line bg-surface-muted px-6 py-10 text-center">
                <p className="text-sm text-content-muted">No plans are available right now.</p>
              </div>
            ) : (
              <div className="grid items-stretch gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan, idx) => (
                  <ScrollReveal key={plan.id} delay={idx * 90} className="h-full">
                    <PlanCard
                      plan={plan}
                      popular={plan.durationDays === 90}
                      loading={buyingPlanId === plan.id}
                      disabled={buyingPlanId !== null}
                      onChoose={() => handleChoosePlan(plan)}
                    />
                  </ScrollReveal>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 7. VENDOR PARTNERSHIP & ONBOARDING ENQUIRY                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <VendorEnquirySection />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 8. FAQ                                                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {!error && faqs.length > 0 && (
        <section id="faq" className="section-glow relative border-t border-line bg-surface-muted">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <ScrollReveal className="mb-8 text-center">
              <Eyebrow>FREQUENTLY ASKED QUESTIONS</Eyebrow>
              <h2 className="mt-3 font-serif-heading text-2xl font-bold tracking-tight text-content sm:text-3xl">
                Quick Answers
              </h2>
            </ScrollReveal>
            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <ScrollReveal key={faq.id} delay={Math.min(idx * 55, 330)}>
                  <FaqItem faq={faq} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 6. FINAL CTA BANNER (COMPACT EXECUTIVE DESIGN)                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-surface-muted py-8 sm:py-12 border-t border-line">
        <div className="mx-auto max-w-[1320px] px-5">
          <ScrollReveal direction="scale">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-[#061B36] via-[#092244] to-[#041226] text-white shadow-xl border border-[#D6952F]/25 px-5 py-7 sm:px-10 sm:py-9 text-center">
              {/* Ambient luxury lighting */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[550px] h-[180px] bg-gradient-to-b from-[#D6952F]/15 to-transparent blur-[60px] rounded-full"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 w-[400px] h-[120px] bg-blue-500/10 blur-[70px] rounded-full"
              />

              <div className="relative z-10 mx-auto max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase bg-[#D6952F]/15 text-[#F0C27B] border border-[#D6952F]/35 shadow-sm mb-3">
                  <span className="text-[#D6952F]">✦</span>
                  <span>Recruitment Partner Vault</span>
                </span>

                <h2 className="font-serif-heading text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
                  Explore the Free Preview and see{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F0C27B] via-[#D6952F] to-[#E5A93C]">
                    current opportunities.
                  </span>
                </h2>

                <p className="mt-2 text-xs sm:text-sm text-[#C9D3EA] leading-relaxed max-w-xl mx-auto font-sans">
                  Review verified corporate empanelment notices, commercial staffing tenders, and
                  active vendor requirements before choosing your access plan.
                </p>

                {/* Action Buttons */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => scrollToId('free-preview')}
                    className="inline-flex items-center justify-center gap-2 rounded-full py-2.5 px-6 font-bold text-sm bg-gradient-to-r from-[#D6952F] to-[#C08124] hover:from-[#E0A23D] hover:to-[#CF8F30] text-[#061B36] shadow-[0_8px_20px_-4px_rgba(214,149,47,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer border-0"
                  >
                    <span>Explore Free Opportunities</span>
                    <span className="text-base leading-none font-bold">→</span>
                  </button>

                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-1.5 rounded-full py-2.5 px-5 font-semibold text-sm text-white/95 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/35 backdrop-blur-sm transition-all no-underline cursor-pointer"
                  >
                    Talk to us
                  </Link>
                </div>

                {/* Trust Indicators */}
                <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-[#D7DFEE]">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>100% Verified Mandates</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-[#D7DFEE]">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Direct Procurement Access</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-[#D7DFEE]">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Zero Agency Commission</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

const PREVIEW_WRAPPER =
  'group card-premium relative flex h-full flex-col overflow-hidden rounded-2xl';

function RvaField({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      <span className="font-semibold uppercase tracking-wide text-content-faint">{label}</span>
      <span className="whitespace-pre-line text-content">{value}</span>
    </div>
  );
}

/** A compact icon + label pill, mirroring the Opportunity Vault meta chips. */
function RvaChip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-line bg-surface-muted/70 px-2.5 py-1 text-xs font-medium text-content-muted dark:bg-surface">
      {icon && <span className="shrink-0 text-content-faint">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** The short source-workbook columns, rendered as space-saving chips. */
function RvaChips({ opportunity }: { opportunity: RvaOpportunity }) {
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

/** Full contact + application details, shown only when the viewer is entitled. */
function RvaFullDetails({ opportunity }: { opportunity: RvaOpportunity }) {
  if (!opportunity.isFullAccess) return null;
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-line bg-surface-muted/60 p-3 dark:bg-surface/60">
      <RvaField label="Contact Person" value={opportunity.applicationContact} />
      <RvaField label="Other Details" value={opportunity.otherDetails} />
      <RvaField label="How to Apply" value={opportunity.howToApply} />
    </div>
  );
}

function PreviewCard({
  opportunity,
  onUnlock,
}: {
  opportunity: RvaOpportunity;
  onUnlock: () => void;
}) {
  const clickable = !opportunity.isFullAccess;
  return (
    <article
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onUnlock : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onUnlock();
              }
            }
          : undefined
      }
      className={`${PREVIEW_WRAPPER} p-5 ${
        clickable
          ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8943E] focus-visible:ring-offset-2'
          : ''
      }`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#C8943E] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand-400/15 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-end gap-3">
        {opportunity.isFullAccess ? (
          <Badge variant="success" className="shrink-0">
            Full access
          </Badge>
        ) : (
          <Badge variant="warning" className="shrink-0">
            <LockIcon className="mr-1 h-3 w-3" /> Locked
          </Badge>
        )}
      </div>

      <h3 className="relative mt-3 text-base font-bold leading-snug text-content transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">
        {opportunity.title}
      </h3>

      <div className="relative mt-3">
        <RvaChips opportunity={opportunity} />
      </div>

      <RvaFullDetails opportunity={opportunity} />
    </article>
  );
}

function PreviewRow({
  opportunity,
  onUnlock,
}: {
  opportunity: RvaOpportunity;
  onUnlock: () => void;
}) {
  const clickable = !opportunity.isFullAccess;
  return (
    <article
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onUnlock : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onUnlock();
              }
            }
          : undefined
      }
      className={`group card-premium relative overflow-hidden rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 ${
        clickable
          ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8943E] focus-visible:ring-offset-2'
          : ''
      }`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-[#C8943E] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold leading-snug text-content transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">
            {opportunity.title}
          </h3>
          <div className="mt-1.5">
            <RvaChips opportunity={opportunity} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 self-start sm:self-auto">
          {opportunity.isFullAccess ? (
            <Badge variant="success">Full access</Badge>
          ) : (
            <Badge variant="warning">
              <LockIcon className="mr-1 h-3 w-3" /> Locked
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-4">
        <RvaFullDetails opportunity={opportunity} />
      </div>
    </article>
  );
}

function PlanCard({
  plan,
  popular,
  loading,
  disabled,
  onChoose,
}: {
  plan: RvaPlan & { autoPayAmount: number };
  popular: boolean;
  loading: boolean;
  disabled: boolean;
  onChoose: () => void;
}) {
  const tags = popular ? ['Most Popular', 'AutoPay'] : ['Instant Access', 'AutoPay'];

  return (
    <div className="uiverse-parent h-[242px] sm:h-[248px] w-full">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) onChoose();
        }}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onChoose();
          }
        }}
        aria-label={`Choose ${plan.durationLabel} plan`}
        className={`uiverse-card block w-full text-left ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        {/* Layered concentric circles logo in top right (matching Home page plan card) */}
        <div className="uiverse-logo" aria-hidden="true">
          <span className="circle circle1" />
          <span className="circle circle2" />
          <span className="circle circle3" />
          <span className="circle circle4" />
          <span className="circle circle5">
            <span className="svg-glyph">
              <BriefcaseIcon className="h-5 w-5 text-[#F0C27B]" />
            </span>
          </span>
        </div>

        {/* Organic curved glass backdrop */}
        <div className="uiverse-glass" aria-hidden="true" />

        {/* Card Content */}
        <div className="uiverse-content">
          <h3 className="title">{plan.durationLabel}</h3>
          <p className="text">
            {plan.description ||
              'Full access to Recruitment Vendor Access mandates, direct contacts & RFP details.'}
          </p>

          {/* Pricing metric row */}
          <div className="uiverse-price-pill">
            <span className="text-base sm:text-lg font-extrabold text-[#061B36] dark:text-white">
              {formatMoney(plan.autoPayAmount, plan.currency)}
            </span>
            <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              AutoPay
            </span>
          </div>
        </div>

        {/* Bottom bar with tags on left and Buy Now CTA on right */}
        <div className="uiverse-bottom">
          <div className="tags-container">
            {tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>

          <div className="view-more">
            <span className="view-more-button">{loading ? 'Starting…' : 'Buy Now'}</span>
            <svg
              className="svg"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ faq }: { faq: RvaFaq }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface dark:bg-surface-elevated">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-content sm:text-base">{faq.question}</span>
        <ChevronIcon
          className={`h-4 w-4 shrink-0 text-content-faint transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="border-t border-line px-5 py-4">
          <p className="text-sm leading-relaxed text-content-muted">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}
