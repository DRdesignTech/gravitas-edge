'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchVaults, fetchPublicPricing } from '@/lib/services';
import { PricingGroup, Vault } from '@/lib/types';
import { Button, Card, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { VaultIcon } from '@/components/cards';
import { formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import Eyebrow from '@/components/marketing/Eyebrow';
import InfoBanner from '@/components/marketing/InfoBanner';
import ResumeUploadCard from '@/components/marketing/ResumeUploadCard';

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    INDIA: 'INDIA',
    GLOBAL: 'GLOBAL + INDIA',
    MIDDLE_EAST: 'MIDDLE EAST',
    INTERNATIONAL: 'INTERNATIONAL',
    OTHER: 'OTHER',
  };
  return map[type] || type;
}

function getVaultIcon(name: string, type: string): React.ReactNode {
  const n = name.toLowerCase();
  if (n.includes('early') || n.includes('career')) {
    return (
      <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    );
  }
  if (n.includes('management') || n.includes('mid')) {
    return (
      <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    );
  }
  if (n.includes('leadership') || n.includes('senior')) {
    return (
      <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    );
  }
  if (n.includes('executive') || n.includes('c-suite')) {
    return (
      <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l2.3 4.9 5.2.8-3.8 3.7.9 5.3-4.6-2.4-4.6 2.4.9-5.3-3.8-3.7 5.2-.8L12 3.5Z" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={1.8} />
      </svg>
    );
  }
  if (n.includes('remote')) {
    return (
      <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
      </svg>
    );
  }
  if (n.includes('uae') || n.includes('global') || n.includes('middle')) {
    return (
      <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a15.3 15.3 0 014 10 15 15 0 01-4 10 15.3 15.3 0 01-4-10 15 15 0 014-10z" />
      </svg>
    );
  }
  // Default vault icon
  return (
    <svg className="h-5.5 w-5.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

export default function VaultsPage() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [pricing, setPricing] = useState<PricingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([fetchVaults(), fetchPublicPricing()])
      .then(([v, p]) => {
        setVaults(v || []);
        setPricing(p || []);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="overflow-hidden">
      {/* SECTION 1 — NAVY HERO */}
      <section className="bg-[#061B36]">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <Eyebrow invert>OPPORTUNITY VAULTS</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl">
            Choose access that matches your search.
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Each Vault is built around a clear location or experience level. If you have already
            reviewed the live preview, compare the Vaults below and choose the access that best
            matches your location and experience level.
          </p>
        </div>
      </section>

      {/* SECTION 2 — SUBSCRIPTION EXPLANATION */}
      <section className="border-b border-line bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <InfoBanner>
            <strong>What the subscription covers:</strong> You are not paying to apply for a job.
            Your subscription covers the work of finding, checking and organising job information
            conveniently in one place.
            <br />
            <span className="mt-2 block">
              Not yet reviewed the live database?{' '}
              <Link
                href="/opportunities"
                className="font-semibold underline underline-offset-2 hover:text-[#8a6524] dark:hover:text-[#E3B968]"
              >
                Open the Free Preview
              </Link>{' '}
              before subscribing.
            </span>
          </InfoBanner>
        </div>
      </section>

      {/* SECTION 3 — VAULT CARDS */}
      <section className="bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : error ? (
            <Card>
              <ErrorState message={error} onRetry={load} />
            </Card>
          ) : vaults.length === 0 ? (
            <Card>
              <EmptyState
                icon={<VaultIcon className="h-6 w-6" />}
                title="No vaults yet"
                description="Vaults will appear here as they are published."
              />
            </Card>
          ) : (
            <div className="grid gap-6 sm:gap-7 md:grid-cols-2 lg:grid-cols-3">
              {vaults.map((v) => {
                const vPlans = pricing.find((g) => g.vault.id === v.id)?.plans ?? [];
                const maxDiscount = vPlans.reduce(
                  (m, p) => Math.max(m, p.discountPercentage ?? 0),
                  0,
                );
                const target = v.locked
                  ? `/vaults/${v.id}`
                  : `/opportunities?vaultId=${encodeURIComponent(v.id)}`;
                const vaultIcon = getVaultIcon(v.name, v.type);
                return (
                  <article
                    key={v.id}
                    className="group/vault relative flex flex-col overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-surface to-surface-muted transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/60 hover:shadow-card-hover hover:shadow-brand-500/10 dark:from-surface-elevated dark:to-surface dark:hover:border-brand-500/50"
                  >
                    {/* Top accent bar */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600 opacity-0 transition-opacity duration-300 group-hover/vault:opacity-100" />
                    
                    <div className="flex flex-1 flex-col p-6 sm:p-7">
                      {/* Header: Icon, Type badge, Name, Lock status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 ring-1 ring-inset ring-brand-500/10 dark:from-brand-950 dark:to-brand-900 dark:text-brand-300 dark:ring-brand-400/20">
                            {vaultIcon}
                          </div>
                          <div className="min-w-0">
                            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                              {typeLabel(v.type)}
                            </span>
                            <h3 className="mt-1.5 text-lg font-bold tracking-tight text-content truncate">{v.name}</h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {vPlans.length > 0 && maxDiscount > 0 && (
                            <span className="hidden sm:inline-flex shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30">
                              Up to {maxDiscount}% OFF
                            </span>
                          )}
                          {/* Lock/Unlock status badge */}
                          {v.locked ? (
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                              </svg>
                              Locked
                            </span>
                          ) : (
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                              </svg>
                              Unlocked
                            </span>
                          )}
                        </div>
                      </div>

                      {v.description && (
                        <p className="mt-4 text-sm leading-relaxed text-content-muted">{v.description}</p>
                      )}

                      {/* Pricing options */}
                      {vPlans.length > 0 ? (
                        <div className="mt-6 space-y-3">
                          {vPlans.map((p) => (
                            <Link
                              key={p.id}
                              href={v.locked ? `${target}?plan=${p.id}` : target}
                              className="group/tile relative block rounded-2xl border border-line bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/60 hover:bg-brand-50/30 hover:shadow-card hover:shadow-brand-500/5 dark:bg-surface-elevated dark:hover:bg-brand-950/30 dark:hover:border-brand-500/40"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2 min-w-0">
                                  <span className="text-sm font-semibold text-content truncate">{p.durationLabel}</span>
                                  {p.durationDays === 90 && (
                                    <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white dark:bg-brand-500">
                                      Most Popular
                                    </span>
                                  )}
                                </span>
                                {(p.discountPercentage ?? 0) > 0 ? (
                                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30">
                                    {p.discountPercentage}% OFF
                                  </span>
                                ) : (
                                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-content-faint">Standard</span>
                                )}
                              </div>
                              <div className="mt-3 flex items-baseline justify-between gap-3">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-2xl font-extrabold tracking-tight text-content">
                                    {formatMoney(p.discountedPrice ?? p.price, p.currency)}
                                  </span>
                                  <span className="text-xs text-content-faint line-through">
                                    {formatMoney(p.regularPrice, p.currency)}
                                  </span>
                                </div>
                                {(p.discountPercentage ?? 0) > 0 && (
                                  <span className="shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                    Save {formatMoney((p.regularPrice ?? p.discountedPrice) - p.discountedPrice, p.currency)}
                                  </span>
                                )}
                              </div>
                              <div className="mt-4 flex items-center justify-end">
                                <span className="inline-flex translate-y-1 items-center gap-1 text-xs font-bold text-brand-600 opacity-0 transition-all duration-200 group-hover/tile:translate-y-0 group-hover/tile:opacity-100 dark:text-brand-400">
                                  Select <span aria-hidden>→</span>
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-6 text-sm text-content-faint">Pricing available soon.</p>
                      )}

                      {/* Primary action */}
                      <div className="mt-auto pt-6">
                        {v.locked ? (
                          <Link href={`/vaults/${v.id}`}>
                            <Button
                              className="w-full"
                              variant={vPlans.length > 0 ? 'primary' : 'outline'}
                            >
                              View & subscribe
                              <span className="ml-1" aria-hidden="true">→</span>
                            </Button>
                          </Link>
                        ) : (
                          <Link href={target}>
                            <Button className="w-full" variant="primary">
                              View opportunities
                              <span className="ml-1" aria-hidden="true">→</span>
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* SECTIONS 4 & 5 — RESUME + REFERRAL */}
      <section className="border-t border-line bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-6 md:grid-cols-2">
            <ResumeUploadCard />
            <div className="rounded-2xl border border-line bg-surface p-6 dark:bg-surface-elevated">
              <h3 className="text-base font-bold text-content">Subscriber Referral Rewards</h3>
              <p className="mt-2 text-sm leading-relaxed text-content-muted">
                Active subscribers can refer professionals and earn referral rewards. Rewards can be
                redeemed against a future subscription purchase or withdrawn, subject to the
                referral terms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER AREA */}
      <section className="border-t border-line bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-content-muted">
            <Link href="/faq" className="hover:text-content">
              FAQ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}