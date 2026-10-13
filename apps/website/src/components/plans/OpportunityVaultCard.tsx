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

  const tags = vaultTags(vault.name);
  const currency = plans[0]?.currency ?? 'INR';
  const fromMonthly = lowestMonthlyEquivalent(plans);
  const sortedPlans = plans.slice().sort((a, b) => a.durationDays - b.durationDays);

  const handleBuy = async (plan: PricingPlan) => {
    if (!user) {
      window.location.href = '/register';
      return;
    }
    if (buyingPlanId) return;
    setBuyingPlanId(plan.id);
    try {
      const started = await purchasePlan(plan.id, vault.id);
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
    <article className="group/vault relative flex flex-col overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-surface to-surface-muted p-5 shadow-card transition-all duration-300 ease-premium hover:-translate-y-1 hover:border-brand-400/60 hover:shadow-card-hover sm:p-6 dark:from-surface-elevated dark:to-surface">
      {/* Decorative corner glow + concentric rings (CSS only) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      >
        <span
          className="absolute -right-16 -top-16 h-44 w-44 opacity-90 transition-opacity duration-300 group-hover/vault:opacity-100"
          style={{
            background: 'radial-gradient(circle, rgba(200,148,62,0.2), transparent 68%)',
          }}
        />
        <span className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-brand-400/20" />
        <span className="absolute -right-1 -top-1 h-16 w-16 rounded-full border border-brand-400/15" />
      </span>

      {/* Gold accent bar revealed on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#C8943E] to-transparent opacity-0 transition-opacity duration-300 group-hover/vault:opacity-100"
      />

      <div className="relative flex items-start gap-3.5">
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#061B36] to-brand-600 text-[#E3B968] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_12px_22px_-14px_rgba(6,27,54,0.85)] ring-1 ring-inset ring-brand-400/35 transition-all duration-200 group-hover/vault:text-[#F1CE82] group-hover/vault:ring-brand-400/70">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 rounded-2xl border border-brand-400/20 transition-colors duration-200 group-hover/vault:border-brand-400/40"
          />
          <VaultGlyph name={vault.name} className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[1.0625rem] font-bold leading-snug tracking-tight text-content sm:text-lg">
            {vault.name}
          </h3>
          {vault.description && (
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-content-muted">
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
              className="inline-flex items-center rounded-full border border-brand-400/20 bg-brand-50/60 px-2.5 py-0.5 text-[11px] font-semibold text-brand-600 dark:bg-brand-950/50 dark:text-brand-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="relative mt-5 flex items-end justify-between gap-4 border-t border-line pt-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-content-faint">
            From
          </p>
          {fromMonthly !== null ? (
            <p className="mt-0.5 flex items-baseline gap-1 text-content">
              <span className="text-2xl font-extrabold tracking-tight">
                {formatMoney(fromMonthly, currency)}
              </span>
              <span className="text-xs font-medium text-content-muted">/mo</span>
            </p>
          ) : (
            <p className="mt-0.5 text-sm font-semibold text-content-faint">Pricing soon</p>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#061B36] px-4 py-2.5 text-sm font-semibold text-[#FFFEFA] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#061B36]/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8943E] focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:translate-y-0 dark:bg-brand-400 dark:text-[#061B36] dark:hover:bg-brand-300"
        >
          {expanded ? 'Hide Plans' : 'View Plans'}
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
                className={`overflow-hidden rounded-xl border ${
                  isPopular
                    ? 'border-brand-400/60 bg-gradient-to-br from-brand-50/80 to-surface dark:from-brand-950/60 dark:to-surface-elevated'
                    : 'border-line bg-surface dark:bg-surface-elevated'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-bold text-content">
                      {plan.durationLabel}
                      {isPopular && (
                        <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-brand-500">
                          Most Popular
                        </span>
                      )}
                    </p>
                    {hasDiscount && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
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
                        <p className="text-xs text-content-faint line-through">
                          {formatMoney(plan.regularPrice, plan.currency)}
                        </p>
                      )}
                      <p className="text-lg font-extrabold tracking-tight text-content">
                        {formatMoney(plan.discountedPrice ?? plan.price, plan.currency)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleBuy(plan)}
                      disabled={buyingPlanId !== null}
                      className="inline-flex shrink-0 items-center rounded-lg bg-[#061B36] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#061B36]/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8943E] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-400 dark:text-[#061B36] dark:hover:bg-brand-300"
                    >
                      {buyingPlanId === plan.id ? 'Redirecting…' : 'Buy Now'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-xs leading-relaxed text-content-faint">
            Click “Buy Now” to complete your purchase. Access activates after successful payment.
          </p>
        </div>
      )}
    </article>
  );
}
