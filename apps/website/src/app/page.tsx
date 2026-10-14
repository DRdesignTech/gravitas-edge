'use client';

import Link from 'next/link';
import { Fragment, ReactNode, useEffect, useMemo, useState } from 'react';
import { fetchOpportunities, fetchPublicPricing, fetchVaults } from '@/lib/services';
import { Opportunity, PaginatedResult, PricingGroup, Vault } from '@/lib/types';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui';
import { VaultCard } from '@/components/cards';
import VaultFinder from '@/components/marketing/VaultFinder';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/lib/auth';
import Eyebrow from '@/components/marketing/Eyebrow';
import InfoCard from '@/components/marketing/InfoCard';
import HowItWorks from '@/components/marketing/HowItWorks';
import Testimonials from '@/components/marketing/Testimonials';
import LiveFreePreview from '@/components/marketing/LiveFreePreview';
import PricingSection from '@/components/marketing/PricingSection';
import WhatsAppChannel from '@/components/marketing/WhatsAppChannel';
import FaqSection from '@/components/marketing/FaqSection';
import HomeAnchor from '@/components/marketing/HomeAnchor';
import { scrollToHash } from '@/lib/scroll';

const FREE_PREVIEW_LIMIT = 24;

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

const whatWeDoCards = [
  {
    index: '01',
    title: 'Jobs come through many channels',
    description:
      'Good jobs can appear through company teams, recruiters, consultants, networks and portals - not just one place.',
  },
  {
    index: '02',
    title: 'Details matter',
    description:
      'A job title alone is not enough. Location, experience fit, source and how to apply all matter when deciding where to focus.',
  },
  {
    index: '03',
    title: 'Your time is valuable',
    description:
      'We organise job information so you can quickly see which opportunities are worth your time.',
  },
];

const whatWeDoPoints = [
  'Selected Opportunities',
  'Jobs by Location and Experience',
  'How to Apply',
  'Save Time',
];

/* ─────────────────────────────────────────────────────────────────────
   HOW WE ARE DIFFERENT — content + icons
   ──────────────────────────────────────────────────────────────────── */

function StepIcon({
  children,
  className = 'h-5 w-5 sm:h-6 sm:w-6',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const diffSteps = [
  {
    title: 'Relevant Opportunity',
    description: 'Carefully curated roles.',
    icon: (
      <>
        <circle cx="12" cy="12" r="8.25" />
        <circle cx="12" cy="12" r="3.5" />
        <path strokeLinecap="round" d="M12 19.75v1.75M12 2.5v1.75M19.75 12h1.75M2.5 12h1.75" />
      </>
    ),
  },
  {
    title: 'Hiring Contact',
    description: 'Get direct contact details.',
    icon: (
      <>
        <path d="M12 12.75a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.5 20.25c1.4-2.9 4.2-4.5 7.5-4.5s6.1 1.6 7.5 4.5" />
      </>
    ),
  },
  {
    title: 'Your Application',
    description: 'Share your resume directly.',
    icon: (
      <>
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
      </>
    ),
  },
];

const diffArrow = (
  <svg
    className="h-3.5 w-3.5 text-[#C8943E] sm:h-5 sm:w-5 md:h-6 md:w-6"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
  </svg>
);

const diffBenefits: { label: string; icon: ReactNode }[] = [
  {
    label: 'Quality Opportunities',
    icon: (
      <>
        <path d="M12 3.5l2.3 4.9 5.2.8-3.8 3.7.9 5.3-4.6-2.4-4.6 2.4.9-5.3-3.8-3.7 5.2-.8L12 3.5Z" />
      </>
    ),
  },
  {
    label: 'Direct Contacts',
    icon: (
      <>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M4.5 20c1.4-2.9 4.2-4.5 7.5-4.5s6.1 1.6 7.5 4.5" />
      </>
    ),
  },
  {
    label: 'Across Global Markets',
    icon: (
      <>
        <circle cx="12" cy="12" r="8.25" />
        <path d="M3.75 12h16.5M12 3.75c2.4 2.3 3.6 5 3.6 8.25s-1.2 5.95-3.6 8.25c-2.4-2.3-3.6-5-3.6-8.25s1.2-5.95 3.6-8.25Z" />
      </>
    ),
  },
  {
    label: 'Regularly Updated',
    icon: (
      <>
        <path d="M20 12a8 8 0 1 1-2.34-5.66" />
        <path d="M20 4v4h-4" />
      </>
    ),
  },
];

const heroFeatures: { label: string; icon: ReactNode }[] = [
  {
    label: 'Curated Opportunities',
    icon: (
      <path d="M12 3.5l2.3 4.9 5.2.8-3.8 3.7.9 5.3-4.6-2.4-4.6 2.4.9-5.3-3.8-3.7 5.2-.8L12 3.5Z" />
    ),
  },
  {
    label: 'Direct Hiring Contacts',
    icon: (
      <>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M4.5 20c1.4-2.9 4.2-4.5 7.5-4.5s6.1 1.6 7.5 4.5" />
      </>
    ),
  },
  {
    label: 'Global Markets',
    icon: (
      <>
        <circle cx="12" cy="12" r="8.25" />
        <path d="M3.75 12h16.5M12 3.75c2.4 2.3 3.6 5 3.6 8.25s-1.2 5.95-3.6 8.25c-2.4-2.3-3.6-5-3.6-8.25s1.2-5.95 3.6-8.25Z" />
      </>
    ),
  },
];

export default function Home() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [pricing, setPricing] = useState<PricingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recommendedVaultIds, setRecommendedVaultIds] = useState<Set<string>>(new Set());

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
      fetchOpportunities({ page: 1, limit: FREE_PREVIEW_LIMIT }),
      fetchVaults(),
      fetchPublicPricing(),
    ])
      .then(([opps, v, p]) => {
        setOpportunities((opps as PaginatedResult<Opportunity>).items || []);
        setVaults(v || []);
        setPricing(p || []);
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

  const visibleVaults = useMemo(() => {
    const list = [...vaults];
    if (recommendedVaultIds.size === 0) return list;
    const recommended = list.filter((v) => recommendedVaultIds.has(v.id));
    const rest = list.filter((v) => !recommendedVaultIds.has(v.id));
    return [...recommended, ...rest];
  }, [vaults, recommendedVaultIds]);

  return (
    <div className="overflow-x-clip">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. HERO — #home                                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section
        id="home"
        className="relative flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden bg-[#03070C]"
      >
        {/* Background image layer. The artwork is 16:9 and wider than the
            portrait hero, so object-cover crops horizontally — object-position
            pans the frame. Mobile pans to the right so the walking person
            (lower-right of the source) is fully in frame; desktop keeps the
            skyline, stairs and person in view via the centred crop. */}
        <img
          src="/images/hero_bg.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[90%_center] sm:object-center"
        />

        {/* Navy scrim over the photo.
            Desktop: strongest behind the left-aligned copy, fading to fully
            transparent before the right-side skyline, sunlight and person so
            the original warm orange, gold and blue tones stay intact.
            Mobile: the copy is anchored to the top, so the scrim runs
            top-down — keeping text readable while leaving the lower artwork
            visible. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 sm:hidden"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(3,7,12,0.85) 0%, rgba(3,7,12,0.6) 30%, rgba(3,7,12,0.22) 54%, rgba(3,7,12,0) 74%)',
          }}
        />
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

        {/* Content — anchored to the upper portion on mobile, immediately below
            the header, so the skyline, stairs and walking person stay visible
            below the copy. Centred composition is restored on larger screens. */}
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-start px-5 pb-8 pt-16 sm:justify-center sm:px-6 sm:py-12 lg:px-8 lg:py-16">
          <div className="w-full max-w-2xl text-left">
            <h1
              className="hero-text-animate font-serif-heading text-[1.9rem] font-extrabold leading-[1.15] text-white sm:text-4xl sm:font-bold sm:leading-[1.12] md:text-5xl lg:text-6xl xl:text-7xl"
              style={{ animationDelay: '0s' }}
            >
              Not every <span className="block sm:inline">opportunity</span>{' '}
              <span className="block sm:inline">reaches the usual</span>{' '}
              <span className="block text-[#C8943E]">job portals.</span>
            </h1>
            <p
              className="hero-text-animate mt-3 max-w-xl text-[15px] leading-relaxed text-white/90 sm:mt-5 sm:text-lg lg:mt-6 lg:text-xl"
              style={{ animationDelay: '0.12s' }}
            >
              Get direct access to real opportunities with the people actively looking to hire.
            </p>
            <div
              className="hero-text-animate mt-6 sm:mt-8 lg:mt-10"
              style={{ animationDelay: '0.24s' }}
            >
              <Link
                href="#free-preview"
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo('free-preview');
                  window.history.replaceState(null, '', '#free-preview');
                }}
                className="relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-b from-[#D3A24C] to-[#B8832F] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(200,148,62,0.75)] ring-1 ring-inset ring-white/15 transition-all duration-300 hover:-translate-y-0.5 hover:from-[#DBAA55] hover:to-[#C08A32] hover:shadow-[0_18px_40px_-14px_rgba(200,148,62,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#061B36] focus-visible:ring-offset-2 sm:rounded-xl sm:px-6 sm:py-3.5 sm:text-base"
              >
                Explore Free Preview <span aria-hidden="true">→</span>
                <span
                  aria-hidden="true"
                  className="btn-shine absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom feature strip — navy three-column bar with gold outline icons */}
        <div className="relative z-10 border-t border-[#C8943E]/20 bg-[#061B36]">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-3 divide-x divide-white/10 px-2 py-3 sm:px-6 sm:py-5 lg:px-8">
            {heroFeatures.map((feature) => (
              <div
                key={feature.label}
                className="flex flex-col items-center gap-1.5 px-1.5 text-center sm:gap-2"
              >
                <StepIcon className="h-6 w-6 text-[#C8943E]">{feature.icon}</StepIcon>
                <span className="text-[11px] font-medium leading-tight text-white/90 sm:text-sm">
                  {feature.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 2. HOW WE ARE DIFFERENT — #why-gravitas-edge                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="why-gravitas-edge" className="section-glow relative bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pb-24 lg:pt-24">
          <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C8943E]">
              How It&apos;s Different
            </p>
            <h2 className="mt-4 font-serif-heading text-3xl font-bold leading-tight text-content sm:text-4xl lg:text-5xl">
              Skip the portals. <span className="text-[#C8943E]">Connect Directly.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-content-muted sm:text-lg">
              No &lsquo;Apply Now&rsquo;. Connect Directly with the recruiter, hiring manager or
              consultant hiring for the role.
            </p>
          </div>

          {/* Three steps with icons and arrows */}
          <div className="mx-auto grid max-w-4xl grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-2 sm:gap-4">
            {diffSteps.map((step, i) => (
              <Fragment key={step.title}>
                <div className="card-static flex flex-col items-center rounded-2xl px-1.5 py-3 text-center sm:px-5 sm:py-5 lg:px-6 lg:py-7">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-brand-100 text-[#C8943E] ring-1 ring-inset ring-[#C8943E]/20 sm:h-14 sm:w-14">
                    <StepIcon>{step.icon}</StepIcon>
                  </span>
                  <h3 className="mt-2.5 font-serif-heading text-xs font-bold leading-tight text-content [overflow-wrap:anywhere] sm:mt-4 sm:text-xl">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-content-muted [overflow-wrap:anywhere] sm:mt-2 sm:text-sm">
                    {step.description}
                  </p>
                </div>
                {i < diffSteps.length - 1 && (
                  <span aria-hidden="true" className="flex items-center self-center">
                    {diffArrow}
                  </span>
                )}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Navy benefits panel */}
        <div className="border-t border-[#C8943E]/20 bg-[#061B36]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-8 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8 lg:py-10">
            {diffBenefits.map((benefit) => (
              <div
                key={benefit.label}
                className="flex flex-col items-center gap-2.5 text-center sm:flex-row sm:justify-center sm:gap-3 sm:text-left"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C8943E]/15 text-[#C8943E]">
                  <StepIcon className="h-5 w-5">{benefit.icon}</StepIcon>
                </span>
                <span className="text-sm font-semibold leading-tight text-white sm:text-base">
                  {benefit.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="what-we-do" className="section-glow-navy relative bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,1.1fr)] lg:items-start">
            <div className="max-w-xl">
              <Eyebrow>WHAT GRAVITAS EDGE DOES</Eyebrow>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-content sm:text-4xl">
                What Gravitas Edge does.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-content-muted">
                Good jobs are spread across many channels and are easy to miss. Gravitas Edge finds
                and selects them, sorts them by location and experience level, and gives you the
                application or contact details where available — so you can focus on the jobs that
                fit your search.
              </p>
              <ul className="mt-8 space-y-3">
                {whatWeDoPoints.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-sm font-medium text-content"
                  >
                    <span className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-500/10 p-1 text-emerald-600 dark:text-emerald-400">
                      <CheckAccent className="h-3.5 w-3.5" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {whatWeDoCards.map((card) => (
                <InfoCard key={card.index} {...card} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 4. HOW IT WORKS — #how-it-works                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <HowItWorks />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 5. LIVE FREE PREVIEW — #free-preview                           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {loading ? (
        <section
          id="free-preview"
          className="border-t border-line bg-surface dark:bg-surface-elevated/50"
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          </div>
        </section>
      ) : error ? (
        <section
          id="free-preview"
          className="border-t border-line bg-surface dark:bg-surface-elevated/50"
        >
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <ErrorState message={error} onRetry={load} />
          </div>
        </section>
      ) : (
        <LiveFreePreview
          opportunities={opportunities}
          vaults={vaults}
          loading={false}
          error=""
          onRetry={load}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 6. WHATSAPP FREE CONNECTION #1 — #whatsapp-free                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section
        id="whatsapp-free"
        className="section-glow relative border-t border-line bg-surface-muted"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <WhatsAppChannel
            note={
              <HomeAnchor
                href="#vaults"
                className="font-medium underline underline-offset-2 hover:text-[#8a6524] dark:hover:text-[#E3B968]"
              >
                Explore Opportunity Vaults below →
              </HomeAnchor>
            }
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 7. OPPORTUNITY VAULTS — #vaults                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section
        id="vaults"
        className="section-glow-navy relative border-t border-line bg-surface dark:bg-surface-elevated/50"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <Eyebrow>OPPORTUNITY VAULTS</Eyebrow>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-content sm:text-3xl">
                Find where you fit.
              </h2>
              <p className="mt-2 text-sm text-content-muted sm:text-base">
                Opportunities organised by experience level and location, so you know exactly where
                to look.
              </p>
            </div>
            {user && (
              <Link
                href="/dashboard/vaults"
                className="whitespace-nowrap text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                My vaults →
              </Link>
            )}
          </div>

          {!loading && !error && vaults.length > 0 && (
            <VaultFinder
              vaults={vaults}
              recommended={recommendedVaultIds}
              onRecommendedChange={setRecommendedVaultIds}
            />
          )}

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36" />
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
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
      {/* 9. WHATSAPP FREE CONNECTION #2 — #whatsapp-free-2              */}
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
      {/* 10. TESTIMONIALS — #testimonials                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Testimonials />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 11. FAQ — #faq                                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <FaqSection />
    </div>
  );
}
