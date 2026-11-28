'use client';

import Link from 'next/link';
import { PricingGroup, PricingPlan } from '@/lib/types';
import { VaultGlyph } from '@/components/cards';
import { formatMoney } from '@/lib/format';

const DAYS_PER_MONTH = 30;

/** Short category tags derived from the vault name (no fabricated data). */
function vaultTags(name: string): string[] {
  const n = name.toLowerCase();
  if (n.includes('remote')) return ['Remote', 'Cross-border'];
  if (n.includes('uae') || n.includes('global')) return ['UAE', 'Global'];
  if (n.includes('executive')) return ['Executive', 'C-Suite'];
  if (n.includes('leadership')) return ['Leadership', 'Senior'];
  if (n.includes('management')) return ['Management', 'Mid-Level'];
  if (n.includes('early') || n.includes('career')) return ['Early Career', 'Entry-Level'];
  return ['Curated', 'Access'];
}

/**
 * Lowest monthly-equivalent price summary across the vault's plans, derived
 * from the server-supplied plan data (both regular before-discount and
 * discounted after-discount per 30 days).
 */
function lowestMonthlySummary(plans: PricingPlan[]): {
  discountedMonthly: number;
  regularMonthly: number;
  discountPercentage: number;
} | null {
  const valid = plans.filter((p) => p.durationDays > 0);
  if (valid.length === 0) return null;

  let bestPlan = valid[0];
  let bestDiscounted = ((bestPlan.discountedPrice ?? bestPlan.price) * DAYS_PER_MONTH) / bestPlan.durationDays;

  for (let i = 1; i < valid.length; i++) {
    const p = valid[i];
    const monthly = ((p.discountedPrice ?? p.price) * DAYS_PER_MONTH) / p.durationDays;
    if (monthly < bestDiscounted) {
      bestDiscounted = monthly;
      bestPlan = p;
    }
  }

  const regularBase = bestPlan.regularPrice > 0 ? bestPlan.regularPrice : bestPlan.price;
  const regularMonthly = (regularBase * DAYS_PER_MONTH) / bestPlan.durationDays;
  const discountPercentage =
    bestPlan.discountPercentage > 0
      ? Math.round(bestPlan.discountPercentage)
      : regularMonthly > bestDiscounted
        ? Math.round(((regularMonthly - bestDiscounted) / regularMonthly) * 100)
        : 0;

  return {
    discountedMonthly: bestDiscounted,
    regularMonthly,
    discountPercentage,
  };
}

export default function OpportunityVaultCard({
  group,
}: {
  group: PricingGroup;
  defaultExpanded?: boolean;
}) {
  const { vault, plans } = group;
  const tags = vaultTags(vault.name);
  const currency = plans[0]?.currency ?? 'INR';
  const priceSummary = lowestMonthlySummary(plans);

  return (
    <div className="uiverse-parent h-[240px] sm:h-[242px] w-full">
      <Link
        href={`/vaults/${vault.id}`}
        className="uiverse-card block text-left cursor-pointer"
        aria-label={`View plan details for ${vault.name}`}
      >
        {/* Layered concentric circles logo in top right (exact Grandeur Net 3D geometry) */}
        <div className="uiverse-logo" aria-hidden="true">
          <span className="circle circle1" />
          <span className="circle circle2" />
          <span className="circle circle3" />
          <span className="circle circle4" />
          <span className="circle circle5">
            <span className="svg-glyph">
              <VaultGlyph name={vault.name} className="h-5 w-5 text-[#F0C27B]" />
            </span>
          </span>
        </div>

        {/* Organic curved glass backdrop (exact Grandeur Net 40px 100% 40px 40px corner radius) */}
        <div className="uiverse-glass" aria-hidden="true" />

        {/* Card Content */}
        <div className="uiverse-content">
          <h3 className="title">{vault.name}</h3>
          {vault.description && <p className="text">{vault.description}</p>}

          {/* Pricing metric row (2 lines: prices on line 1, offer & tiers on line 2) */}
          {priceSummary !== null && (
            <div className="uiverse-price-pill !flex !flex-col !items-start !gap-1">
              {/* Line 1: Before-discount & After-discount prices */}
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E889E] dark:text-slate-400">
                  From
                </span>
                {priceSummary.regularMonthly > priceSummary.discountedMonthly && (
                  <span className="rounded-md bg-[#061B36]/5 px-1.5 py-0.5 text-sm font-bold text-[#0c0c0e] line-through decoration-[#dc9e3a] decoration-2 dark:bg-white/10 dark:text-slate-300">
                    {formatMoney(priceSummary.regularMonthly, currency)}
                  </span>
                )}
                <span className="text-lg sm:text-xl font-extrabold leading-none text-[#061B36] dark:text-white">
                  {formatMoney(priceSummary.discountedMonthly, currency)}
                </span>
                <span className="text-xs font-semibold text-[#7E889E] dark:text-slate-400">/mo</span>
              </div>

              {/* Line 2: Offer badge & tier count */}
              <div className="flex flex-wrap items-center gap-1.5">
                {priceSummary.discountPercentage > 0 && (
                  <span className="rounded-full border border-[#D6952F]/35 bg-[#D6952F]/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#9C6424] dark:text-[#F0C27B]">
                    Save {priceSummary.discountPercentage}%
                  </span>
                )}
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {plans.length} {plans.length === 1 ? 'Option' : 'Tiers'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar with tags on left and Explore CTA on right */}
        <div className="uiverse-bottom">
          <div className="tags-container">
            {tags.slice(0, 2).map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>

          <div className="view-more">
            <span className="view-more-button">Explore</span>
            <svg
              className="svg"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    </div>
  );
}
