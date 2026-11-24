'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, ReactNode, useEffect, useMemo, useState } from 'react';
import { fetchVaults, fetchPublicPricing, fetchOpportunities } from '@/lib/services';
import { PricingGroup, Vault, Opportunity } from '@/lib/types';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui';
import { VaultCard } from '@/components/cards';
import VaultFinder from '@/components/marketing/VaultFinder';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/lib/auth';
import Eyebrow from '@/components/marketing/Eyebrow';
import HeroCarousel from '@/components/marketing/HeroCarousel';
import HowItWorks from '@/components/marketing/HowItWorks';
import Testimonials from '@/components/marketing/Testimonials';
import LiveFreePreview from '@/components/marketing/LiveFreePreview';
import CountryDirectory from '@/components/marketing/CountryDirectory';
import ResumeUploadCard from '@/components/marketing/ResumeUploadCard';
import PricingSection from '@/components/marketing/PricingSection';
import WhatsAppChannel from '@/components/marketing/WhatsAppChannel';
import FaqSection from '@/components/marketing/FaqSection';
import { scrollToHash } from '@/lib/scroll';
import { HiSparkles } from 'react-icons/hi2';

function CheckAccent({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

const whatFeatures = [
  {
    icon: '🌍',
    title: 'Multiple countries',
    description: "One subscription covers every country in your vault's coverage.",
  },
  {
    icon: '🤝',
    title: 'Direct pathways',
    description: 'Recruiter or hiring-manager details where the source provides them.',
  },
  {
    icon: '⏱️',
    title: 'Regularly updated',
    description: 'Expired roles are removed automatically, so you only see live listings.',
  },
];

const HERO_COUNTRIES = [
  { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦' },
  { name: 'Singapore', code: 'SG', flag: '🇸🇬' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪' },
  { name: 'Qatar', code: 'QA', flag: '🇶🇦' },
  { name: 'Kenya', code: 'KE', flag: '🇰🇪' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦' },
  { name: 'United States', code: 'US', flag: '🇺🇸' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺' },
  { name: 'Oman', code: 'OM', flag: '🇴🇲' },
  { name: 'India', code: 'IN', flag: '🇮🇳' },
];

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [pricing, setPricing] = useState<PricingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recommendedVaultIds, setRecommendedVaultIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [oppsTotal, setOppsTotal] = useState(0);
  const [countriesCount, setCountriesCount] = useState(0);
  const [citiesCount, setCitiesCount] = useState(0);
  const [countryCounts, setCountryCounts] = useState<Record<string, number>>({});
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
      fetchVaults(),
      fetchPublicPricing(),
      fetchOpportunities({ limit: 100 }),
    ])
      .then(([v, p, oppsRes]) => {
        setVaults(v || []);
        setPricing(p || []);
        if (oppsRes?.meta?.totalItems) {
          setOppsTotal(oppsRes.meta.totalItems);
        }
        if (Array.isArray(oppsRes?.items)) {
          setOpportunities(oppsRes.items);
          const counts: Record<string, number> = {};
          oppsRes.items.forEach((o) => {
            if (o.country) {
              counts[o.country] = (counts[o.country] || 0) + 1;
            }
          });
          setCountryCounts(counts);
          const uniqueCountries = new Set(oppsRes.items.map((o) => o.country).filter(Boolean));
          const uniqueCities = new Set(oppsRes.items.map((o) => o.location).filter(Boolean));
          if (uniqueCountries.size > 0) setCountriesCount(uniqueCountries.size);
          if (uniqueCities.size > 0) setCitiesCount(uniqueCities.size);
        }
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Support arriving on the homepage with a hash (e.g. /#plans from another route).
  useEffect(() => {
    scrollToHash(window.location.hash);
    const onHashChange = () => scrollToHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const scrollTo = (id: string) => {
    if (typeof window === 'undefined') return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (selectedCountry.trim()) params.set('country', selectedCountry.trim());
    router.push(`/opportunities${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleCountryClick = (countryName: string) => {
    router.push(`/opportunities?country=${encodeURIComponent(countryName)}`);
  };

  const [onlyRecommended, setOnlyRecommended] = useState(false);

  const visibleVaults = useMemo(() => {
    const list = [...vaults];
    if (recommendedVaultIds.size === 0) return list;
    const recommended = list.filter((v) => recommendedVaultIds.has(v.id));
    if (onlyRecommended) return recommended;
    const rest = list.filter((v) => !recommendedVaultIds.has(v.id));
    return [...recommended, ...rest];
  }, [vaults, recommendedVaultIds, onlyRecommended]);

  return (
    <div className="overflow-x-clip">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. HERO — #home                                                */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {/* Offer announcement ticker bar (.offerbar) */}
      <div
        className="relative overflow-hidden bg-gradient-to-r from-[#C8842D] via-[#E9B566] to-[#C8842D] text-[#061B36] border-b border-[#061B36]/15 select-none"
        aria-label="Current offers"
      >
        <div className="pointer-events-none absolute top-0 bottom-0 left-0 w-[60px] z-10 bg-gradient-to-r from-[#C8842D] to-transparent" />
        <div className="pointer-events-none absolute top-0 bottom-0 right-0 w-[60px] z-10 bg-gradient-to-l from-[#C8842D] to-transparent" />
        <div className="flex w-max animate-[oscroll_38s_linear_infinite] hover:[animation-play-state:paused]">
          {[0, 1].map((copyIndex) => (
            <div key={copyIndex} className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => scrollTo('bundle')}
                className="inline-flex items-center gap-2 px-[26px] py-[10px] text-[0.84rem] font-semibold whitespace-nowrap text-[#061B36] relative after:content-['✦'] after:absolute after:-right-1.5 after:text-[#061B36]/45 after:text-[0.7rem] hover:opacity-90 bg-transparent border-0 cursor-pointer"
              >
                <span className="bg-[#061B36] text-[#F6D58A] text-[0.64rem] font-extrabold tracking-[0.08em] px-2 py-[3px] rounded-full">
                  OFFER
                </span>
                <span>
                  <b>Build Your Bundle</b> India + Global vaults, save <b>20%</b> ·{' '}
                  <u className="no-underline border-b-[1.5px] border-[#061B36] font-bold hover:border-b-[2.5px]">
                    Build now
                  </u>
                </span>
              </button>

              <button
                type="button"
                onClick={() => scrollTo('free-preview')}
                className="inline-flex items-center gap-2 px-[26px] py-[10px] text-[0.84rem] font-semibold whitespace-nowrap text-[#061B36] relative after:content-['✦'] after:absolute after:-right-1.5 after:text-[#061B36]/45 after:text-[0.7rem] hover:opacity-90 bg-transparent border-0 cursor-pointer"
              >
                <span className="bg-[#061B36] text-[#F6D58A] text-[0.64rem] font-extrabold tracking-[0.08em] px-2 py-[3px] rounded-full">
                  FREE
                </span>
                <span>
                  Explore the <b>Free Preview</b> before you subscribe ·{' '}
                  <u className="no-underline border-b-[1.5px] border-[#061B36] font-bold hover:border-b-[2.5px]">
                    Preview jobs
                  </u>
                </span>
              </button>

              <button
                type="button"
                onClick={() => scrollTo('vaults')}
                className="inline-flex items-center gap-2 px-[26px] py-[10px] text-[0.84rem] font-semibold whitespace-nowrap text-[#061B36] relative after:content-['✦'] after:absolute after:-right-1.5 after:text-[#061B36]/45 after:text-[0.7rem] hover:opacity-90 bg-transparent border-0 cursor-pointer"
              >
                <span className="bg-[#061B36] text-[#F6D58A] text-[0.64rem] font-extrabold tracking-[0.08em] px-2 py-[3px] rounded-full">
                  GLOBAL
                </span>
                <span>
                  <b>Global Career Access</b> from <b>$39/mo</b>, one subscription for{' '}
                  {countriesCount > 0 ? `${countriesCount} countries` : '24 countries'} ·{' '}
                  <u className="no-underline border-b-[1.5px] border-[#061B36] font-bold hover:border-b-[2.5px]">
                    See vaults
                  </u>
                </span>
              </button>

              <Link
                href="/opportunities"
                className="inline-flex items-center gap-2 px-[26px] py-[10px] text-[0.84rem] font-semibold whitespace-nowrap text-[#061B36] relative after:content-['✦'] after:absolute after:-right-1.5 after:text-[#061B36]/45 after:text-[0.7rem] hover:opacity-90 no-underline cursor-pointer"
              >
                <span className="bg-[#061B36] text-[#F6D58A] text-[0.64rem] font-extrabold tracking-[0.08em] px-2 py-[3px] rounded-full">
                  LIVE
                </span>
                <span>
                  <b>{oppsTotal > 0 ? `${oppsTotal} live roles` : '500+ live roles'}</b> across{' '}
                  <b>{countriesCount > 0 ? `${countriesCount} countries` : '24 countries'}</b> right now ·{' '}
                  <u className="no-underline border-b-[1.5px] border-[#061B36] font-bold hover:border-b-[2.5px]">
                    Explore opportunities
                  </u>
                </span>
              </Link>

              <Link
                href="/opportunities?country=United+Arab+Emirates"
                className="inline-flex items-center gap-2 px-[26px] py-[10px] text-[0.84rem] font-semibold whitespace-nowrap text-[#061B36] relative after:content-['✦'] after:absolute after:-right-1.5 after:text-[#061B36]/45 after:text-[0.7rem] hover:opacity-90 no-underline cursor-pointer"
              >
                <span className="bg-[#061B36] text-[#F6D58A] text-[0.64rem] font-extrabold tracking-[0.08em] px-2 py-[3px] rounded-full">
                  NEW
                </span>
                <span>
                  Just added: <b>Regional Operations Lead</b> in Dubai ·{' '}
                  <u className="no-underline border-b-[1.5px] border-[#061B36] font-bold hover:border-b-[2.5px]">
                    View UAE
                  </u>
                </span>
              </Link>

              <button
                type="button"
                onClick={() => scrollTo('vaults')}
                className="inline-flex items-center gap-2 px-[26px] py-[10px] text-[0.84rem] font-semibold whitespace-nowrap text-[#061B36] relative after:content-['✦'] after:absolute after:-right-1.5 after:text-[#061B36]/45 after:text-[0.7rem] hover:opacity-90 bg-transparent border-0 cursor-pointer"
              >
                <span className="bg-[#061B36] text-[#F6D58A] text-[0.64rem] font-extrabold tracking-[0.08em] px-2 py-[3px] rounded-full">
                  PREMIER
                </span>
                <span>
                  <b>Executive Premier Access</b> India + International in one vault ·{' '}
                  <u className="no-underline border-b-[1.5px] border-[#061B36] font-bold hover:border-b-[2.5px]">
                    Learn more
                  </u>
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Hero Section (.hero) with Dynamic Carousel */}
      <HeroCarousel
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCountry={selectedCountry}
        setSelectedCountry={setSelectedCountry}
        handleHeroSearch={handleHeroSearch}
        countriesList={HERO_COUNTRIES}
        countryCounts={countryCounts}
        handleCountryClick={handleCountryClick}
        oppsTotal={oppsTotal}
        countriesCount={countriesCount}
        citiesCount={citiesCount}
        scrollTo={scrollTo}
      />

      {/* 3 Trust Features Strip right below Hero (.hstrip) */}
      <div className="bg-[#061B36] border-t border-white/[0.08]">
        <div className="mx-auto max-w-[1180px] px-5 grid grid-cols-3">
          <div className="flex flex-col items-center gap-2 py-[22px] px-2.5 text-white font-semibold text-[0.95rem] text-center max-[600px]:text-[0.8rem] max-[600px]:py-4 max-[600px]:px-1.5">
            <svg
              className="w-6 h-6 stroke-[#D6952F] fill-none stroke-[1.6]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
            </svg>
            <span>Curated Opportunities</span>
          </div>
          <div className="flex flex-col items-center gap-2 py-[22px] px-2.5 text-white font-semibold text-[0.95rem] text-center max-[600px]:text-[0.8rem] max-[600px]:py-4 max-[600px]:px-1.5 border-l border-white/[0.12]">
            <svg
              className="w-6 h-6 stroke-[#D6952F] fill-none stroke-[1.6]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
            </svg>
            <span>Direct Hiring Contacts</span>
          </div>
          <div className="flex flex-col items-center gap-2 py-[22px] px-2.5 text-white font-semibold text-[0.95rem] text-center max-[600px]:text-[0.8rem] max-[600px]:py-4 max-[600px]:px-1.5 border-l border-white/[0.12]">
            <svg
              className="w-6 h-6 stroke-[#D6952F] fill-none stroke-[1.6]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" />
            </svg>
            <span>Global Markets</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 2. WHAT GRAVITAS EDGE DOES — #what                             */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section
        id="what"
        className="py-[72px] bg-[#FEFDF9] dark:bg-[#06142A] text-[#1A2236] dark:text-[#EAEFFB]"
      >
        {/* Retain anchor IDs for scroll compatibility */}
        <span id="why-gravitas-edge" className="sr-only" />
        <span id="what-we-do" className="sr-only" />

        <div className="mx-auto max-w-[1180px] px-5 grid grid-cols-1 min-[861px]:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div>
            <Eyebrow>
              What Gravitas Edge does
            </Eyebrow>
            <h2 className="text-[#061B36] dark:text-[#F2F5FA] font-bold tracking-[-0.02em] leading-[1.15] text-[clamp(1.7rem,3.4vw,2.5rem)] mb-2 font-sans">
              Skip the portals. Connect directly.
            </h2>
            <p className="text-[#5B6479] dark:text-[#9FB0CC] text-[1.05rem] leading-[1.55] max-w-[640px]">
              Opportunities surface through many channels: recruiter networks, hiring managers,
              consultants and company announcements. We find and select them, sort them by country,
              city and experience, and give you the application pathway or hiring contact where
              it&apos;s available.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-[18px] mt-[26px]">
              {whatFeatures.map((f) => (
                <div key={f.title}>
                  <div className="w-11 h-11 rounded-[12px] grid place-items-center bg-[#FBF0DE] dark:bg-[#201D19] text-[1.3rem] mb-3 select-none">
                    {f.icon}
                  </div>
                  <h3 className="text-[1rem] font-bold text-[#061B36] dark:text-[#F2F5FA] leading-[1.15] mb-1 font-sans">
                    {f.title}
                  </h3>
                  <p className="text-[#5B6479] dark:text-[#9FB0CC] text-[0.9rem] leading-[1.55]">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#061B36] dark:bg-[#0A2645] text-white rounded-[16px] p-[26px] border border-transparent dark:border-[rgba(240,194,123,0.18)] shadow-lg">
            <h3 className="text-white font-bold text-[1.35rem] leading-[1.15] mb-2 font-sans">
              No &ldquo;Apply Now&rdquo; button
            </h3>
            <p className="text-[#C9D3EA] text-[0.93rem] mb-2.5 leading-[1.55]">
              You reach out yourself, with context.
            </p>
            <ol className="list-decimal pl-5 text-[#C9D3EA] text-[0.93rem]">
              <li className="my-1.5 leading-[1.55]">See a relevant opportunity in your vault</li>
              <li className="my-1.5 leading-[1.55]">View the hiring contact or application pathway</li>
              <li className="my-1.5 leading-[1.55]">Share your resume directly</li>
            </ol>
            <p className="text-[#8C9AC0] text-[0.78rem] mt-3.5 leading-[1.5]">
              Gravitas Edge is an opportunity-information service, not a recruitment agency. We
              don&apos;t guarantee interviews or placements.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 4. HOW IT WORKS — #how-it-works                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <HowItWorks />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 5. LIVE FREE PREVIEW — #preview / #free-preview                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {loading ? (
        <section
          id="preview"
          className="relative py-[72px] bg-[#FEFDF9] dark:bg-[#06142A] scroll-mt-20"
        >
          <div id="free-preview" className="absolute -top-20" aria-hidden="true" />
          <div className="mx-auto max-w-[1180px] px-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[18px]">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-[14px]" />
              ))}
            </div>
          </div>
        </section>
      ) : error ? (
        <section
          id="preview"
          className="relative py-[72px] bg-[#FEFDF9] dark:bg-[#06142A] scroll-mt-20"
        >
          <div id="free-preview" className="absolute -top-20" aria-hidden="true" />
          <div className="mx-auto max-w-[1180px] px-5">
            <ErrorState message={error} onRetry={load} />
          </div>
        </section>
      ) : (
        <LiveFreePreview
          vaults={vaults}
          loading={false}
          error=""
          onRetry={load}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 5. EXPLORE OPPORTUNITIES BY COUNTRY — #countries               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <CountryDirectory opportunities={opportunities} />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 6. OPPORTUNITY VAULTS — #vaults                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section
        id="vaults"
        className="section-glow-navy relative border-t border-line bg-surface dark:bg-surface-elevated/50"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D6952F]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#D6952F]">
                  <HiSparkles className="h-3.5 w-3.5 text-[#D6952F]" />
                  Curated Career Channels
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-content sm:text-3xl">
                Find where you fit.
              </h2>
              <p className="mt-2 text-sm text-content-muted sm:text-base">
                Opportunities segmented by seniority level, compensation tier, and target market geography.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {user && (
                <Link
                  href="/dashboard/vaults"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-content transition hover:border-[#D6952F] hover:text-[#D6952F] dark:bg-surface-elevated"
                >
                  My Vaults Directory →
                </Link>
              )}
            </div>
          </div>

          {!loading && !error && vaults.length > 0 && (
            <VaultFinder
              vaults={vaults}
              recommended={recommendedVaultIds}
              onRecommendedChange={setRecommendedVaultIds}
              onlyRecommended={onlyRecommended}
              onToggleOnlyRecommended={setOnlyRecommended}
            />
          )}

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : vaults.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface dark:bg-surface-elevated">
              <EmptyState
                title="No vaults yet"
                description="Vaults will appear here as they are published."
              />
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-5">
              {visibleVaults.map((v) => (
                <VaultCard key={v.id} vault={v} recommended={recommendedVaultIds.has(v.id)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 8. PLANS / PRICING — #plans                                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <PricingSection groups={pricing} loading={loading} error={error} onRetry={load} />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 9. WHATSAPP FREE CONNECTION — #whatsapp-free-2                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section
        id="whatsapp-free-2"
        className="section-glow relative border-t border-line bg-surface-muted"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <WhatsAppChannel
            title="Stay Connected to New Opportunities"
            description="Get regular updates on new opportunities, key markets and career insights."
            actionLabel="Join WhatsApp Channel"
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 10. UPLOAD RESUME — #upload-resume                              */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section
        id="upload-resume"
        className="section-glow relative border-t border-line bg-surface dark:bg-surface-elevated/50"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
            <div className="max-w-2xl">
              <Eyebrow>RESUME</Eyebrow>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-content sm:text-3xl">
                Upload your resume
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-content-muted sm:text-base">
                Make your profile ready for the right opportunities. Share your resume once and let
                relevant roles come to you — no account needed to start.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Get matched with relevant opportunities',
                  'Keep your resume ready for recruiters',
                  'Upload or update it any time',
                  'Your data is shared only with your consent',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      <CheckAccent className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm text-content-muted sm:text-base">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ResumeUploadCard />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 11. TESTIMONIALS — #testimonials                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Testimonials />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 12. FAQ — #faq                                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <FaqSection />
    </div>
  );
}
