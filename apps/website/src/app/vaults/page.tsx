'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fetchVaults, fetchPublicPlans } from '@/lib/services';
import { SubscriptionPlan, Vault } from '@/lib/types';
import { Button, Card, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { VaultIcon } from '@/components/cards';
import { formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import Eyebrow from '@/components/marketing/Eyebrow';
import InfoBanner from '@/components/marketing/InfoBanner';
import ResumeUploadCard from '@/components/marketing/ResumeUploadCard';

function durationLabel(days: number): string {
  if (days <= 31) return '1 month';
  if (days <= 95) return '3 months';
  if (days <= 190) return '6 months';
  return `${Math.round(days / 30)} months`;
}

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
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([fetchVaults(), fetchPublicPlans()])
      .then(([v, p]) => {
        setVaults(v || []);
        setPlans(p || []);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const plansByVault = useMemo(() => {
    const map = new Map<string, SubscriptionPlan[]>();
    for (const plan of plans) {
      for (const v of plan.vaults || []) {
        if (!map.has(v.id)) map.set(v.id, []);
        map.get(v.id)!.push(plan);
      }
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.durationDays - b.durationDays);
    }
    return map;
  }, [plans]);

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
            Every Vault is structured around a clear geography or experience segment. If you have
            already reviewed the live preview, compare the Vaults below and choose the access that
            best matches your geography and experience level.
          </p>
        </div>
      </section>

      {/* SECTION 2 — SUBSCRIPTION EXPLANATION */}
      <section className="border-b border-line bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <InfoBanner>
            <strong>What the subscription covers:</strong> You are not paying to apply for a job.
            Your subscription covers the work involved in sourcing, curating, consolidating,
            reviewing and presenting opportunity information conveniently in one place.
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
                const vPlans = plansByVault.get(v.id) || [];
                return (
                  <div
                    key={v.id}
                    className="flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-card dark:bg-surface-elevated"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                      {typeLabel(v.type)}
                    </span>
                    <h3 className="mt-2 text-lg font-bold text-content">{v.name}</h3>
                    {v.description && (
                      <p className="mt-2 text-sm text-content-muted">{v.description}</p>
                    )}

                    {vPlans.length > 0 ? (
                      <div className="mt-5 space-y-2.5">
                        {vPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className="flex items-baseline justify-between gap-3 rounded-xl bg-surface-muted px-4 py-2.5 dark:bg-surface"
                          >
                            <span className="text-sm font-medium text-content">
                              {durationLabel(plan.durationDays)}
                            </span>
                            <span className="text-sm font-bold text-content">
                              {formatMoney(plan.price, plan.currency)}
                            </span>
                          </div>
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
                        <Link href={`/opportunities?vaultId=${encodeURIComponent(v.id)}`}>
                          <Button className="w-full" variant="primary">
                            View opportunities →
                          </Button>
                        </Link>
                      )}
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
