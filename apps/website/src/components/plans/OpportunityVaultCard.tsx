'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PricingGroup, PricingPlan } from '@/lib/types';
import { VaultGlyph } from '@/components/cards';
import { formatMoney } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui';
import { purchasePlan } from '@/lib/services';
import { getErrorMessage } from '@/lib/errors';

const DAYS_PER_MONTH = 30;

/** Short category tags derived from the vault name (no fabricated data). */
function vaultTags(name: string): string[] {
  const n = name.toLowerCase();
  if (n.includes('remote')) return ['Remote', 'Cross-border'];
  if (n.includes('uae') || n.includes('global')) return ['UAE', 'GCC', 'Global'];
  if (n.includes('executive')) return ['Executive', 'C-Suite'];
  if (n.includes('leadership')) return ['Leadership', 'Senior'];
  if (n.includes('management')) return ['Management', 'Mid-Level'];
  if (n.includes('early') || n.includes('career')) return ['Early Career', 'Entry-Level'];
  return [];
}

/**
 * Lowest monthly-equivalent price across the vault's plans, derived only from
 * the server-supplied plan data (actual discounted price per 30 days).
 */
function lowestMonthlyEquivalent(plans: PricingPlan[]): number | null {
  const equivalents = plans
    .filter((p) => p.durationDays > 0)
    .map((p) => ((p.discountedPrice ?? p.price) * DAYS_PER_MONTH) / p.durationDays);
  if (equivalents.length === 0) return null;
  return Math.min(...equivalents);
}

function ChevronIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

export default function OpportunityVaultCard({
  group,
  defaultExpanded = false,
}: {
  group: PricingGroup;
  defaultExpanded?: boolean;
}) {
  const { vault, plans } = group;
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [buyingPlanId, setBuyingPlanId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<Record<string, 'one-time' | 'autopay'>>({});

  const tags = vaultTags(vault.name);
  const currency = plans[0]?.currency ?? 'INR';
  const fromMonthly = lowestMonthlyEquivalent(plans);
  const sortedPlans = plans.slice().sort((a, b) => a.durationDays - b.durationDays);

  const handleBuy = async (plan: PricingPlan, recurring: boolean = false) => {
    if (!user) {
      window.location.href = '/register';
      return;
    }
    if (buyingPlanId) return;
    setBuyingPlanId(plan.id);
    try {
      const started = await purchasePlan(plan.id, vault.id, undefined, recurring);
      router.push(
        `/checkout/${started.paymentId}?returnTo=${encodeURIComponent(
          `/opportunities?vaultId=${encodeURIComponent(vault.id)}`,
        )}`,
      );
    } catch (err) {
      setBuyingPlanId(null);
      showToast(getErrorMessage(err), 'error');
    }
  };

  return (
    <article className="group/vault relative flex flex-col overflow-hidden rounded-3xl border border-[#E9E5DC] bg-white p-6 shadow-sm transition-all duration-300 ease-premium hover:-translate-y-1 hover:border-[#D6952F]/60 hover:shadow-xl sm:p-7 dark:border-[#1E3557] dark:bg-[#0D2038] dark:hover:border-[#F0C27B]/50">
      {/* Decorative corner glow + concentric rings (matching .vc::before & .vc::after in redesign prototype) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
      >
        <span
          className="absolute -right-16 -top-16 h-44 w-44 opacity-90 transition-opacity duration-300 group-hover/vault:opacity-100"
          style={{
            background: 'radial-gradient(circle, rgba(200,148,62,0.18), transparent 68%)',
          }}
        />
        <span className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-[#D6952F]/20" />
        <span className="absolute -right-1 -top-1 h-16 w-16 rounded-full border border-[#D6952F]/15" />
      </span>

      {/* Gold accent bar revealed on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#D6952F] via-[#F0C27B] to-[#D6952F] opacity-0 transition-opacity duration-300 group-hover/vault:opacity-100"
      />

      <div className="relative flex items-start gap-3.5">
        <span className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#061B36] text-[#F0C27B] border border-[#D6952F]/40 shadow-sm ring-1 ring-white/10 dark:bg-[#07172B] dark:border-[#D6952F]/30">
          <VaultGlyph name={vault.name} className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-snug tracking-tight text-[#061B36] dark:text-white">
            {vault.name}
          </h3>
          {vault.description && (
            <p className="mt-1 line-clamp-2 text-xs sm:text-sm leading-relaxed text-[#5B6479] dark:text-slate-300">
              {vault.description}
            </p>
          )}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-[#F3D9AE] bg-[#FFF8EE] px-2.5 py-0.5 text-[11px] font-semibold text-[#061B36] dark:border-[#D6952F]/30 dark:bg-[#091F38] dark:text-[#F0C27B]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="relative mt-5 flex items-end justify-between gap-4 border-t border-[#E9E5DC] pt-4 dark:border-[#1E3557]">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7E889E] dark:text-slate-400">
            From
          </p>
          {fromMonthly !== null ? (
            <p className="mt-0.5 flex items-baseline gap-1 text-[#061B36] dark:text-white">
              <span className="text-2xl font-extrabold tracking-tight">
                {formatMoney(fromMonthly, currency)}
              </span>
              <span className="text-xs font-medium text-[#7E889E] dark:text-slate-400">/mo</span>
            </p>
          ) : (
            <p className="mt-0.5 text-sm font-semibold text-[#7E889E] dark:text-slate-400">Pricing soon</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#061B36] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0A2645] hover:shadow-md cursor-pointer dark:bg-[#1E3557] dark:hover:bg-[#25426B]"
        >
          <span>{expanded ? 'Hide Plans' : 'View Plans'}</span>
          <ChevronIcon
            className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {expanded && (
        <div className="relative mt-4 space-y-3">
          {sortedPlans.map((plan) => {
            const hasDiscount = (plan.discountPercentage ?? 0) > 0;
            const savings =
              hasDiscount && plan.regularPrice
                ? plan.regularPrice - (plan.discountedPrice ?? plan.price)
                : 0;
            const isPopular = plan.durationDays === 90;
            return (
              <div
                key={plan.id}
                className={`overflow-hidden rounded-2xl border transition-all ${
                  isPopular
                    ? 'border-[#D6952F]/60 bg-gradient-to-br from-[#FFFDF9] to-[#FBF5EB] shadow-xs dark:from-[#091F38] dark:to-[#07172B] dark:border-[#F0C27B]/40'
                    : 'border-[#E9E5DC] bg-[#FAF8F5] dark:border-[#1E3557] dark:bg-[#081B33]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-bold text-[#061B36] dark:text-white">
                      <span>{plan.durationLabel}</span>
                      {isPopular && (
                        <span className="rounded-full bg-gradient-to-r from-[#D6952F] to-[#B37E28] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-xs">
                          Most Popular
                        </span>
                      )}
                    </p>
                    {hasDiscount && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-400/30">
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
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      {hasDiscount && (
                        <p className="text-xs text-[#8A95A5] dark:text-slate-400 line-through">
                          {formatMoney(plan.regularPrice, plan.currency)}
                        </p>
                      )}
                      <p className="text-lg font-extrabold tracking-tight text-[#061B36] dark:text-white">
                        {formatMoney(plan.discountedPrice ?? plan.price, plan.currency)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMode((prev) => ({ ...prev, [plan.id]: 'autopay' }));
                          handleBuy(plan, true);
                        }}
                        disabled={buyingPlanId !== null}
                        title="AutoPay via secure payment gateway"
                        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#D6952F] to-[#B37E28] px-4 py-2 text-xs font-bold text-white shadow-xs transition-all duration-200 hover:brightness-105 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                      >
                        {buyingPlanId === plan.id && paymentMode[plan.id] === 'autopay' ? 'Redirecting…' : 'Buy Now'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-[11px] leading-relaxed text-[#7E889E] dark:text-slate-400">
            Click “Buy Now” to complete your purchase via secure checkout. Access activates immediately after payment confirmation.
          </p>
        </div>
      )}
    </article>
  );
}
