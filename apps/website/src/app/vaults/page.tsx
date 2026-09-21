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
      <section className="bg-[#0A1730]">
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
                className="font-semibold underline underline-offset-2 hover:text-sky-900 dark:hover:text-sky-100"
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {vaults.map((v) => {
                const vPlans = pricing.find((g) => g.vault.id === v.id)?.plans ?? [];
                const maxDiscount = vPlans.reduce(
                  (m, p) => Math.max(m, p.discountPercentage ?? 0),
                  0,
                );
                const target = v.locked
                  ? `/vaults/${v.id}`
                  : `/opportunities?vaultId=${encodeURIComponent(v.id)}`;
                return (
                  <div
                    key={v.id}
                    className="group/vault relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-300/70 hover:shadow-card-hover dark:bg-surface-elevated"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600 opacity-0 transition-opacity duration-300 group-hover/vault:opacity-100" />
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                            <VaultIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                              {typeLabel(v.type)}
                            </span>
                            <h3 className="text-lg font-bold text-content">{v.name}</h3>
                          </div>
                        </div>
                        {vPlans.length > 0 && maxDiscount > 0 && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                            Up to {maxDiscount}% OFF
                          </span>
                        )}
                      </div>
                      {v.description && (
                        <p className="mt-3 text-sm text-content-muted">{v.description}</p>
                      )}

                      {vPlans.length > 0 ? (
                        <div className="mt-5 space-y-3">
                          {vPlans.map((p) => (
                            <Link
                              key={p.id}
                              href={v.locked ? `${target}?plan=${p.id}` : target}
                              className="group/tile block rounded-2xl border border-line bg-surface-muted p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/70 hover:bg-brand-50/40 hover:shadow-card hover:shadow-brand-500/5 dark:bg-surface dark:hover:bg-brand-950/30"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-content">
                                    {p.durationLabel}
                                  </span>
                                  {p.durationDays === 90 && (
                                    <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white dark:bg-brand-500">
                                      Most Popular
                                    </span>
                                  )}
                                </span>
                                {(p.discountPercentage ?? 0) > 0 ? (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                                    {p.discountPercentage}% OFF
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold uppercase tracking-wider text-content-faint">
                                    Standard
                                  </span>
                                )}
                              </div>
                              <div className="mt-2">
                                <span className="text-2xl font-extrabold tracking-tight text-content">
                                  {formatMoney(p.discountedPrice ?? p.price, p.currency)}
                                </span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="text-xs text-content-faint line-through">
                                  {formatMoney(p.regularPrice, p.currency)}
                                </span>
                                {(p.discountPercentage ?? 0) > 0 && (
                                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    Save{' '}
                                    {formatMoney(
                                      (p.regularPrice ?? p.discountedPrice) - p.discountedPrice,
                                      p.currency,
                                    )}
                                  </span>
                                )}
                              </div>
                              <div className="mt-3 flex items-center justify-end">
                                <span className="inline-flex translate-y-1 items-center gap-1 text-xs font-bold text-brand-600 opacity-0 transition-all duration-200 group-hover/tile:translate-y-0 group-hover/tile:opacity-100 dark:text-brand-400">
                                  Select <span aria-hidden>→</span>
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-5 text-sm text-content-faint">Pricing available soon.</p>
                      )}

                      <div className="mt-auto pt-6">
                        {v.locked ? (
                          <Link href={`/vaults/${v.id}`}>
                            <Button
                              className="w-full"
                              variant={vPlans.length > 0 ? 'primary' : 'outline'}
                            >
                              View &amp; subscribe →
                            </Button>
                          </Link>
                        ) : (
                          <Link href={target}>
                            <Button className="w-full" variant="primary">
                              View opportunities →
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* SECTIONS 4 & 5 — RESUME + REFERRAL */}
      <section className="border-t border-line bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
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
