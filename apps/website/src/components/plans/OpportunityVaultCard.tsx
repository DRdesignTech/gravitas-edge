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

export default function OpportunityVaultCard({
  group,
}: {
  group: PricingGroup;
  defaultExpanded?: boolean;
}) {
  const { vault, plans } = group;
  const tags = vaultTags(vault.name);
  const currency = plans[0]?.currency ?? 'INR';
  const fromMonthly = lowestMonthlyEquivalent(plans);

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

          {/* Pricing metric row */}
          {fromMonthly !== null && (
            <div className="uiverse-price-pill">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E889E] dark:text-slate-400">
                From
              </span>
              <span className="text-base sm:text-lg font-extrabold text-[#061B36] dark:text-white">
                {formatMoney(fromMonthly, currency)}
              </span>
              <span className="text-xs font-medium text-[#7E889E] dark:text-slate-400">/mo</span>
              <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {plans.length} {plans.length === 1 ? 'Option' : 'Tiers'}
              </span>
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
