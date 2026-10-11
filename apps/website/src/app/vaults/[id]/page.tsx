'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchVaults, fetchPublicPricing } from '@/lib/services';
import { PricingGroup, PricingPlan, Vault } from '@/lib/types';
import { Button, Card, Skeleton, ErrorState } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/lib/auth';
import Eyebrow from '@/components/marketing/Eyebrow';
import InfoBanner from '@/components/marketing/InfoBanner';
import ResumeUploadCard from '@/components/marketing/ResumeUploadCard';
import PlanCheckoutModal from '@/components/checkout/PlanCheckoutModal';

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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="shrink-0 text-content-faint">{label}</dt>
      <dd className="text-right font-medium text-content">{value}</dd>
    </div>
  );
}

export default function VaultDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const vaultId = params.id;
  const router = useRouter();
  const { user } = useAuth();

  const [vaults, setVaults] = useState<Vault[]>([]);
  const [pricing, setPricing] = useState<PricingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [checkoutConsent, setCheckoutConsent] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([fetchVaults(), fetchPublicPricing()])
      .then(([v, p]) => {
        setVaults(v || []);
        setPricing(p || []);
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

  const vaultPlans = useMemo<PricingPlan[]>(() => {
    return (pricing.find((g) => g.vault.id === vaultId)?.plans ?? [])
      .slice()
      .sort((a, b) => a.durationDays - b.durationDays);
  }, [pricing, vaultId]);

  useEffect(() => {
    if (vaultPlans.length > 0 && !selectedPlanId) {
      const requestedPlanId = searchParams.get('plan');
      const preferred = requestedPlanId
        ? (vaultPlans.find((p) => p.id === requestedPlanId) ?? null)
        : null;
      setSelectedPlanId((preferred ?? vaultPlans[0]).id);
    }
  }, [vaultPlans, selectedPlanId, searchParams]);

  const selectedPlan = vaultPlans.find((p) => p.id === selectedPlanId) || null;

  const handleCheckout = () => {
    if (!user) {
      window.location.href = '/register';
      return;
    }
    setCheckoutOpen(true);
  };

  if (loading || checkingAccess) {
    return (
      <div className="overflow-hidden">
        <section className="bg-[#061B36]">
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
        <section className="bg-[#061B36]">
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

  return (
    <div className="overflow-hidden">
      {/* SECTION 1 — NAVY HERO */}
      <section className="bg-[#061B36]">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <Link
            href="/vaults"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#C8943E] hover:text-white"
          >
            <span aria-hidden>←</span> All vaults
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#C8943E]">
            {typeLabel(vault.type)}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl">
            {vault.name}
          </h1>
          {vault.description && (
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {vault.description}. Your subscription unlocks the protected details inside this
              Vault.
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
                description="Your resume may be considered where Gravitas Edge is directly involved in a company's recruitment for a relevant role. As the platform grows, it may also help us show you more relevant opportunities."
              />
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* SECTION 4 — PLAN SELECTOR */}
              <div className="rounded-2xl border border-line bg-surface p-6 card-static dark:bg-surface-elevated">
                <h2 className="text-lg font-bold text-content">Select your access period</h2>

                {vaultPlans.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {vaultPlans.map((plan) => {
                      const isSelected = plan.id === selectedPlanId;
                      const hasDiscount = (plan.discountPercentage ?? 0) > 0;
                      const savings =
                        hasDiscount && plan.regularPrice
                          ? plan.regularPrice - (plan.discountedPrice ?? plan.price)
                          : 0;
                      return (
                        <button
                          key={plan.id}
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border px-5 py-4 text-left transition-colors ${
                            isSelected
                              ? 'border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-950'
                              : 'border-line bg-surface hover:border-brand-200 dark:bg-surface-elevated dark:hover:border-brand-700'
                          }`}
                          aria-pressed={isSelected}
                        >
                          <div>
                            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-base font-bold text-content">
                              {plan.durationLabel}
                              {plan.durationDays === 90 && (
                                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white dark:bg-brand-500">
                                  Most Popular
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 text-sm text-content-muted">{vault.name}</p>
                            {hasDiscount && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                                  {plan.discountPercentage}% OFF
                                </span>
                                {savings > 0 && (
                                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    Save {formatMoney(savings, plan.currency)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="flex shrink-0 flex-col items-end">
                            {hasDiscount && (
                              <span className="text-xs text-content-faint line-through">
                                {formatMoney(plan.regularPrice, plan.currency)}
                              </span>
                            )}
                            <span className="text-lg font-extrabold text-content">
                              {formatMoney(plan.discountedPrice ?? plan.price, plan.currency)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-content-faint">Pricing will be available soon.</p>
                )}

                {selectedPlan && (
                  <div className="mt-6 border-t border-line pt-5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-content-faint">
                      Before you continue
                    </h3>
                    <dl className="mt-4 space-y-2.5">
                      <SummaryRow label="Selected Vault" value={vault.name} />
                      <SummaryRow
                        label="Scope"
                        value={[
                          typeLabel(vault.type),
                          ...(vault.experienceLevels?.length
                            ? vault.experienceLevels.map((l) => l.name)
                            : []),
                        ].join(' · ')}
                      />
                      <SummaryRow
                        label="Subscription duration"
                        value={selectedPlan.durationLabel}
                      />
                      {(selectedPlan.discountPercentage ?? 0) > 0 && (
                        <>
                          <SummaryRow
                            label="Regular price"
                            value={formatMoney(selectedPlan.regularPrice, selectedPlan.currency)}
                          />
                          <SummaryRow
                            label="Discount"
                            value={`${selectedPlan.discountPercentage}% (save ${formatMoney(
                              (selectedPlan.regularPrice ?? 0) -
                                (selectedPlan.discountedPrice ?? selectedPlan.price),
                              selectedPlan.currency,
                            )})`}
                          />
                        </>
                      )}
                      <SummaryRow
                        label="Total payable amount"
                        value={formatMoney(
                          selectedPlan.discountedPrice ?? selectedPlan.price,
                          selectedPlan.currency,
                        )}
                      />
                      <SummaryRow
                        label="Taxes"
                        value="Applicable taxes, if any, will be shown and charged at payment."
                      />
                      <SummaryRow
                        label="Auto-renewal"
                        value="Not applicable — this subscription does not auto-renew and access ends at expiry."
                      />
                      <SummaryRow
                        label="Access includes"
                        value="Selected employment opportunities in the chosen Vault with the relevant application or contact details, plus new opportunities added during your active period."
                      />
                      <SummaryRow
                        label="Access activation"
                        value="Access is activated after successful payment confirmation. If access is not provided within a reasonable period after successful payment, contact support promptly."
                      />
                    </dl>
                    <p className="mt-4 text-sm leading-relaxed text-content-muted">
                      Fees are generally non-refundable once Vault access has been activated, except
                      where a refund or other remedy is required by applicable law or provided under
                      the{' '}
                      <Link
                        href="/refund-policy"
                        className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
                      >
                        Refund & Cancellation Policy
                      </Link>
                      . See also our{' '}
                      <Link
                        href="/terms-and-conditions"
                        className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
                      >
                        Terms & Conditions
                      </Link>
                      .
                    </p>
                  </div>
                )}

                <div className="mt-5">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 transition-colors">
                    <input
                      type="checkbox"
                      checked={checkoutConsent}
                      onChange={(e) => setCheckoutConsent(e.target.checked)}
                      required
                      className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                    />
                    <span className="text-sm leading-relaxed text-content-muted">
                      I have read and agree to the{' '}
                      <Link
                        href="/terms-and-conditions"
                        className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
                      >
                        Terms & Conditions
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/refund-policy"
                        className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
                      >
                        Refund & Cancellation Policy
                      </Link>
                      . I understand that digital Vault access may be activated after successful
                      payment and that subscription fees are generally non-refundable once access
                      has been activated, except where a refund or other remedy is required by
                      applicable law or provided under the Refund & Cancellation Policy.
                    </span>
                  </label>
                </div>

                <div className="mt-6">
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={!selectedPlan || !checkoutConsent}
                    onClick={handleCheckout}
                  >
                    Continue to Payment
                  </Button>
                  {selectedPlan && !checkoutConsent && (
                    <p className="mt-2 text-center text-xs text-content-faint">
                      Please accept the Terms & Conditions and Refund & Cancellation Policy to
                      continue.
                    </p>
                  )}
                </div>
              </div>

              {/* SECTION 5 — STILL DECIDING */}
              <InfoBanner>
                <strong>Still deciding?</strong> Open the{' '}
                <Link
                  href="/opportunities"
                  className="font-semibold underline underline-offset-2 hover:text-[#8a6524] dark:hover:text-[#E3B968]"
                >
                  Free Preview
                </Link>{' '}
                first. Subscribe only if the current opportunities add value to your search.
              </InfoBanner>

              {/* AFTER ACTIVATION */}
              <div className="rounded-2xl border border-line bg-surface p-6 dark:bg-surface-elevated">
                <p className="text-sm leading-relaxed text-content-muted">
                  After activation, sign in to access the full Vault directly on the Gravitas Edge
                  website.
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

      {selectedPlan && (
        <PlanCheckoutModal
          plan={selectedPlan}
          vaultName={vault.name}
          vaultId={vault.id}
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          returnTo={`/opportunities?vaultId=${encodeURIComponent(vault.id)}`}
        />
      )}
    </div>
  );
}
