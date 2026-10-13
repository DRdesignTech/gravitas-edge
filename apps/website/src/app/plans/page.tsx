'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchPublicPricing } from '@/lib/services';
import { PricingGroup } from '@/lib/types';
import { Skeleton, ErrorState } from '@/components/ui';
import OpportunityVaultCard from '@/components/plans/OpportunityVaultCard';
import PlansIntro from '@/components/plans/PlansIntro';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/lib/auth';

export default function PlansPage() {
  const { user, hasVaultAccess } = useAuth();
  const [groups, setGroups] = useState<PricingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="section-glow-navy relative">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16">
        <PlansIntro as="h1" />

        {user && hasVaultAccess === false && (
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-[#C8943E]/30 bg-[#FFF3D9] px-4 py-3 text-center text-sm leading-relaxed text-[#7A5A1E] dark:border-[#C8943E]/30 dark:bg-brand-950 dark:text-brand-200">
            You don&apos;t have Vault access yet. Purchase any Vault plan below to unlock your
            dashboard and start accessing full opportunity details.
          </div>
        )}

        {loading ? (
          <div className="mt-10 grid gap-5 sm:gap-6 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        ) : error ? (
          <CardError message={error} onRetry={load} />
        ) : groups.length === 0 ? (
          <CardError message="No plans are available right now." onRetry={load} retry={false} />
        ) : (
          <div className="mt-10 grid items-start gap-5 sm:gap-6 lg:grid-cols-2">
            {groups.map((group) => (
              <OpportunityVaultCard key={group.vault.id} group={group} defaultExpanded />
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-sm text-content-faint">
          Have questions? Contact us at{' '}
          <Link
            href="mailto:enquiry@gravitasedgeconsulting.com"
            className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            enquiry@gravitasedgeconsulting.com
          </Link>
        </p>
      </div>
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
    <div className="mt-10 rounded-2xl border border-line bg-surface dark:bg-surface-elevated">
      <ErrorState
        title="We couldn't load plans"
        message={message}
        onRetry={retry ? onRetry : undefined}
      />
    </div>
  );
}
