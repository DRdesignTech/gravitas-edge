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
  Skeleton,
  useToast,
} from '@/components/ui';
import { PinIcon, SearchIcon } from '@/components/cards';
import Eyebrow from '@/components/marketing/Eyebrow';
import { formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/lib/auth';
import { fetchRvaOverview, purchaseRvaPlan } from '@/lib/services';
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
const PRIMARY_CATEGORIES = [
  'VENDOR_ENABLEMENT',
  'RFP_EOI_RFQ',
  'STAFFING_RPO',
  'EXECUTIVE_SEARCH',
];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetchRvaOverview(PREVIEW_LIMIT)
      .then(setOverview)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const handleChoosePlan = async (plan: RvaPlan) => {
    if (!user) {
      router.push('/register');
      return;
    }
    if (buyingPlanId) return;
    setBuyingPlanId(plan.id);
    try {
      const started = await purchaseRvaPlan(plan.id);
      router.push(`/recruitment-vendor/checkout/${started.paymentId}`);
    } catch (e) {
      setBuyingPlanId(null);
      showToast(getErrorMessage(e), 'error');
    }
  };

  const categories = (overview?.categories ?? []).filter((c) =>
    PRIMARY_CATEGORIES.includes(c.value),
  );
  const plans = overview?.plans ?? [];
  const faqs = overview?.faqs ?? [];
  const preview = overview?.previewOpportunities ?? [];
  const publishedCount = overview?.publishedOpportunityCount ?? 0;

  const filteredPreview = useMemo(() => {
    const terms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return preview;
    return preview.filter((o) => {
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
  }, [preview, searchQuery]);

  return (
    <div className="overflow-x-clip">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. HERO                                                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section
        id="home"
        className="relative flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden bg-[#03070C]"
      >
        <img
          src="/images/new_vault_hero.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover object-center blur-[10px] sm:scale-100 sm:blur-none"
        />

        {/* Mobile scrim — soft top-down navy so the copy stays readable over the blurred image. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 sm:hidden"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(3,7,12,0.82) 0%, rgba(3,7,12,0.62) 34%, rgba(3,7,12,0.34) 60%, rgba(3,7,12,0.12) 82%, rgba(3,7,12,0.2) 100%)',
          }}
        />
        {/* Navy scrim — left-anchored, keeps the copy readable on larger screens. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 hidden sm:block"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(3,7,12,0.86) 0%, rgba(3,7,12,0.68) 22%, rgba(3,7,12,0.4) 42%, rgba(3,7,12,0.12) 60%, rgba(3,7,12,0) 78%), linear-gradient(0deg, rgba(3,7,12,0.4) 0%, rgba(3,7,12,0) 40%)',
          }}
        />
        {/* Premium vignette — deepens the top-left where the copy sits */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 hidden sm:block"
          style={{
            backgroundImage:
              'radial-gradient(120% 90% at 0% 30%, rgba(6,27,54,0.55) 0%, rgba(6,27,54,0) 60%)',
          }}
        />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 pb-8 pt-12 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
          <div className="w-full max-w-2xl text-left">
            <div className="hero-text-animate" style={{ animationDelay: '0s' }}>
              <Eyebrow invert>RECRUITMENT VENDOR ACCESS</Eyebrow>
            </div>
            <h1
              className="hero-text-animate mt-4 font-serif-heading text-[2rem] font-extrabold leading-[1.15] text-white sm:text-4xl sm:font-bold sm:leading-[1.12] md:text-5xl lg:text-6xl xl:text-7xl"
              style={{ animationDelay: '0.06s' }}
            >
              Opportunities for Recruitment and <span className="text-[#C8943E]">Staffing Partners</span>
            </h1>
            <p
              className="hero-text-animate mt-3 max-w-xl text-[15px] leading-relaxed text-white/90 sm:mt-5 sm:text-lg lg:mt-6 lg:text-xl"
              style={{ animationDelay: '0.12s' }}
            >
              Access curated third-party opportunities where organisations are seeking recruitment,
              staffing, executive search or talent-acquisition partners. Get direct application or
              contact details wherever available.
            </p>
            <div
              className="hero-text-animate mt-6 flex flex-wrap items-center gap-3 sm:mt-8 lg:mt-10"
              style={{ animationDelay: '0.24s' }}
            >
              <button
                type="button"
                onClick={() => scrollToId('free-preview')}
                className="relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-b from-[#D3A24C] to-[#B8832F] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(200,148,62,0.75)] ring-1 ring-inset ring-white/15 transition-all duration-300 hover:-translate-y-0.5 hover:from-[#DBAA55] hover:to-[#C08A32] hover:shadow-[0_18px_40px_-14px_rgba(200,148,62,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#061B36] focus-visible:ring-offset-2 sm:rounded-xl sm:px-6 sm:py-3.5 sm:text-base"
              >
                Explore Free Opportunities <span aria-hidden="true">→</span>
                <span
                  aria-hidden="true"
                  className="btn-shine absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                />
              </button>
              <button
                type="button"
                onClick={() => scrollToId('plans')}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors duration-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#03070C] sm:rounded-xl sm:px-6 sm:py-3.5 sm:text-base"
              >
                View Access Plans
              </button>
            </div>
            {!loading && publishedCount > 0 && (
              <p
                className="hero-text-animate mt-6 text-sm text-white/70"
                style={{ animationDelay: '0.3s' }}
              >
                <span className="font-semibold text-[#E3B968]">{publishedCount}</span>{' '}
                {publishedCount === 1 ? 'opportunity' : 'opportunities'} currently listed
              </p>
            )}
          </div>
        </div>

        {/* Bottom feature strip — navy bar with gold outline icons. */}
        <div className="relative z-10 border-t border-[#C8943E]/20 bg-[#061B36]">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-2 divide-x divide-white/10 px-2 py-3 sm:grid-cols-4 sm:px-6 sm:py-5 lg:px-8">
            {HERO_FEATURES.map((feature) => (
              <div
                key={feature.label}
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <section className="border-t border-line bg-surface-muted">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-line bg-surface dark:bg-surface-elevated">
              <ErrorState message={error} onRetry={load} />
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
            <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
              <Eyebrow>WHAT YOU&apos;LL FIND</Eyebrow>
              <h2 className="mt-3 font-serif-heading text-3xl font-bold leading-tight text-content sm:text-4xl">
                Opportunities Across Key Areas
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-content-muted">
                The vault is organised by the types of partnerships companies are looking to build.
              </p>
            </div>

            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {categories.map((category) => (
                  <div
                    key={category.value}
                    className="card-static flex flex-col rounded-2xl p-5"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#061B36] to-brand-600 text-[#E3B968] ring-1 ring-inset ring-[#C8943E]/30">
                      <CategoryIcon value={category.value} className="h-6 w-6" />
                    </span>
                    <h3 className="mt-4 text-base font-bold leading-snug text-content">
                      {category.label}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-content-muted">
                      {CATEGORY_BLURBS[category.value] ?? 'Recruitment partnership opportunities.'}
                    </p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#C8943E]">
                      {category.count} {category.count === 1 ? 'opportunity' : 'opportunities'}
                    </p>
                  </div>
                ))}
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
          className="section-glow-navy relative border-t border-line bg-surface"
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mb-8 max-w-2xl">
              <Eyebrow>SEE BEFORE YOU SUBSCRIBE</Eyebrow>
              <h2 className="mt-3 font-serif-heading text-2xl font-bold tracking-tight text-content sm:text-3xl">
                Explore Recent Opportunities
              </h2>
              <p className="mt-2 text-sm text-content-muted sm:text-base">
                A preview of recently published opportunities. Commercial and contact details are
                masked until you subscribe.
              </p>
            </div>

            {/* Search + layout toggle */}
            {!loading && preview.length > 0 && (
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full max-w-2xl md:max-w-3xl">
                  <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-content-muted/50" />
                  <input
                    id="rva-preview-search"
                    type="text"
                    placeholder="Search by role, company, location, category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="w-full rounded-xl border border-line bg-surface px-5 py-3.5 pl-12 pr-10 text-base text-content placeholder:text-hint shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface-elevated"
                    aria-label="Search recruitment vendor opportunities"
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
            ) : preview.length === 0 ? (
              <div className="rounded-2xl border border-line bg-surface-muted px-6 py-10 text-center">
                <p className="text-sm text-content-muted">
                  New opportunities will appear here as they are published.
                </p>
              </div>
            ) : filteredPreview.length === 0 ? (
              <div className="rounded-2xl border border-line bg-surface-muted px-6 py-10 text-center">
                <p className="text-sm text-content-muted">
                  No opportunities match your search.{' '}
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >
                    Clear search
                  </button>
                </p>
              </div>
            ) : view === 'grid' ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPreview.map((o) => (
                  <PreviewCard key={o.id} opportunity={o} onUnlock={() => scrollToId('plans')} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPreview.map((o) => (
                  <PreviewRow key={o.id} opportunity={o} onUnlock={() => scrollToId('plans')} />
                ))}
              </div>
            )}

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
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 4. PLANS                                                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {!error && (
        <section
          id="plans"
          className="section-glow-navy relative border-t border-line bg-surface"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
              <Eyebrow>ACCESS THE FULL VAULT</Eyebrow>
              <h2 className="mt-3 font-serif-heading text-3xl font-bold leading-tight text-content sm:text-4xl">
                Choose Your Access Plan
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-content-muted">
                Full access to all Recruitment Vendor Access opportunities for the duration of your
                plan.
              </p>
            </div>

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
              <div className="grid items-stretch gap-5 sm:gap-6 lg:grid-cols-3">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    popular={plan.durationDays === 90}
                    loading={buyingPlanId === plan.id}
                    disabled={buyingPlanId !== null}
                    onChoose={() => handleChoosePlan(plan)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 5. FAQ                                                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {!error && faqs.length > 0 && (
        <section id="faq" className="section-glow relative border-t border-line bg-surface-muted">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mb-8 text-center">
              <Eyebrow>FREQUENTLY ASKED QUESTIONS</Eyebrow>
              <h2 className="mt-3 font-serif-heading text-2xl font-bold tracking-tight text-content sm:text-3xl">
                Quick Answers
              </h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <FaqItem key={faq.id} faq={faq} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 6. FINAL CTA                                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-t border-line bg-[#061B36]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(70% 90% at 50% 0%, rgba(200,148,62,0.22), transparent 60%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-20">
          <h2 className="font-serif-heading text-2xl font-bold leading-tight text-white sm:text-3xl">
            Explore the Free Preview and see current opportunities.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/75 sm:text-base">
            Review what&apos;s available, then choose the access plan that fits your goals.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="!bg-gradient-to-b !from-[#D3A24C] !to-[#B8832F] !text-white hover:!from-[#DBAA55] hover:!to-[#C08A32]"
              onClick={() => scrollToId('free-preview')}
            >
              Explore Free Opportunities
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Link
              href="/contact"
              className="text-sm font-medium text-white/75 underline-offset-4 hover:text-white hover:underline"
            >
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

const PREVIEW_WRAPPER =
  'group card-premium relative flex h-full flex-col overflow-hidden rounded-2xl';

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

      <div className="relative flex items-start justify-between gap-3">
        <Badge variant="info" className="shrink-0">
          {opportunity.categoryLabel}
        </Badge>
        {opportunity.isFullAccess && (
          <Badge variant="success" className="shrink-0">
            Full access
          </Badge>
        )}
      </div>

      <h3 className="relative mt-3 text-base font-bold leading-snug text-content transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">
        {opportunity.title}
      </h3>
      <p className="relative mt-1 text-sm text-content-muted">
        {opportunity.organization || opportunity.company || '—'}
      </p>

      <div className="relative mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-content-muted">
        {opportunity.location && (
          <span className="inline-flex items-center gap-1">
            <PinIcon className="h-3.5 w-3.5 text-content-faint" />
            {opportunity.location}
          </span>
        )}
        {opportunity.experienceText && <span>{opportunity.experienceText}</span>}
      </div>

      <div className="relative mt-4 flex-1" />

      {!opportunity.isFullAccess && (
        <span className="relative mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#C8943E]/40 bg-[#FFF3D9] px-3 py-2 text-xs font-semibold text-[#061B36] transition-colors group-hover:bg-[#F6E6BE] dark:border-[#C8943E]/40 dark:bg-[#C8943E]/10 dark:text-[#E3B968] dark:group-hover:bg-[#C8943E]/20">
          <LockIcon className="h-3.5 w-3.5" /> Unlock Full Access
        </span>
      )}
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
      className={`group card-premium relative overflow-hidden rounded-2xl p-4 sm:p-5 ${
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
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-bold leading-snug text-content transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">
              {opportunity.title}
            </h3>
            <p className="mt-0.5 truncate text-sm text-content-muted">
              {opportunity.organization || opportunity.company || '—'}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-muted">
              <Badge variant="info" className="shrink-0 text-[10px] px-1.5 py-0.5">
                {opportunity.categoryLabel}
              </Badge>
              {opportunity.location && (
                <span className="inline-flex items-center gap-1">
                  <PinIcon className="h-3.5 w-3.5 text-content-faint" />
                  {opportunity.location}
                </span>
              )}
              {opportunity.experienceText && <span>{opportunity.experienceText}</span>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 self-start sm:self-auto">
          {opportunity.isFullAccess ? (
            <Badge variant="success">Full access</Badge>
          ) : (
            <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#C8943E]/40 bg-[#FFF3D9] px-3 py-2 text-xs font-semibold text-[#061B36] transition-colors group-hover:bg-[#F6E6BE] dark:border-[#C8943E]/40 dark:bg-[#C8943E]/10 dark:text-[#E3B968] dark:group-hover:bg-[#C8943E]/20">
              <LockIcon className="h-3.5 w-3.5" /> Unlock Full Access
            </span>
          )}
        </div>
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
  plan: RvaPlan;
  popular: boolean;
  loading: boolean;
  disabled: boolean;
  onChoose: () => void;
}) {
  const hasDiscount = (plan.discountPercentage ?? 0) > 0 && plan.regularPrice > plan.price;
  const savings = hasDiscount ? plan.regularPrice - plan.price : 0;

  return (
    <article
      className={`relative flex flex-col rounded-2xl border p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover ${
        popular
          ? 'border-[#C8943E]/60 bg-gradient-to-b from-[#FFF3D9]/70 to-surface dark:from-brand-950/60 dark:to-surface-elevated'
          : 'border-line bg-surface dark:bg-surface-elevated'
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#061B36] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#E3B968] shadow-sm dark:bg-brand-400 dark:text-[#061B36]">
          Most Popular
        </span>
      )}
      <p className="text-sm font-bold uppercase tracking-wide text-content-muted">
        {plan.durationLabel}
      </p>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-extrabold tracking-tight text-content">
          {formatMoney(plan.price, plan.currency)}
        </span>
        {hasDiscount && (
          <span className="pb-1 text-sm text-content-faint line-through">
            {formatMoney(plan.regularPrice, plan.currency)}
          </span>
        )}
      </div>
      {hasDiscount && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
            {plan.discountPercentage}% OFF
          </span>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Save {formatMoney(savings, plan.currency)}
          </span>
        </div>
      )}

      {plan.description && (
        <p className="mt-4 text-sm leading-relaxed text-content-muted">{plan.description}</p>
      )}

      <ul className="mt-5 flex-1 space-y-2.5">
        {[
          `Full access — ${plan.durationLabel.toLowerCase()}`,
          'All opportunity categories',
          'Commercial & contact details',
          'Instant activation after payment',
        ].map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-content-muted">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <Button
        className="mt-6 w-full !py-3"
        loading={loading}
        disabled={disabled}
        onClick={onChoose}
      >
        {loading ? 'Starting…' : 'Choose Plan'}
      </Button>
    </article>
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
