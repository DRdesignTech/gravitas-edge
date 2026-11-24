'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import {
  HiArrowRight,
  HiArrowTopRightOnSquare,
  HiBolt,
  HiCalendar,
  HiCheck,
  HiCheckCircle,
  HiClock,
  HiCreditCard,
  HiGift,
  HiLockClosed,
  HiLockOpen,
  HiQuestionMarkCircle,
  HiReceiptPercent,
  HiShieldCheck,
  HiSparkles,
  HiTag,
} from 'react-icons/hi2';
import { useAuth } from '@/lib/auth';
import { fetchMySubscriptions, fetchRvaAccess } from '@/lib/services';
import { RvaAccessInfo, RvaSubscriptionSummary, Subscription } from '@/lib/types';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusBadge,
} from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import RvaSubscriptionCard from '../RvaSubscriptionCard';

function daysRemaining(endDate?: string | null): number {
  if (!endDate) return 0;
  const end = new Date(endDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / 86400000));
}

function isSubscriptionActive(s: Subscription): boolean {
  const status = (s.effectiveStatus || s.status || '').toLowerCase();
  if (status === 'cancelled' || status === 'expired' || status === 'terminated') {
    return false;
  }
  if (s.endDate) {
    return new Date(s.endDate).getTime() > Date.now();
  }
  return status === 'active';
}

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [rvaAccess, setRvaAccess] = useState<RvaAccessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([fetchMySubscriptions(), fetchRvaAccess()])
      .then(([subs, rva]) => {
        setSubscriptions(Array.isArray(subs) ? subs : []);
        setRvaAccess(rva ?? null);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Separate active vs past subscriptions
  const activeSubs = subscriptions.filter(isSubscriptionActive);
  const pastSubs = subscriptions.filter((s) => !isSubscriptionActive(s));
  const rvaSub: RvaSubscriptionSummary | null = rvaAccess?.subscription ?? null;
  const hasRvaSub = rvaAccess?.hasAccess === true && rvaSub !== null;

  // Aggregate stats
  const totalActivePlans = activeSubs.length + (hasRvaSub ? 1 : 0);
  const totalUnlockedVaults = Array.from(
    new Set(
      activeSubs.flatMap((s) => (s.vaultAccess || []).map((va) => va.vaultName || va.vaultId)),
    ),
  );

  return (
    <div className="space-y-8">
      {/* ─────────────────────────────────────────────────────────────
          PAGE HEADER
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E9E5DC] pb-6 dark:border-[#1E3557]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#D6952F] dark:text-[#F0C27B]">
              Vault Access &amp; Entitlements
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs text-[#8C9AC0]">{user?.email}</span>
          </div>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#061B36] dark:text-white">
            My Subscriptions
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400 max-w-2xl">
            Manage your active Opportunity Vault access plans, unmasked contact quotas, and subscription term renewals.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/plans">
            <Button
              size="sm"
              className="bg-[#D6952F] hover:bg-[#C8842D] text-[#061B36] font-bold text-xs inline-flex items-center gap-1.5"
            >
              <span>Explore Vault Plans</span>
              <HiArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" variant="outline" className="text-xs font-semibold">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <>
          {/* ─────────────────────────────────────────────────────────────
              METRICS SUMMARY ROW
              ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-[#E9E5DC] bg-white p-4 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                Active Plans
              </span>
              <p className="mt-1 text-2xl font-bold text-[#061B36] dark:text-white">
                {totalActivePlans}
              </p>
              <p className="mt-0.5 text-[11px] text-[#5B6479] dark:text-slate-400">
                {totalActivePlans > 0 ? 'Full mandate access active' : 'No active subscriptions'}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E9E5DC] bg-white p-4 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                Unlocked Vaults
              </span>
              <p className="mt-1 text-2xl font-bold text-[#D6952F] dark:text-[#F0C27B]">
                {totalUnlockedVaults.length}
              </p>
              <p className="mt-0.5 text-[11px] text-[#5B6479] dark:text-slate-400">
                {totalUnlockedVaults.length > 0
                  ? `${totalUnlockedVaults.length} regional sectors unlocked`
                  : 'Locked to previews'}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E9E5DC] bg-white p-4 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                Recruiter Direct Contact
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    totalActivePlans > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                  }`}
                />
                <p className="text-sm font-bold text-[#061B36] dark:text-white">
                  {totalActivePlans > 0 ? 'Unmasked & Live' : 'Masked (Preview)'}
                </p>
              </div>
              <p className="mt-0.5 text-[11px] text-[#5B6479] dark:text-slate-400">
                {totalActivePlans > 0 ? 'Direct phone & email enabled' : 'Subscribe to unmask'}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E9E5DC] bg-white p-4 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                Access Guarantee
              </span>
              <div className="mt-1 flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <HiShieldCheck className="h-5 w-5" />
                <span className="text-sm font-bold">Confidential</span>
              </div>
              <p className="mt-0.5 text-[11px] text-[#5B6479] dark:text-slate-400">
                100% Retained CXO Mandates
              </p>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              MAIN 2-COLUMN LAYOUT: SUBSCRIPTIONS FEED (8 cols) & DETAILS (4 cols)
              ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT / MAIN COLUMN (8 cols): Active & Past Subscriptions */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              {/* Active Subscriptions Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-sans text-base sm:text-lg font-bold text-[#061B36] dark:text-white">
                      Active Subscriptions ({totalActivePlans})
                    </h2>
                    <p className="text-xs text-[#5B6479] dark:text-slate-400">
                      Your current active Opportunity Vault entitlements
                    </p>
                  </div>

                  {totalActivePlans > 0 && (
                    <Link href="/opportunities">
                      <Button size="sm" variant="outline" className="text-xs font-semibold">
                        View Unlocked Jobs →
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Empty State if no active plans */}
                {totalActivePlans === 0 && (
                  <div className="rounded-2xl border border-[#E9E5DC] bg-white p-8 text-center shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
                    <div className="h-14 w-14 rounded-full bg-[#FAF8F5] border border-[#E9E5DC] flex items-center justify-center text-[#D6952F] mx-auto mb-4 dark:bg-[#081B33] dark:border-[#1E3557]">
                      <HiLockClosed className="h-7 w-7" />
                    </div>

                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#061B36] dark:text-white">
                      No Active Opportunity Vault Subscription
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      You are currently browsing masked previews. Subscribe to an Opportunity Vault matching your
                      experience level to reveal direct hiring manager phone numbers and application channels.
                    </p>

                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      <Link href="/plans">
                        <Button className="bg-[#D6952F] hover:bg-[#C8842D] text-[#061B36] font-bold text-xs px-5 py-2.5">
                          View Available Vault Plans →
                        </Button>
                      </Link>
                      <Link href="/opportunities">
                        <Button variant="outline" size="sm" className="text-xs">
                          Browse Vault Jobs
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Active Opportunity Vault Subscriptions Cards */}
                {activeSubs.map((s) => {
                  const status = s.effectiveStatus || s.status;
                  const remaining = daysRemaining(s.endDate);
                  const plan = s.plan;

                  return (
                    <article
                      key={s.id}
                      className="rounded-2xl border border-[#E9E5DC] border-l-4 border-l-[#22C55E] bg-white p-6 shadow-sm transition hover:shadow-md dark:border-[#1E3557] dark:border-l-[#22C55E] dark:bg-[#0E2340]"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D6952F] dark:text-[#F0C27B]">
                              Opportunity Vault Plan
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full dark:bg-emerald-950 dark:text-emerald-300">
                              <HiCheckCircle className="h-3.5 w-3.5" />
                              Active Plan
                            </span>
                          </div>

                          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#061B36] dark:text-white">
                            {plan?.name || 'Executive Opportunity Vault Plan'}
                          </h3>

                          {plan?.description && (
                            <p className="text-xs text-[#5B6479] dark:text-slate-300 max-w-xl">
                              {plan.description}
                            </p>
                          )}
                        </div>

                        {/* Remaining Days Badge */}
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-xl bg-[#FAF8F5] border border-[#E9E5DC] px-3 py-1 text-xs font-semibold text-[#061B36] dark:bg-[#152943] dark:border-[#1E3557] dark:text-white">
                            <HiClock className="h-3.5 w-3.5 text-[#D6952F]" />
                            <span>{remaining} Days Remaining</span>
                          </span>
                        </div>
                      </div>

                      {/* Term Info & Pricing Row */}
                      <div className="mt-4 pt-4 border-t border-[#F0EBE1] dark:border-[#1E3557] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2 text-[#5B6479] dark:text-slate-300">
                          <HiCalendar className="h-4 w-4 text-[#8C9AC0] shrink-0" />
                          <span>
                            Term: <strong className="text-[#061B36] dark:text-white">{formatDate(s.startDate)}</strong> to{' '}
                            <strong className="text-[#061B36] dark:text-white">{formatDate(s.endDate)}</strong>
                          </span>
                        </div>

                        {plan?.price !== undefined && (
                          <div className="flex items-center gap-2 sm:justify-end text-[#5B6479] dark:text-slate-300">
                            <HiCreditCard className="h-4 w-4 text-[#8C9AC0] shrink-0" />
                            <span>
                              Billed:{' '}
                              {plan.regularPrice && (plan.discountPercentage ?? 0) > 0 && (
                                <span className="line-through text-slate-400 mr-1">
                                  {formatMoney(plan.regularPrice, plan.currency || 'INR')}
                                </span>
                              )}
                              <strong className="text-[#061B36] dark:text-white">
                                {formatMoney(plan.price, plan.currency || 'INR')}
                              </strong>
                              <span className="text-[#8C9AC0]"> / {plan.durationDays} days</span>
                            </span>
                            {(plan.discountPercentage ?? 0) > 0 && (
                              <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-950 dark:text-emerald-400">
                                {plan.discountPercentage}% OFF
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Unlocked Vault Badges */}
                      {s.vaultAccess && s.vaultAccess.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-[#F0EBE1] dark:border-[#1E3557]">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0] mb-2">
                            Unlocked Regional Vaults
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {s.vaultAccess.map((va) => (
                              <span
                                key={va.vaultId}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FAF8F5] border border-[#E9E5DC] px-2.5 py-1 text-xs font-semibold text-[#061B36] dark:bg-[#081B33] dark:border-[#1E3557] dark:text-white"
                              >
                                <HiLockOpen className="h-3.5 w-3.5 text-[#D6952F]" />
                                <span>{va.vaultName || 'Regional Vault'}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Card Action Buttons */}
                      <div className="mt-5 pt-3 border-t border-[#F0EBE1] dark:border-[#1E3557] flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[11px] text-[#8C9AC0]">
                          Direct contact unmasking is enabled across all mandates.
                        </span>

                        <div className="flex items-center gap-2">
                          <Link href="/opportunities">
                            <Button size="sm" className="bg-[#061B36] hover:bg-[#132B4F] text-white text-xs font-semibold">
                              Open Vault Jobs
                            </Button>
                          </Link>
                          <Link href="/plans">
                            <Button size="sm" variant="outline" className="text-xs font-semibold">
                              Extend / Upgrade
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {/* Active RVA Subscription (if user has Recruitment Vendor Access) */}
                {hasRvaSub && rvaSub && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#8C9AC0]">
                      Recruitment Vendor Entitlement
                    </p>
                    <RvaSubscriptionCard sub={rvaSub} />
                  </div>
                )}
              </div>

              {/* Past / Inactive Subscriptions History */}
              {pastSubs.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-[#E9E5DC] dark:border-[#1E3557]">
                  <div>
                    <h3 className="font-sans text-base font-bold text-[#061B36] dark:text-white">
                      Subscription History ({pastSubs.length})
                    </h3>
                    <p className="text-xs text-[#5B6479] dark:text-slate-400">
                      Previous and expired Opportunity Vault plans
                    </p>
                  </div>

                  <div className="space-y-3">
                    {pastSubs.map((s) => {
                      const status = s.effectiveStatus || s.status;
                      const plan = s.plan;

                      return (
                        <div
                          key={s.id}
                          className="rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] p-4 dark:border-[#1E3557] dark:bg-[#081B33]"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-white">
                                  {plan?.name || 'Vault Subscription'}
                                </h4>
                                <Badge variant={status === 'expired' ? 'warning' : 'neutral'}>
                                  {status}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-[#8C9AC0] mt-0.5">
                                Term: {formatDate(s.startDate)} → {formatDate(s.endDate)}
                                {s.cancelledAt ? ` · Cancelled ${formatDate(s.cancelledAt)}` : ''}
                              </p>
                            </div>

                            <Link href="/plans">
                              <Button size="sm" variant="outline" className="text-xs self-start sm:self-auto">
                                Reactivate Plan
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN (4 cols): Privileges & Support */}
            <div className="col-span-12 lg:col-span-4 space-y-6 lg:sticky lg:top-24 self-start">
              {/* Vault Privileges Card */}
              <div className="rounded-2xl border border-[#D4AF37]/50 bg-gradient-to-br from-[#070C1B] to-[#122244] p-6 text-white shadow-md relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#F0C27B] bg-white/10 px-2.5 py-1 rounded-full">
                    <HiSparkles className="h-3.5 w-3.5 text-[#F0C27B] shrink-0" />
                    <span>Vault Privileges</span>
                  </span>
                </div>

                <h3 className="font-serif text-lg font-bold text-white leading-snug">
                  What Your Subscription Unlocks
                </h3>
                <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                  Gravitas Edge Opportunity Vaults provide executive candidates with direct, unfiltered hiring board access.
                </p>

                <ul className="mt-4 space-y-3 text-xs text-slate-200">
                  <li className="flex items-start gap-2.5">
                    <HiCheck className="h-4 w-4 text-[#F0C27B] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Unmasked Contact Details:</strong> Instant phone numbers &amp; direct emails for hiring managers.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <HiCheck className="h-4 w-4 text-[#F0C27B] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Skip Screening Layers:</strong> Connect straight with corporate hiring committees without recruiter gatekeeping.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <HiCheck className="h-4 w-4 text-[#F0C27B] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Pre-Market Exclusivity:</strong> Executive mandates available 10–14 days prior to public disclosure.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <HiCheck className="h-4 w-4 text-[#F0C27B] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Search Radar Visibility:</strong> High-priority placement in executive search partner searches.
                    </span>
                  </li>
                </ul>

                <Link href="/plans" className="mt-5 block">
                  <Button
                    size="sm"
                    className="w-full bg-[#D6952F] hover:bg-[#C8842D] text-[#061B36] font-bold text-xs inline-flex items-center justify-center gap-1.5"
                  >
                    <span>Browse All Vault Plans</span>
                    <HiArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>

              {/* Billing, Invoicing & Desk Support */}
              <div className="rounded-2xl border border-[#E9E5DC] bg-white p-5 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
                <div className="flex items-center gap-2 mb-2">
                  <HiQuestionMarkCircle className="h-4 w-4 text-[#D6952F]" />
                  <h4 className="text-xs font-bold text-[#061B36] dark:text-white uppercase tracking-wider">
                    Billing &amp; Tax Invoices
                  </h4>
                </div>

                <p className="text-xs text-[#5B6479] dark:text-slate-400 leading-relaxed">
                  Need a GST/corporate invoice or have inquiries regarding payment renewals? Our relations desk is ready to assist.
                </p>

                <div className="mt-3.5 pt-3 border-t border-[#F0EBE1] dark:border-[#1E3557] space-y-2">
                  <Link
                    href="/contact"
                    className="flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-[#061B36] hover:bg-[#FAF8F5] transition dark:text-white dark:hover:bg-[#152943]"
                  >
                    <span>Contact Candidate Desk</span>
                    <HiArrowRight className="h-3.5 w-3.5 text-[#8C9AC0]" />
                  </Link>

                  <Link
                    href="/#faq"
                    className="flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-[#061B36] hover:bg-[#FAF8F5] transition dark:text-white dark:hover:bg-[#152943]"
                  >
                    <span>Subscription FAQs</span>
                    <HiArrowRight className="h-3.5 w-3.5 text-[#8C9AC0]" />
                  </Link>

                  <Link
                    href="/refer-and-earn"
                    className="flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-[#061B36] hover:bg-[#FAF8F5] transition dark:text-white dark:hover:bg-[#152943]"
                  >
                    <span className="flex items-center gap-1.5">
                      <HiGift className="h-3.5 w-3.5 text-[#D6952F]" />
                      <span>Referral Wallet (Earn ₹5,000)</span>
                    </span>
                    <HiArrowRight className="h-3.5 w-3.5 text-[#8C9AC0]" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
