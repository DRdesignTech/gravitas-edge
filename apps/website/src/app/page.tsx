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
import PriceLockBanner from '@/components/marketing/PriceLockBanner';
import InteractiveFeatureCards from '@/components/marketing/InteractiveFeatureCards';
import NoApplyCard from '@/components/marketing/NoApplyCard';
import HowItWorks from '@/components/marketing/HowItWorks';
import ScrollReveal from '@/components/marketing/ScrollReveal';
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
    Promise.all([fetchVaults(), fetchPublicPricing(), fetchOpportunities({ limit: 100 })])
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
    const scrollCurrentHash = () => {
      const hash = window.location.hash;
      if (!hash) return;
      if (hash === '#home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      scrollToHash(hash);
    };

    scrollCurrentHash();
    window.addEventListener('hashchange', scrollCurrentHash);
    return () => window.removeEventListener('hashchange', scrollCurrentHash);
  }, []);

  // Re-align hash scroll after async home sections finish loading so layout shifts don't miss the target.
  useEffect(() => {
    if (loading || !window.location.hash) return;
    const hash = window.location.hash;
    const timer = window.setTimeout(() => {
      if (hash === '#home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        scrollToHash(hash);
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [loading]);

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
      {/* 1. HERO — #home                                                */}

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
                  <b>Build Your Bundle</b> Multi-region + Global vaults, save <b>20%</b> ·{' '}
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
                  <b>{countriesCount > 0 ? `${countriesCount} countries` : '24 countries'}</b> right
                  now ·{' '}
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
                  <b>Executive Premier Access</b> Multi-region &amp; International in one vault ·{' '}
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
          <ScrollReveal
            delay={0}
            className="flex flex-col items-center gap-2 py-[22px] px-2.5 text-white font-semibold text-[0.95rem] text-center max-[600px]:text-[0.8rem] max-[600px]:py-4 max-[600px]:px-1.5"
          >
            <svg
              className="w-6 h-6 stroke-[#D6952F] fill-none stroke-[1.6]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
            </svg>
            <span>Curated Opportunities</span>
          </ScrollReveal>
          <ScrollReveal
            delay={100}
            className="flex flex-col items-center gap-2 py-[22px] px-2.5 text-white font-semibold text-[0.95rem] text-center max-[600px]:text-[0.8rem] max-[600px]:py-4 max-[600px]:px-1.5 border-l border-white/[0.12]"
          >
            <svg
              className="w-6 h-6 stroke-[#D6952F] fill-none stroke-[1.6]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
            </svg>
            <span>Direct Hiring Contacts</span>
          </ScrollReveal>
          <ScrollReveal
            delay={200}
            className="flex flex-col items-center gap-2 py-[22px] px-2.5 text-white font-semibold text-[0.95rem] text-center max-[600px]:text-[0.8rem] max-[600px]:py-4 max-[600px]:px-1.5 border-l border-white/[0.12]"
          >
            <svg
              className="w-6 h-6 stroke-[#D6952F] fill-none stroke-[1.6]"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" />
            </svg>
            <span>Global Markets</span>
          </ScrollReveal>
        </div>
      </div>

      {/* Price Lock Promotional Strip for Guest Users */}
      <PriceLockBanner onViewPlans={() => scrollTo('plans')} />

      {/* 2. WHAT GRAVITAS EDGE DOES — #what                             */}
      <section
        id="what"
        className="py-[72px] bg-[#FEFDF9] dark:bg-[#06142A] text-[#1A2236] dark:text-[#EAEFFB]"
      >
        {/* Retain anchor IDs for scroll compatibility */}
        <span id="why-gravitas-edge" className="sr-only" />
        <span id="what-we-do" className="sr-only" />

        <div className="mx-auto max-w-[1180px] px-5">
          {/* Top row: Text on left, "No Apply Now button" card on right */}
          <div className="grid grid-cols-1 min-[861px]:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            <ScrollReveal direction="left">
              <Eyebrow>What Gravitas Edge does</Eyebrow>
              <h2 className="text-[#061B36] dark:text-[#F2F5FA] font-bold tracking-[-0.02em] leading-[1.15] text-[clamp(1.7rem,3.4vw,2.5rem)] mb-2 font-sans">
                Skip the portals. Connect directly.
              </h2>
              <p className="text-[#5B6479] dark:text-[#9FB0CC] text-[1.05rem] leading-[1.55] max-w-[640px]">
                Opportunities surface through many channels: recruiter networks, hiring managers,
                consultants and company announcements. We find and select them, sort them by
                country, city and experience, and give you the application pathway or hiring contact
                where it&apos;s available.
              </p>
            </ScrollReveal>

            <NoApplyCard />
          </div>

          {/* Bottom row: Interactive 3D animated feature cards */}
          <InteractiveFeatureCards
            onScrollTo={scrollTo}
            onOpenOpportunities={() => router.push('/opportunities')}
          />
        </div>
      </section>

      {/* 4. HOW IT WORKS — #how-it-works                                 */}
      <HowItWorks />

      {/* 5. EXPLORE OPPORTUNITIES BY COUNTRY — #countries               */}
      <CountryDirectory opportunities={opportunities} />
      {/* 6. LIVE FREE PREVIEW — #preview / #free-preview                 */}
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
        <LiveFreePreview vaults={vaults} loading={false} error="" onRetry={load} />
      )}

      {/* 7. OPPORTUNITY VAULTS — #vaults                                */}
      <section
        id="vaults"
        className="section-glow-navy relative border-t border-line bg-surface dark:bg-surface-elevated/50"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <ScrollReveal className="max-w-2xl">
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
                Opportunities segmented by seniority level, compensation tier, and target market
                geography.
              </p>
            </ScrollReveal>
            <div className="flex flex-wrap items-center gap-2">
              {user && (
                <ScrollReveal delay={120}>
                  <Link
                    href="/dashboard/vaults"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-content transition hover:border-[#D6952F] hover:text-[#D6952F] dark:bg-surface-elevated"
                  >
                    My Vaults Directory →
                  </Link>
                </ScrollReveal>
              )}
            </div>
          </div>

          {!loading && !error && vaults.length > 0 && (
            <ScrollReveal delay={100}>
              <VaultFinder
                vaults={vaults}
                recommended={recommendedVaultIds}
                onRecommendedChange={setRecommendedVaultIds}
                onlyRecommended={onlyRecommended}
                onToggleOnlyRecommended={setOnlyRecommended}
              />
            </ScrollReveal>
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
              {visibleVaults.map((v, idx) => (
                <ScrollReveal key={v.id} delay={(idx % 3) * 90} className="h-full">
                  <VaultCard vault={v} recommended={recommendedVaultIds.has(v.id)} />
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 8. PLANS / PRICING — #plans                                     */}
      <PricingSection groups={pricing} loading={loading} error={error} onRetry={load} />

      {/* 9. WHATSAPP FREE CONNECTION — #whatsapp-free-2                 */}
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

      {/* 10. UPLOAD RESUME — #upload-resume                              */}
      <section
        id="upload-resume"
        className="relative overflow-hidden border-t border-line bg-[#FEFDF9] dark:bg-[#06142A] scroll-mt-20"
      >
        {/* Subtle ambient background glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-[#D6952F]/10 blur-[110px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-brand-600/10 blur-[110px]"
        />

        <div className="relative z-10 mx-auto max-w-[1320px] px-5 py-16 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
            {/* Left Column: Executive Pitch & 2x2 Bento Benefits */}
            <div className="lg:col-span-6">
              <ScrollReveal direction="left">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#D6952F]/35 bg-[#D6952F]/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-[#9C6424] dark:text-[#F0C27B]">
                  <span className="text-[#D6952F]">✦</span>
                  <span>Executive Talent Profile</span>
                </span>

                <h2 className="mt-4 font-serif-heading text-3xl font-bold tracking-tight text-[#061B36] dark:text-[#F2F5FA] sm:text-4xl leading-[1.15]">
                  Upload your resume.{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D6952F] to-[#B37E28]">
                    Let the right roles find you.
                  </span>
                </h2>

                <p className="mt-4 text-sm leading-relaxed text-[#5B6479] dark:text-[#93A3BE] sm:text-base max-w-xl">
                  Make your profile ready for high-impact opportunities across London, UAE, Singapore,
                  North America, and global corridors. Share your resume once—no account needed to start.
                </p>
              </ScrollReveal>

              {/* 2x2 Bento Benefit Grid */}
              <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  {
                    title: 'Smart Role Matching',
                    desc: 'Get matched with relevant regional and executive opportunities.',
                  },
                  {
                    title: 'Recruiter Ready',
                    desc: 'Keep your profile accessible for verified hiring desks.',
                  },
                  {
                    title: 'Update Anytime',
                    desc: 'Upload, replace, or refresh your CV whenever you choose.',
                  },
                  {
                    title: 'Consent-First Privacy',
                    desc: 'Your data is shared strictly with your explicit consent.',
                  },
                ].map((item, idx) => (
                  <ScrollReveal key={item.title} delay={idx * 80} className="h-full">
                    <div className="group h-full rounded-2xl border border-[#E9E5DC] dark:border-[#1E3557] bg-white/80 dark:bg-[#0C1E38]/80 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D6952F]/60 hover:shadow-md">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#061B36] to-[#102E57] text-[#F0C27B] ring-1 ring-[#D6952F]/30">
                          <CheckAccent className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-[#061B36] dark:text-[#F2F5FA]">
                            {item.title}
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-[#5B6479] dark:text-[#93A3BE]">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>

              {/* Trust & Format Strip */}
              <ScrollReveal delay={200}>
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line/70 pt-5 text-xs font-medium text-[#5B6479] dark:text-[#93A3BE]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    No Account Required
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D6952F]" />
                    Auto-Extracts Contact Details
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                    PDF, DOC, DOCX · Max 5 MB
                  </span>
                </div>
              </ScrollReveal>
            </div>

            {/* Right Column: Elevated ResumeUploadCard Wrapper */}
            <div className="lg:col-span-6 relative">
              <ScrollReveal direction="right" delay={120}>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-[#D6952F]/20 via-transparent to-[#061B36]/15 blur-xl opacity-70"
                />
                <div className="relative">
                  <ResumeUploadCard />
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* 11. TESTIMONIALS — #testimonials                                 */}
      <Testimonials />

      {/* 12. FAQ — #faq                                                  */}
      <FaqSection />
    </div>
  );
}
