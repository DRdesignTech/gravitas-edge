'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { PricingGroup } from '@/lib/types';
import { Skeleton, ErrorState } from '@/components/ui';
import OpportunityVaultCard from '@/components/plans/OpportunityVaultCard';
import PlansIntro from '@/components/plans/PlansIntro';

export default function PricingSection({
  groups,
  loading,
  error,
  onRetry,
}: {
  groups: PricingGroup[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Derive available categories dynamically from the loaded groups
  const categories = useMemo(() => {
    const list = [{ id: 'all', label: 'All Vaults' }];
    const hasExecutive = groups.some((g) => g.vault.name.toLowerCase().includes('executive'));
    const hasLeadership = groups.some((g) => g.vault.name.toLowerCase().includes('leadership'));
    const hasManagement = groups.some(
      (g) =>
        g.vault.name.toLowerCase().includes('management') ||
        g.vault.name.toLowerCase().includes('mid'),
    );
    const hasGlobal = groups.some(
      (g) =>
        g.vault.name.toLowerCase().includes('global') ||
        g.vault.name.toLowerCase().includes('uae') ||
        g.vault.name.toLowerCase().includes('remote'),
    );
    const hasEarly = groups.some(
      (g) =>
        g.vault.name.toLowerCase().includes('early') ||
        g.vault.name.toLowerCase().includes('career'),
    );

    if (hasExecutive) list.push({ id: 'executive', label: 'Executive' });
    if (hasLeadership) list.push({ id: 'leadership', label: 'Leadership' });
    if (hasManagement) list.push({ id: 'management', label: 'Management' });
    if (hasGlobal) list.push({ id: 'global', label: 'Global & Remote' });
    if (hasEarly) list.push({ id: 'early', label: 'Early Career' });

    return list;
  }, [groups]);

  const filteredGroups = useMemo(() => {
    if (selectedCategory === 'all') return groups;
    return groups.filter((g) => {
      const n = g.vault.name.toLowerCase();
      if (selectedCategory === 'executive') return n.includes('executive');
      if (selectedCategory === 'leadership') return n.includes('leadership');
      if (selectedCategory === 'management') return n.includes('management') || n.includes('mid');
      if (selectedCategory === 'global')
        return n.includes('global') || n.includes('uae') || n.includes('remote');
      if (selectedCategory === 'early') return n.includes('early') || n.includes('career');
      return true;
    });
  }, [groups, selectedCategory]);

  return (
    <section id="plans" className="section-glow-navy relative border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <PlansIntro as="h2" />

        {/* Interactive Category Filter Pills (if multiple categories are available) */}
        {!loading && !error && categories.length > 2 && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              const count =
                cat.id === 'all'
                  ? groups.length
                  : groups.filter((g) => {
                      const n = g.vault.name.toLowerCase();
                      if (cat.id === 'executive') return n.includes('executive');
                      if (cat.id === 'leadership') return n.includes('leadership');
                      if (cat.id === 'management')
                        return n.includes('management') || n.includes('mid');
                      if (cat.id === 'global')
                        return n.includes('global') || n.includes('uae') || n.includes('remote');
                      if (cat.id === 'early') return n.includes('early') || n.includes('career');
                      return true;
                    }).length;

              if (count === 0 && cat.id !== 'all') return null;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-[#061B36] text-white shadow-sm ring-2 ring-[#D6952F]/40 dark:bg-[#1E3557] dark:ring-[#F0C27B]/40'
                      : 'border border-[#E9E5DC] bg-white text-[#5B6479] hover:border-[#D6952F]/40 hover:text-[#061B36] dark:border-[#1E3557] dark:bg-[#0B1E36] dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      active
                        ? 'bg-[#D6952F] text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="mt-8 grid gap-4 sm:gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[242px] rounded-[28px]" />
            ))}
          </div>
        ) : error ? (
          <CardError message={error} onRetry={onRetry} />
        ) : filteredGroups.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-line bg-surface py-12 text-center">
            <p className="text-sm text-content-muted">No plans found in this category.</p>
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className="mt-3 text-xs font-semibold text-[#D6952F] hover:underline"
            >
              Show all plans
            </button>
          </div>
        ) : (
          <div className="mt-8 grid items-start gap-4 sm:gap-4.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((group) => (
              <OpportunityVaultCard key={group.vault.id} group={group} />
            ))}
          </div>
        )}

        <p className="mt-12 text-center text-sm text-content-muted">
          Prefer to compare all options side by side?{' '}
          <Link
            href="/plans"
            className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            View full plans
          </Link>
        </p>
      </div>
    </section>
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
    <div className="mt-10 rounded-2xl border border-line bg-surface dark:bg-surface-elevated">
      <ErrorState
        title="We couldn't load plans"
        message={message}
        onRetry={retry ? onRetry : undefined}
      />
    </div>
  );
}
