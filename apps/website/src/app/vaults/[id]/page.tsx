'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchVaults, fetchPublicPlans } from '@/lib/services';
import { SubscriptionPlan, Vault } from '@/lib/types';
import { Button, Card, Skeleton, ErrorState } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/lib/auth';
import Eyebrow from '@/components/marketing/Eyebrow';
import InfoBanner from '@/components/marketing/InfoBanner';
import ResumeUploadCard from '@/components/marketing/ResumeUploadCard';

function durationLabel(days: number): string {
  if (days <= 31) return '1 Month';
  if (days <= 95) return '3 Months';
  if (days <= 190) return '6 Months';
  return `${Math.round(days / 30)} Months`;
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

const ACCESS_CHECKLIST = [
  'Full opportunity details available within this Vault',
  'Company or consultancy/source information according to the opportunity source',
  'Relevant recruiter, Hiring Manager, consultant or application details where provided through the source',
  'Regularly added opportunities during your active subscription',
];

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
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

export default function VaultDetailPage() {
  const params = useParams<{ id: string }>();
  const vaultId = params.id;
  const router = useRouter();
  const { user } = useAuth();

  const [vaults, setVaults] = useState<Vault[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([fetchVaults(), fetchPublicPlans()])
      .then(([v, p]) => {
        setVaults(v || []);
        setPlans(p || []);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const vault = useMemo(() => vaults.find((v) => v.id === vaultId) || null, [vaults, vaultId]);

  // If the signed-in user already has access to this Vault (server-computed
  // `locked: false` from their active subscriptions), send them straight to the
  // Vault's opportunities instead of the subscription screen.
  useEffect(() => {
    if (loading) return;
    if (!vault) {
      setCheckingAccess(false);
      return;
    }
    if (user && !vault.locked) {
      router.replace(`/opportunities?vaultId=${encodeURIComponent(vault.id)}`);
      return;
    }
    setCheckingAccess(false);
  }, [loading, vault, user, router]);

  const vaultPlans = useMemo(() => {
    return plans
      .filter((p) => p.vaults?.some((v) => v.id === vaultId))
      .sort((a, b) => a.durationDays - b.durationDays);
  }, [plans, vaultId]);

  useEffect(() => {
    if (vaultPlans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(vaultPlans[0].id);
    }
  }, [vaultPlans, selectedPlanId]);

  const selectedPlan = vaultPlans.find((p) => p.id === selectedPlanId) || null;

  if (loading || checkingAccess) {
    return (
      <div className="overflow-hidden">
        <section className="bg-[#0A1730]">
          <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-24">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-5 h-12 w-96" />
            <Skeleton className="mt-4 h-5 w-[500px] max-w-full" />
          </div>
        </section>
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="overflow-hidden">
        <section className="bg-[#0A1730]">
          <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-24">
            <Eyebrow invert>VAULT DETAIL</Eyebrow>
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Card>
            <ErrorState
              title="Vault not found"
              message={error || 'The vault you are looking for does not exist or is not available.'}
              onRetry={() => window.location.reload()}
            />
          </Card>
        </div>
      </div>
    );
  }

  const checkoutHref = user ? '/dashboard/subscriptions' : '/register';

  return (
    <div className="overflow-hidden">
      {/* SECTION 1 — NAVY HERO */}
      <section className="bg-[#0A1730]">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <Link
            href="/vaults"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-300 hover:text-white"
          >
            <span aria-hidden>←</span> All vaults
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-sky-300">
            {typeLabel(vault.type)}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl">
            {vault.name}
          </h1>
          {vault.description && (
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {vault.description}. Your subscription unlocks the protected details available within
              this Vault.
            </p>
          )}
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            {/* LEFT COLUMN */}
            <div className="space-y-8">
              {/* SECTION 2 — WHAT YOUR ACCESS INCLUDES */}
              <div className="rounded-2xl border border-line bg-surface p-6 dark:bg-surface-elevated sm:p-8">
                <Eyebrow>WHAT YOUR ACCESS INCLUDES</Eyebrow>
                <ul className="mt-5 space-y-3">
                  {ACCESS_CHECKLIST.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-content">
                      <span className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-500/10 p-1 text-emerald-600 dark:text-emerald-400">
                        <CheckIcon className="h-3.5 w-3.5" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 border-t border-line pt-5">
                  <p className="text-xs leading-relaxed text-content-faint">
                    Gravitas Edge does not guarantee interviews, selection or employment. Hiring
                    decisions remain solely with the employer.
                  </p>
                </div>
              </div>

              {/* SECTION 3 — OPTIONAL RESUME */}
              <ResumeUploadCard
                heading="Optional: upload your resume"
                description="Your resume may be considered where Gravitas Edge is directly supporting a relevant recruitment mandate. As platform capabilities evolve, it may also help us improve the relevance of opportunities presented to you."
              />
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* SECTION 4 — PLAN SELECTOR */}
              <div className="rounded-2xl border border-line bg-surface p-6 shadow-card dark:bg-surface-elevated">
                <h2 className="text-lg font-bold text-content">Select your access period</h2>

                {vaultPlans.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {vaultPlans.map((plan) => {
                      const isSelected = plan.id === selectedPlanId;
                      return (
                        <button
                          key={plan.id}
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`flex w-full items-center justify-between rounded-xl border px-5 py-4 text-left transition-colors ${
                            isSelected
                              ? 'border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-950'
                              : 'border-line bg-surface hover:border-brand-200 dark:bg-surface-elevated dark:hover:border-brand-700'
                          }`}
                          aria-pressed={isSelected}
                        >
                          <div>
                            <p className="text-base font-bold text-content">
                              {durationLabel(plan.durationDays)}
                            </p>
                            <p className="mt-0.5 text-sm text-content-muted">{vault.name}</p>
                          </div>
                          <span className="text-lg font-extrabold text-content">
                            {formatMoney(plan.price, plan.currency)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-content-faint">Pricing will be available soon.</p>
                )}

                <div className="mt-6">
                  <Link href={checkoutHref}>
                    <Button className="w-full" size="lg" disabled={!selectedPlan}>
                      Continue to Subscription
                    </Button>
                  </Link>
                </div>
              </div>

              {/* SECTION 5 — STILL DECIDING */}
              <InfoBanner>
                <strong>Still deciding?</strong> Open the{' '}
                <Link
                  href="/opportunities"
                  className="font-semibold underline underline-offset-2 hover:text-sky-900 dark:hover:text-sky-100"
                >
                  Free Preview
                </Link>{' '}
                first. Subscribe only if the current opportunities add value to your search.
              </InfoBanner>

              {/* AFTER ACTIVATION */}
              <div className="rounded-2xl border border-line bg-surface p-6 dark:bg-surface-elevated">
                <p className="text-sm leading-relaxed text-content-muted">
                  After activation, sign in to access the complete Vault directly on the Gravitas
                  Edge website.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-content-muted">
                  Subscriber benefit: your account will also include a referral section where
                  successful referrals can earn rewards redeemable against future subscriptions or
                  eligible for withdrawal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
