'use client';

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
  return (
    <section id="plans" className="section-glow-navy relative border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <PlansIntro as="h2" />

        {loading ? (
          <div className="mt-10 grid gap-5 sm:gap-6 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        ) : error ? (
          <CardError message={error} onRetry={onRetry} />
        ) : groups.length === 0 ? (
          <CardError message="No plans are available right now." onRetry={onRetry} retry={false} />
        ) : (
          <div className="mt-10 grid items-start gap-5 sm:gap-6 lg:grid-cols-2">
            {groups.map((group) => (
              <OpportunityVaultCard key={group.vault.id} group={group} />
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-sm text-content-muted">
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
