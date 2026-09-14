'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchOpportunities, fetchVaults } from '@/lib/services';
import { Opportunity, PaginatedResult, Vault } from '@/lib/types';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui';
import { OpportunityCard, VaultCard, SearchIcon } from '@/components/cards';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/lib/auth';
import Eyebrow from '@/components/marketing/Eyebrow';
import InfoCard from '@/components/marketing/InfoCard';

const NAVY = 'bg-[#0A1730]';

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

const heroRows = [
  { label: 'Opportunities across channels', value: 'Curated' },
  { label: 'Experience & geography', value: 'Structured' },
  { label: 'Available application route', value: 'Presented' },
  { label: 'New opportunity flow', value: 'Updated' },
];

const whyCards = [
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

export default function Home() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([fetchOpportunities({ page: 1, limit: 6 }), fetchVaults()])
      .then(([opps, v]) => {
        setOpportunities((opps as PaginatedResult<Opportunity>).items || []);
        setVaults(v || []);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overflow-hidden">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* HERO — CURATED OPPORTUNITY INTELLIGENCE                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className={`${NAVY} relative`}>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <div>
              <Eyebrow invert>CURATED OPPORTUNITY INTELLIGENCE</Eyebrow>
              <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl">
                A clearer view of opportunities beyond the usual job search.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                Not every opportunity is surfaced consistently across conventional job portals.
                Roles can circulate through hiring teams, recruiters, consultants and professional
                networks, while public listings may not always tell you where the hiring process
                currently stands. Gravitas Edge brings relevant opportunities together in one
                structured, easier-to-assess place.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Link
                  href="/how-it-works"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-400 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1730] sm:w-auto"
                >
                  See How Gravitas Edge Works
                </Link>
                <Link
                  href="/vaults"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1730] sm:w-auto"
                >
                  Explore Opportunity Vaults
                </Link>
              </div>

              <p className="mt-8 flex max-w-xl items-start gap-2.5 text-sm leading-relaxed text-slate-300">
                <span className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-500/10 p-1 text-emerald-400">
                  <CheckAccent className="h-3.5 w-3.5" />
                </span>
                Curated for visibility, not hype. The objective is to help you see relevant
                opportunities and the available route to pursue them more clearly.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white p-7 shadow-xl sm:p-8">
              <Eyebrow>WHAT GRAVITAS EDGE DOES</Eyebrow>
              <h2 className="mt-4 text-2xl font-bold leading-snug tracking-tight text-[#0A1730] sm:text-[1.65rem]">
                Brings fragmented opportunity information into focus.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                The value is not in claiming every opportunity is exclusive. It is in sourcing,
                organising and presenting useful opportunity information in one place.
              </p>
              <dl className="mt-6 border-t border-slate-100">
                {heroRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 border-b border-slate-100 py-3"
                  >
                    <dt className="text-sm text-slate-600">{row.label}</dt>
                    <dd className="text-sm font-semibold text-brand-400">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* WHY GRAVITAS EDGE EXISTS                                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <span className="mb-5 block h-1 w-10 rounded-full bg-brand-400" aria-hidden="true" />
            <h2 className="text-3xl font-extrabold tracking-tight text-content sm:text-4xl">
              Why Gravitas Edge exists.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-content-muted">
              A job search can become unnecessarily fragmented when relevant opportunities are
              spread across different channels, contacts and networks. Gravitas Edge is designed to
              reduce that fragmentation and make the search more deliberate.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {whyCards.map((card) => (
              <InfoCard key={card.index} {...card} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* LATEST OPPORTUNITIES — live data                              */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="border-t border-line bg-surface dark:bg-surface-elevated/50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                Live opportunity flow
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-content">
                Latest Opportunities
              </h2>
              <p className="mt-1 text-sm text-content-muted">
                A sample of the public opportunities currently visible on the platform.
              </p>
            </div>
            <Link
              href="/opportunities"
              className="whitespace-nowrap text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : opportunities.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface dark:bg-surface-elevated">
              <EmptyState
                icon={<SearchIcon className="h-6 w-6" />}
                title="No opportunities yet"
                description="Check back soon — new opportunities are added regularly."
              />
            </div>
          ) : (
            <div className="relative overflow-hidden">
              <div className="latest-marquee flex">
                {[0, 1].map((half) => (
                  <div key={half} className="flex shrink-0 gap-5 pr-5">
                    {opportunities.map((o) => (
                      <div
                        key={`${o.id}-${half}`}
                        className="w-80 shrink-0"
                      >
                        <OpportunityCard opportunity={o} static />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-surface to-transparent"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-surface to-transparent"
                aria-hidden="true"
              />
              <style dangerouslySetInnerHTML={{ __html: `
                .latest-marquee { animation: latest-marquee 36s linear infinite; }
                .latest-marquee:hover { animation-play-state: paused; }
                @keyframes latest-marquee {
                  from { transform: translateX(0); }
                  to { transform: translateX(-50%); }
                }
                @media (prefers-reduced-motion: reduce) {
                  .latest-marquee { animation: none; }
                }
              ` }} />
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* CONTENT VAULTS — live data                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="border-t border-line bg-surface dark:bg-surface-elevated/50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                Members only
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-content">
                Content Vaults
              </h2>
              <p className="mt-1 text-sm text-content-muted">
                Members-only vaults of referrals and premium roles.
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
            <div className="grid gap-5 md:grid-cols-3">
              {vaults.map((v) => (
                <VaultCard key={v.id} vault={v} />
              ))}
            </div>
          )}
        </div>
      </section>
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TESTIMONIALS                                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="bg-[#0A1730]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Eyebrow invert>WHAT SUBSCRIBERS SAY</Eyebrow>
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
    </div>
  );
}
