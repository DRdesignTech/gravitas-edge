'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
import LiveFreePreview from '@/components/marketing/LiveFreePreview';
import PricingSection from '@/components/marketing/PricingSection';
import WhatsAppChannel from '@/components/marketing/WhatsAppChannel';
import FaqSection from '@/components/marketing/FaqSection';
import HomeAnchor from '@/components/marketing/HomeAnchor';
import { scrollToHash } from '@/lib/scroll';

const NAVY = 'bg-[#0A1730]';
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
    title: 'Hiring is distributed',
    description:
      'Relevant roles may appear through company teams, recruiters, consultants, networks and portals - not through one single channel.',
  },
  {
    index: '02',
    title: 'Context matters',
    description:
      'A role title alone is rarely enough. Geography, experience fit, source and the available application route all matter when deciding where to focus.',
  },
  {
    index: '03',
    title: 'Your time should be focused',
    description:
      'We organise opportunity information so you can assess relevance faster and spend more time on opportunities that deserve your attention.',
  },
];

const whatWeDoPoints = [
  'Curated Opportunities',
  'Organised by Geography and Experience Level',
  'Application Routes Provided',
  'Save Time',
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
      <section id="home" className={`${NAVY} relative scroll-mt-20 overflow-hidden`}>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-[position:center] lg:bg-[position:center_35%]"
          style={{
            backgroundImage: "url('/images/hero.png')",
            backgroundSize: 'cover',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#0A1730]/55 via-[#0A1730]/20 to-transparent"
        />
        {/* Image overlay text on lower portion */}
        <div
          aria-hidden="true"
          className="absolute bottom-8 left-0 right-0 px-4 lg:px-8 lg:bottom-12"
          style={{ background: 'linear-gradient(to top, #0A1730 0%, transparent 60%)' }}
        >
          <div className="mx-auto max-w-7xl">
            <p className="max-w-3xl pl-4 sm:pl-8 text-lg font-semibold leading-snug text-white sm:text-xl">
              More opportunities.<br />
              A wider perspective.
            </p>
          </div>
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-40 lg:pb-64">
          <div className="max-w-3xl">
            <Eyebrow invert>CURATED OPPORTUNITY INTELLIGENCE</Eyebrow>
            <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl">
              A clearer view of opportunities beyond the usual job search.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Not every opportunity reaches the usual job portals. Many roles circulate directly
              through hiring managers, recruiters, consultants, company channels and professional
              networks, making them easy to miss when your search is limited to conventional job
              sites. Gravitas Edge focuses on finding and curating these opportunities, bringing
              relevant roles and available application routes together in one structured place.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <button
                type="button"
                onClick={() => scrollTo('free-preview')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-400 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1730] sm:w-auto"
              >
                Explore Free Opportunities
              </button>
              <button
                type="button"
                onClick={() => scrollTo('how-it-works')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1730] sm:w-auto"
              >
                See How It Works <span aria-hidden="true">↓</span>
              </button>
            </div>

            <p className="mt-8 max-w-xl text-sm leading-relaxed text-slate-300">
              See what is available first. Decide for yourself whether Gravitas Edge adds value to
              your search.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 2. WHY GRAVITAS EDGE — #why-gravitas-edge                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="why-gravitas-edge" className="scroll-mt-20 border-t border-line bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>WHY GRAVITAS EDGE</Eyebrow>
            <p className="mt-6 text-lg leading-relaxed text-content-muted sm:text-xl">
              Job postings often don&apos;t include a way to apply directly — no email, no contact,
              just an invite to reach out. Gravitas Edge closes that gap by giving you direct access
              to the recruiter or hiring manager behind the role.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 3. WHAT GRAVITAS EDGE DOES — #what-we-do                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="what-we-do" className="scroll-mt-20 bg-white dark:bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 lg:pt-24 lg:pb-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,1.1fr)] lg:items-start">
            <div className="max-w-xl">
              <Eyebrow>WHAT GRAVITAS EDGE DOES</Eyebrow>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-content sm:text-4xl">
                What Gravitas Edge does.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-content-muted">
                Relevant opportunities are spread across different channels and can be difficult to
                track consistently. Gravitas Edge identifies, curates and organises them by
                geography and experience level, while providing the available application or contact
                route wherever identified, so you can focus on opportunities relevant to your search.
              </p>
              <ul className="mt-8 space-y-3">
                {whatWeDoPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm font-medium text-content">
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
        <section id="free-preview" className="scroll-mt-20 border-t border-line bg-surface dark:bg-surface-elevated/50">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          </div>
        </section>
      ) : error ? (
        <section id="free-preview" className="scroll-mt-20 border-t border-line bg-surface dark:bg-surface-elevated/50">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <ErrorState message={error} onRetry={load} />
          </div>
        </section>
      ) : (
        <LiveFreePreview
          opportunities={opportunities}
          loading={false}
          error=""
          onRetry={load}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 6. WHATSAPP FREE CONNECTION #1 — #whatsapp-free                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="whatsapp-free" className="scroll-mt-20 border-t border-line bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <WhatsAppChannel
            note={
              <HomeAnchor href="#vaults" className="font-medium underline underline-offset-2 hover:text-emerald-900 dark:hover:text-emerald-100">
                Explore Opportunity Vaults below →
              </HomeAnchor>
            }
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 7. OPPORTUNITY VAULTS — #vaults                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="vaults" className="scroll-mt-20 border-t border-line bg-surface dark:bg-surface-elevated/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <Eyebrow>OPPORTUNITY VAULTS</Eyebrow>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-content sm:text-3xl">
                Found something relevant? Choose access that matches your search.
              </h2>
              <p className="mt-2 text-sm text-content-muted sm:text-base">
                Choose the Opportunity Vault that matches your geography and experience level to
                access the complete opportunity information and available application/contact routes.
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
            <div className="grid gap-5 md:grid-cols-3">
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
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {visibleVaults.map((v) => (
                <VaultCard
                  key={v.id}
                  vault={v}
                  recommended={recommendedVaultIds.has(v.id)}
                />
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
      <section id="whatsapp-free-2" className="scroll-mt-20 border-t border-line bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <WhatsAppChannel
            title="Want to follow the opportunities without subscribing yet?"
            description="Stay connected through the free Gravitas Edge WhatsApp Channel to see selected opportunity updates and what is being added across the Vaults. Full job details and available recruiter, hiring manager, consultant or application contact information are not provided through the free channel. These remain part of the relevant Opportunity Vault access."
            actionLabel="Continue with Free WhatsApp Updates"
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 10. TESTIMONIALS — #testimonials                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section id="testimonials" className="scroll-mt-20 bg-[#0A1730]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Eyebrow invert>WHAT OUR SUBSCRIBERS SAY</Eyebrow>
          <h2 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Real outcomes from professionals who acted before the market moved.
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {/* Testimonial 1 */}
            <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-7 sm:p-8">
              <span className="mb-5 inline-flex w-fit items-center rounded-full bg-emerald-500/15 px-3.5 py-1 text-xs font-semibold tracking-wide text-emerald-300">
                45% Pay Jump
              </span>
              <blockquote className="flex-1 text-base leading-relaxed text-slate-200 sm:text-lg">
                &ldquo;I found a Lead PM role 3 weeks before it was posted publicly on LinkedIn.
                Applied directly to the VP via the email provided in the Gravitas Vault, and was
                offered India-competitive premium equity + a 45% pay bump.&rdquo;
              </blockquote>
              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="text-sm font-bold text-white">Simran Khurana</p>
                <p className="mt-0.5 text-sm text-slate-400">
                  Lead Product Manager @ FinTech Growth Scale-Up
                </p>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-7 sm:p-8">
              <span className="mb-5 inline-flex w-fit items-center rounded-full bg-sky-500/15 px-3.5 py-1 text-xs font-semibold tracking-wide text-sky-300">
                Tax-Free UAE Relocation
              </span>
              <blockquote className="flex-1 text-base leading-relaxed text-slate-200 sm:text-lg">
                &ldquo;Moving to Dubai was my goal. The Middle East Vault gave me the direct
                headhunter list and active pre-market roles. I contacted the talent partner directly
                and landed a key tax-free package without applying blindly on portals.&rdquo;
              </blockquote>
              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="text-sm font-bold text-white">Adil Mahmood</p>
                <p className="mt-0.5 text-sm text-slate-400">
                  Director of Infrastructure @ Enterprise SaaS (Dubai)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 11. FAQ — #faq                                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <FaqSection />
    </div>
  );
}