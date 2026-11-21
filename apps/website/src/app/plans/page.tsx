'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchPublicPricing, purchasePlan } from '@/lib/services';
import { PricingGroup, PricingPlan } from '@/lib/types';
import { Skeleton, ErrorState, useToast } from '@/components/ui';
import OpportunityVaultCard from '@/components/plans/OpportunityVaultCard';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/lib/auth';
import { shouldShowVaultPlanBanner } from '@/lib/access-routing';
import { formatMoney } from '@/lib/format';
import { VaultGlyph } from '@/components/cards';

const DAYS_PER_MONTH = 30;

function lowestMonthlyEquivalent(plans: PricingPlan[]): number | null {
  const equivalents = plans
    .filter((p) => p.durationDays > 0)
    .map((p) => ((p.discountedPrice ?? p.price) * DAYS_PER_MONTH) / p.durationDays);
  if (equivalents.length === 0) return null;
  return Math.min(...equivalents);
}

function vaultCoverage(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('executive premier')) return 'India + Global Markets';
  if (n.includes('global') || n.includes('uae')) return 'International (Excl. India)';
  if (n.includes('india')) return 'Pan-India Coverage';
  return 'Full Coverage';
}

function vaultExperience(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('early') || n.includes('career')) return '0–5 Years';
  if (n.includes('management') || n.includes('mid')) return '5–10 Years';
  if (n.includes('leadership')) return '10–15 Years';
  if (n.includes('executive') || n.includes('c-suite')) return '15+ Years';
  if (n.includes('global career')) return 'Under 10 Years';
  if (n.includes('global leadership')) return '10+ Years';
  return 'All Seniorities';
}

export default function PlansPage() {
  const { user, hasVaultAccess, hasRvaAccess } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [groups, setGroups] = useState<PricingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [buyingPlanId, setBuyingPlanId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    fetchPublicPricing()
      .then(setGroups)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuickBuy = async (plan: PricingPlan, vaultId: string) => {
    if (!user) {
      window.location.href = '/register';
      return;
    }
    if (buyingPlanId) return;
    setBuyingPlanId(plan.id);
    try {
      const started = await purchasePlan(plan.id, vaultId, undefined, true);
      router.push(
        `/checkout/${started.paymentId}?returnTo=${encodeURIComponent(
          `/opportunities?vaultId=${encodeURIComponent(vaultId)}`,
        )}`,
      );
    } catch (err) {
      setBuyingPlanId(null);
      showToast(getErrorMessage(err), 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-800 dark:bg-[#07172B] dark:text-slate-100">
      {/* SECTION 1 — HIGH-IMPACT EXECUTIVE HERO */}
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
          {/* Breadcrumbs */}
          <div className="mb-4 flex items-center gap-1.5 text-xs text-[#AEB9D6]">
            <Link href="/" className="text-[#F0C27B] hover:text-white transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-white/80">Plans &amp; Pricing</span>
          </div>

          <div className="text-center sm:text-left">
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D6952F]/40 bg-[#D6952F]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#F0C27B] mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F0C27B] animate-pulse" />
              PLANS / PRICING · TRANSPARENT TIERS
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-5xl leading-[1.12]">
              Choose Your{' '}
              <span className="bg-gradient-to-r from-[#F0C27B] via-[#E8D08B] to-[#D6952F] bg-clip-text text-transparent">
                Opportunity Vault
              </span>
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-relaxed text-[#C9D3EA] sm:text-lg">
              Seven curated vaults organized by geographic coverage and leadership seniority.
              Bypass algorithmic black holes to gain verified direct access to hiring managers,
              retained search partners, and pre-market leadership mandates.
            </p>

            {/* Trust Badges Strip (matching redesign prototype) */}
            <div className="mt-8 flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3 text-xs text-white/90">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-sm">
                <svg className="h-3.5 w-3.5 text-[#F0C27B]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Trusted by Professionals
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-sm">
                <svg className="h-3.5 w-3.5 text-[#F0C27B]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" />
                </svg>
                Global Opportunities
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-sm">
                <svg className="h-3.5 w-3.5 text-[#F0C27B]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Secure Payments
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-sm">
                <svg className="h-3.5 w-3.5 text-[#F0C27B]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                Instant Digital Activation
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — ACCESS ALERT & VIEW MODE TOGGLE */}
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          {/* Non-Subscriber Notice */}
          {shouldShowVaultPlanBanner({
            signedIn: !!user,
            hasVaultAccess,
            hasRvaAccess,
          }) && (
            <div className="mb-8 rounded-2xl border border-[#D6952F]/40 bg-[#FFF8EE] p-4 sm:p-5 text-sm leading-relaxed text-[#8A6524] shadow-xs dark:border-[#D6952F]/30 dark:bg-[#091F38] dark:text-[#F0C27B]">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔒</span>
                <div>
                  <strong className="font-bold text-[#061B36] dark:text-white">
                    Unlock Protected Mandates:
                  </strong>{' '}
                  You don&apos;t have an active Vault subscription yet. Choose any plan below to unlock full unredacted contact details and verified application routes.
                </div>
              </div>
            </div>
          )}

          {/* Section Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E9E5DC] pb-5 dark:border-[#1E3557]">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#061B36] dark:text-white">
                Available Opportunity Tiers
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#5B6479] dark:text-slate-300">
                Explore plan options with transparent pricing. Expand any vault to review durations and discount savings.
              </p>
            </div>

            {/* View Mode Toggle: Cards vs Side-by-Side Comparison Table */}
            <div className="flex items-center gap-1.5 rounded-xl border border-[#E9E5DC] bg-white p-1 shadow-xs dark:border-[#1E3557] dark:bg-[#0D2038] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-[#061B36] text-white shadow-xs dark:bg-[#1E3557]'
                    : 'text-[#5B6479] hover:text-[#061B36] dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
                <span>Cards View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === 'table'
                    ? 'bg-[#061B36] text-white shadow-xs dark:bg-[#1E3557]'
                    : 'text-[#5B6479] hover:text-[#061B36] dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
                <span>Side-by-Side Comparison</span>
              </button>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="mt-8">
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-3xl" />
                ))}
              </div>
            ) : error ? (
              <CardError message={error} onRetry={load} />
            ) : groups.length === 0 ? (
              <CardError message="No plans are available right now." onRetry={load} retry={false} />
            ) : viewMode === 'cards' ? (
              /* 1. CARDS VIEW */
              <div className="grid items-start gap-6 lg:gap-8 md:grid-cols-2">
                {groups.map((group) => (
                  <OpportunityVaultCard key={group.vault.id} group={group} defaultExpanded />
                ))}
              </div>
            ) : (
              /* 2. SIDE-BY-SIDE COMPARISON TABLE (Matching showCompare() in redesign prototype) */
              <div className="overflow-hidden rounded-3xl border border-[#E9E5DC] bg-white shadow-sm dark:border-[#1E3557] dark:bg-[#0D2038]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-[#E9E5DC] bg-[#FAF8F5] text-[11px] font-bold uppercase tracking-wider text-[#7E889E] dark:border-[#1E3557] dark:bg-[#081B33] dark:text-slate-400">
                        <th className="py-4 px-6">Opportunity Vault</th>
                        <th className="py-4 px-4">Experience Range</th>
                        <th className="py-4 px-4">Geographic Scope</th>
                        <th className="py-4 px-4">Starting Rate</th>
                        <th className="py-4 px-4">Available Tiers</th>
                        <th className="py-4 px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E9E5DC] dark:divide-[#1E3557]">
                      {groups.map((group) => {
                        const fromMonthly = lowestMonthlyEquivalent(group.plans);
                        const currency = group.plans[0]?.currency ?? 'INR';
                        const cov = vaultCoverage(group.vault.name);
                        const exp = vaultExperience(group.vault.name);
                        const sortedPlans = group.plans.slice().sort((a, b) => a.durationDays - b.durationDays);
                        const primaryPlan = sortedPlans[0];

                        return (
                          <tr
                            key={group.vault.id}
                            className="hover:bg-[#FAF8F5]/60 transition-colors dark:hover:bg-[#0B2342]/40"
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#061B36] text-[#F0C27B] border border-[#D6952F]/30 dark:bg-[#07172B]">
                                  <VaultGlyph name={group.vault.name} className="h-5 w-5" />
                                </span>
                                <div>
                                  <h3 className="font-bold text-[#061B36] dark:text-white text-sm">
                                    {group.vault.name}
                                  </h3>
                                  {group.vault.description && (
                                    <p className="mt-0.5 text-xs text-[#5B6479] dark:text-slate-300 line-clamp-1 max-w-xs">
                                      {group.vault.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 font-medium text-[#061B36] dark:text-white">
                              {exp}
                            </td>
                            <td className="py-4 px-4 text-[#5B6479] dark:text-slate-300">
                              <span className="inline-flex rounded-full bg-[#FAF8F5] border border-[#E9E5DC] px-2.5 py-0.5 text-xs font-semibold text-[#061B36] dark:bg-[#081B33] dark:border-[#1E3557] dark:text-white">
                                {cov}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              {fromMonthly !== null ? (
                                <div>
                                  <span className="text-base font-extrabold text-[#061B36] dark:text-white">
                                    {formatMoney(fromMonthly, currency)}
                                  </span>
                                  <span className="text-xs text-[#7E889E] dark:text-slate-400">/mo</span>
                                </div>
                              ) : (
                                <span className="text-xs text-[#7E889E]">Pricing soon</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-wrap gap-1">
                                {sortedPlans.map((p) => (
                                  <span
                                    key={p.id}
                                    className="inline-flex items-center rounded-md bg-[#FAF8F5] px-2 py-0.5 text-[11px] font-medium text-[#5B6479] border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557] dark:text-slate-300"
                                  >
                                    {p.durationLabel}
                                    {(p.discountPercentage ?? 0) > 0 && (
                                      <span className="ml-1 font-bold text-emerald-600 dark:text-emerald-400">
                                        -{p.discountPercentage}%
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              {primaryPlan ? (
                                <button
                                  type="button"
                                  onClick={() => handleQuickBuy(primaryPlan, group.vault.id)}
                                  disabled={buyingPlanId !== null}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D6952F] to-[#B37E28] px-4 py-2 text-xs font-bold text-white shadow-xs hover:brightness-105 transition disabled:opacity-50 cursor-pointer"
                                >
                                  {buyingPlanId === primaryPlan.id ? 'Connecting…' : 'Subscribe'}
                                  <span aria-hidden="true">→</span>
                                </button>
                              ) : (
                                <Link
                                  href={`/vaults/${group.vault.id}`}
                                  className="text-xs font-bold text-[#D6952F] hover:underline"
                                >
                                  View Vault →
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3 — BUILD YOUR BUNDLE CALLOUT (from redesign prototype) */}
          <div className="mt-14 rounded-3xl border border-[#E9E5DC] bg-gradient-to-br from-[#061B36] to-[#0A2645] p-7 sm:p-10 text-white shadow-xl dark:border-[#1E3557]">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#F0C27B]/40 bg-[#D6952F]/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#F0C27B]">
                  Build Your Bundle · 20% Off
                </span>
                <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  India + Global, One Seamless Checkout
                </h2>
                <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#C9D3EA]">
                  Targeting leadership opportunities across both Indian metros and international hubs? Combine two eligible vaults and save 20% for as long as both stay active.
                </p>
                <p className="mt-2 text-xs text-[#8C9AC0]">
                  Eligible for Leadership &amp; Executive tiers across India and global markets.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="text-[#F0C27B]">✦</span>
                  Multi-Market Career Advantages
                </h3>
                <ul className="mt-4 space-y-3 text-xs sm:text-sm text-[#C9D3EA]">
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#F0C27B] font-bold">✓</span>
                    <span>Single unified billing renewal for both domestic and global mandates</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#F0C27B] font-bold">✓</span>
                    <span>Full unredacted hiring contacts and application routes for both tiers</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#F0C27B] font-bold">✓</span>
                    <span>Automatic 20% recurring discount applied at checkout</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Billing Transparency Note */}
          <div className="mt-8 text-center text-xs text-[#7E889E] dark:text-slate-400">
            Prices shown in INR for India billing addresses. Applicable taxes are shown at checkout. Your billing country, not your physical location, sets the price.
          </div>

          {/* SECTION 4 — ADVISORY & ASSISTANCE CALLOUT */}
          <div className="mt-10 rounded-3xl border border-[#E9E5DC] bg-white p-7 sm:p-9 text-center shadow-sm dark:border-[#1E3557] dark:bg-[#0D2038]">
            <h3 className="text-lg sm:text-xl font-bold text-[#061B36] dark:text-white">
              Have Questions or Need Enterprise Assistance?
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-xs sm:text-sm text-[#5B6479] dark:text-slate-300">
              Our executive advisory team is available to help match you with the ideal Opportunity Vault for your leadership seniority and target geography.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="mailto:enquiry@gravitasedgeconsulting.com"
                className="inline-flex items-center gap-2 rounded-xl bg-[#061B36] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#0A2645] transition dark:bg-[#1E3557] dark:hover:bg-[#25426B]"
              >
                <span>Email Advisory Support</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/faq"
                className="inline-flex items-center gap-2 rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#061B36] hover:bg-white transition dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white"
              >
                <span>Browse FAQ Knowledge Base</span>
              </Link>
              <Link
                href="/opportunities"
                className="inline-flex items-center gap-2 rounded-xl border border-[#D6952F]/40 bg-[#D6952F]/10 px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#8A6524] hover:bg-[#D6952F]/20 transition dark:text-[#F0C27B]"
              >
                <span>Explore Free Preview</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CardError({
  message,
  onRetry,
  retry = true,
}: {
  message: string;
  onRetry: () => void;
  retry?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 dark:bg-surface-elevated">
      <ErrorState
        title="We couldn't load plans"
        message={message}
        onRetry={retry ? onRetry : undefined}
      />
    </div>
  );
}
