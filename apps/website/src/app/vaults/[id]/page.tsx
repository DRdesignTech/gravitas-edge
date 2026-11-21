'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchVaults, fetchPublicPricing, purchasePlan } from '@/lib/services';
import { PricingGroup, PricingPlan, Vault } from '@/lib/types';
import { Card, ErrorState, Skeleton, useToast } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/lib/auth';
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
      strokeWidth={2.4}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4 py-2.5 border-b border-[#E9E5DC]/70 dark:border-[#1E3557]/70 text-xs sm:text-sm last:border-b-0">
      <dt className="shrink-0 text-[#7E889E] dark:text-slate-400 font-medium sm:w-44">{label}</dt>
      <dd className="text-left sm:text-right font-medium text-[#061B36] dark:text-white leading-relaxed">{value}</dd>
    </div>
  );
}

export default function VaultDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const vaultId = params.id;
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [vaults, setVaults] = useState<Vault[]>([]);
  const [pricing, setPricing] = useState<PricingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [checkoutConsent, setCheckoutConsent] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

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

  const handleCheckout = async () => {
    if (!user) {
      window.location.href = '/register';
      return;
    }
    if (!selectedPlan || !vault || purchasing) return;
    setPurchasing(true);
    try {
      const started = await purchasePlan(selectedPlan.id, vault.id);
      router.push(
        `/checkout/${started.paymentId}?returnTo=${encodeURIComponent(
          `/opportunities?vaultId=${encodeURIComponent(vault.id)}`,
        )}`,
      );
    } catch (err) {
      setPurchasing(false);
      showToast(getErrorMessage(err), 'error');
    }
  };

  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#07172B]">
        <section className="relative overflow-hidden bg-gradient-to-b from-[#061B36] via-[#092244] to-[#0A2645] pb-16 pt-14 text-white isolate">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
            <Skeleton className="h-4 w-28 bg-white/10" />
            <Skeleton className="mt-4 h-6 w-40 rounded-full bg-white/10" />
            <Skeleton className="mt-4 h-12 w-80 max-w-full bg-white/10" />
            <Skeleton className="mt-4 h-5 w-[600px] max-w-full bg-white/10" />
          </div>
        </section>
        <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
            <Skeleton className="h-[480px] rounded-3xl" />
            <Skeleton className="h-[600px] rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#07172B]">
        <section className="relative overflow-hidden bg-gradient-to-b from-[#061B36] via-[#092244] to-[#0A2645] pb-14 pt-14 text-white isolate">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
            <Link
              href="/vaults"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F0C27B] hover:text-white transition-colors"
            >
              <span aria-hidden>←</span> Back to all vaults
            </Link>
            <h1 className="mt-3 text-3xl font-extrabold text-white">Vault Not Found</h1>
          </div>
        </section>
        <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 lg:px-8">
          <Card>
            <ErrorState
              title="Vault not available"
              message={error || 'The vault you are looking for does not exist or has been retired.'}
              onRetry={() => window.location.reload()}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-800 dark:bg-[#07172B] dark:text-slate-100">
      {/* SECTION 1 — EXECUTIVE HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#061B36] via-[#092244] to-[#0A2645] pb-16 pt-14 text-white isolate sm:pb-20 sm:pt-18">
        {/* Ambient background glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#15803D]/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-[#D6952F]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:16px_16px]"
        />

        <div className="relative mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs & Back Link */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#AEB9D6]">
            <div className="flex items-center gap-1.5">
              <Link href="/" className="text-[#F0C27B] hover:text-white transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link href="/vaults" className="text-[#F0C27B] hover:text-white transition-colors">
                Opportunity Vaults
              </Link>
              <span>/</span>
              <span className="text-white/80 truncate max-w-[200px] sm:max-w-xs">{vault.name}</span>
            </div>

            <Link
              href="/vaults"
              className="inline-flex items-center gap-1.5 font-semibold text-[#F0C27B] hover:text-white transition-colors"
            >
              <span aria-hidden>←</span> All vaults
            </Link>
          </div>

          <div className="mt-2">
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D6952F]/40 bg-[#D6952F]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#F0C27B] mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F0C27B] animate-pulse" />
              {typeLabel(vault.type)} VAULT ACCESS
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-5xl leading-[1.12]">
              {vault.name}
            </h1>

            {vault.description && (
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#C9D3EA] sm:text-lg">
                {vault.description}. Your subscription unlocks the protected details inside this Vault.
              </p>
            )}

            {/* Quick Trust Badges Strip */}
            <div className="mt-7 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-white/90">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-sm">
                <svg className="h-3.5 w-3.5 text-[#F0C27B]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Verified Decision-Maker Contacts
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-sm">
                <svg className="h-3.5 w-3.5 text-[#F0C27B]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                Instant Digital Activation
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-sm">
                <svg className="h-3.5 w-3.5 text-[#F0C27B]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Zero Auto-Renew Lock-In
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — MAIN TWO-COLUMN CONTENT */}
      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_440px] items-start">
            {/* LEFT COLUMN — VALUE & ACCESS DETAILS */}
            <div className="order-2 space-y-8 lg:order-1">
              {/* ACCESS INCLUSIONS CARD */}
              <div className="relative overflow-hidden rounded-3xl border border-[#E9E5DC] bg-white p-7 sm:p-9 shadow-sm dark:border-[#1E3557] dark:bg-[#0D2038]">
                {/* Subtle architectural ambient accent */}
                <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#FAF0DC]/60 blur-2xl dark:bg-[#D6952F]/10" />

                <div className="relative">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#D6952F] dark:text-[#F0C27B]">
                    WHAT YOUR ACCESS INCLUDES
                  </span>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#061B36] dark:text-white">
                    Protected Vault Access &amp; Mandates
                  </h2>

                  <ul className="mt-6 space-y-3.5">
                    {ACCESS_CHECKLIST.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-4 text-sm text-[#061B36] dark:border-[#1E3557] dark:bg-[#081B33] dark:text-slate-200"
                      >
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <CheckIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="leading-relaxed font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Independent hiring disclaimer */}
                  <div className="mt-6 border-t border-[#E9E5DC] pt-5 dark:border-[#1E3557]">
                    <p className="text-xs leading-relaxed text-[#7E889E] dark:text-slate-400">
                      Gravitas Edge does not guarantee interviews, selection or employment. Hiring
                      decisions remain solely with the employer.
                    </p>
                  </div>
                </div>
              </div>

              {/* BEFORE YOU CONTINUE (MOVED HERE INSTEAD OF THE ADVANTAGE PILLARS) */}
              {selectedPlan && (
                <div className="rounded-3xl border border-[#E9E5DC] bg-white p-7 sm:p-9 shadow-sm dark:border-[#1E3557] dark:bg-[#0D2038]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#D6952F] dark:text-[#F0C27B]">
                    Order Terms &amp; Scope
                  </span>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#061B36] dark:text-white">
                    Before you continue
                  </h2>

                  <dl className="mt-6 rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-4 sm:p-5 dark:border-[#1E3557] dark:bg-[#081B33]">
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
                      value={
                        <span className="text-base font-extrabold text-[#D6952F] dark:text-[#F0C27B]">
                          {formatMoney(
                            selectedPlan.discountedPrice ?? selectedPlan.price,
                            selectedPlan.currency,
                          )}
                        </span>
                      }
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

                  <p className="mt-5 text-xs sm:text-sm leading-relaxed text-[#7E889E] dark:text-slate-400">
                    Fees are generally non-refundable once Vault access has been activated, except
                    where a refund or other remedy is required by applicable law or provided under
                    the{' '}
                    <Link
                      href="/refund-policy"
                      className="font-medium text-[#D6952F] underline underline-offset-2 hover:text-[#B37E28] dark:text-[#F0C27B]"
                    >
                      Refund &amp; Cancellation Policy
                    </Link>
                    . See also our{' '}
                    <Link
                      href="/terms-and-conditions"
                      className="font-medium text-[#D6952F] underline underline-offset-2 hover:text-[#B37E28] dark:text-[#F0C27B]"
                    >
                      Terms &amp; Conditions
                    </Link>
                    .
                  </p>
                </div>
              )}

              {/* OPTIONAL RESUME UPLOAD */}
              <div>
                <ResumeUploadCard
                  heading="Optional: upload your resume"
                  description="Your resume may be considered where Gravitas Edge is directly involved in a company's recruitment for a relevant role. As the platform grows, it may also help us show you more relevant opportunities."
                />
              </div>
            </div>

            {/* RIGHT COLUMN — STICKY CHECKOUT & PLAN SELECTION */}
            <div className="order-1 space-y-6 lg:order-2 lg:sticky lg:top-24">
              {/* PLAN SELECTION & CHECKOUT CARD */}
              <div className="rounded-3xl border border-[#E9E5DC] bg-white p-6 sm:p-7 shadow-md dark:border-[#1E3557] dark:bg-[#0D2038]">
                <div className="flex items-center justify-between gap-2 border-b border-[#E9E5DC] pb-4 dark:border-[#1E3557]">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#061B36] dark:text-white">
                      Select your access period
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                    Instant Access
                  </span>
                </div>

                {/* Plan Options */}
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
                          type="button"
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`relative flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'border-[#D6952F] bg-gradient-to-r from-[#FFFDF9] to-[#FBF5EB] shadow-sm ring-2 ring-[#D6952F]/20 dark:border-[#F0C27B] dark:from-[#091F38] dark:to-[#07172B] dark:ring-[#F0C27B]/20'
                              : 'border-[#E9E5DC] bg-[#FAF8F5] hover:border-[#D6952F]/60 hover:bg-white dark:border-[#1E3557] dark:bg-[#081B33] dark:hover:bg-[#0A2446]'
                          }`}
                          aria-pressed={isSelected}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Custom Radio Circle */}
                            <span
                              className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                isSelected
                                  ? 'border-[#D6952F] bg-[#D6952F]'
                                  : 'border-[#C8CED9] bg-white dark:border-slate-600 dark:bg-[#081B33]'
                              }`}
                            >
                              {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </span>

                            <div className="min-w-0">
                              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-bold text-[#061B36] dark:text-white">
                                <span>{plan.durationLabel}</span>
                                {(plan.durationDays === 90 || plan.durationDays === 180) && (
                                  <span className="rounded-full bg-gradient-to-r from-[#D6952F] to-[#B37E28] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                    Most Popular
                                  </span>
                                )}
                              </p>
                              <p className="mt-0.5 text-xs text-[#7E889E] dark:text-slate-400 truncate">
                                {vault.name}
                              </p>

                              {hasDiscount && (
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-400/30">
                                    {plan.discountPercentage}% OFF
                                  </span>
                                  {savings > 0 && (
                                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      Save {formatMoney(savings, plan.currency)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <span className="flex shrink-0 flex-col items-end">
                            {hasDiscount && (
                              <span className="text-xs text-[#8A95A5] dark:text-slate-400 line-through">
                                {formatMoney(plan.regularPrice, plan.currency)}
                              </span>
                            )}
                            <span className="text-lg font-extrabold text-[#061B36] dark:text-white">
                              {formatMoney(plan.discountedPrice ?? plan.price, plan.currency)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[#7E889E] dark:text-slate-400">
                    Pricing will be available soon.
                  </p>
                )}

                {/* Quick Payable Summary */}
                {selectedPlan && (
                  <div className="mt-5 rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-4 dark:border-[#1E3557] dark:bg-[#081B33]">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-bold text-[#061B36] dark:text-white">
                        Total Payable ({selectedPlan.durationLabel})
                      </span>
                      <span className="text-xl font-extrabold text-[#D6952F] dark:text-[#F0C27B]">
                        {formatMoney(
                          selectedPlan.discountedPrice ?? selectedPlan.price,
                          selectedPlan.currency,
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Consent Checkbox */}
                <div className="mt-5">
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E9E5DC] bg-[#FAF8F5] p-3.5 transition-colors hover:border-[#D6952F]/40 dark:border-[#1E3557] dark:bg-[#081B33]">
                    <input
                      type="checkbox"
                      checked={checkoutConsent}
                      onChange={(e) => setCheckoutConsent(e.target.checked)}
                      required
                      className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#D6952F]"
                    />
                    <span className="text-xs sm:text-sm leading-relaxed text-[#5B6479] dark:text-slate-300">
                      I have read and agree to the{' '}
                      <Link
                        href="/terms-and-conditions"
                        className="font-medium text-[#D6952F] underline underline-offset-2 hover:text-[#B37E28] dark:text-[#F0C27B]"
                      >
                        Terms &amp; Conditions
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/refund-policy"
                        className="font-medium text-[#D6952F] underline underline-offset-2 hover:text-[#B37E28] dark:text-[#F0C27B]"
                      >
                        Refund &amp; Cancellation Policy
                      </Link>
                      . I understand that digital Vault access may be activated after successful
                      payment and that subscription fees are generally non-refundable once access
                      has been activated, except where a refund or other remedy is required by
                      applicable law or provided under the Refund &amp; Cancellation Policy.
                    </span>
                  </label>
                </div>

                {/* Primary Checkout CTA Button */}
                <div className="mt-6">
                  <button
                    type="button"
                    disabled={!selectedPlan || !checkoutConsent || purchasing}
                    onClick={handleCheckout}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D6952F] via-[#C8943E] to-[#B37E28] px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:brightness-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    {purchasing ? (
                      <>
                        <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Connecting to Checkout...</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 text-white/90" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        <span>Continue to Payment</span>
                        <span aria-hidden="true">→</span>
                      </>
                    )}
                  </button>

                  {selectedPlan && !checkoutConsent && (
                    <p className="mt-2 text-center text-xs text-[#7E889E] dark:text-slate-400">
                      Please accept the Terms &amp; Conditions and Refund &amp; Cancellation Policy to
                      continue.
                    </p>
                  )}
                </div>
              </div>

              {/* REASSURANCE / FREE PREVIEW CARD */}
              <div className="rounded-2xl border border-[#D6952F]/30 bg-gradient-to-r from-[#FFFDF9] to-[#FBF5EB] p-5 shadow-xs dark:border-[#D6952F]/20 dark:from-[#091F38] dark:to-[#07172B]">
                <div className="flex items-start gap-3">
                  <span className="text-base">💡</span>
                  <p className="text-xs sm:text-sm leading-relaxed text-[#5B6479] dark:text-slate-300">
                    <strong className="text-[#061B36] dark:text-white">Still deciding?</strong> Open the{' '}
                    <Link
                      href="/opportunities"
                      className="font-semibold text-[#8A6524] underline underline-offset-2 hover:text-[#5B3E12] dark:text-[#F0C27B]"
                    >
                      Free Preview
                    </Link>{' '}
                    first. Subscribe only if the current opportunities add value to your search.
                  </p>
                </div>
              </div>

              {/* AFTER ACTIVATION GUIDANCE */}
              <div className="rounded-2xl border border-[#E9E5DC] bg-white p-5 sm:p-6 shadow-sm dark:border-[#1E3557] dark:bg-[#0D2038]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#D6952F] dark:text-[#F0C27B]">
                  After Activation
                </h4>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#5B6479] dark:text-slate-300">
                  After activation, sign in to access the full Vault directly on the Gravitas Edge
                  website.
                </p>
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#5B6479] dark:text-slate-300 border-t border-[#E9E5DC]/70 pt-3 dark:border-[#1E3557]/70">
                  <strong className="text-[#061B36] dark:text-white">Subscriber benefit:</strong> your account will also include a referral section where
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
