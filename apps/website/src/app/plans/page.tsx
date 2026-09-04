'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchPublicPlans } from '@/lib/services';
import { SubscriptionPlan } from '@/lib/types';
import { Button, Skeleton, ErrorState, Badge } from '@/components/ui';
import { VaultIcon } from '@/components/cards';
import { formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/lib/auth';

function benefitsForPlan(name: string) {
  if (/all/i.test(name)) {
    return [
      'All content vaults unlocked',
      'Global & India private lists',
      'Priority support',
      'New vaults as they launch',
    ];
  }
  if (/global/i.test(name)) {
    return [
      'Global, Middle East & International vaults',
      'Cross-border referral access',
      'International opportunities',
      'New global roles weekly',
    ];
  }
  return [
    'India career vaults unlocked',
    'India professional & executive lists',
    'Leadership & career guidance',
    'New India roles weekly',
  ];
}

export default function PlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    fetchPublicPlans()
      .then(setPlans)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
          Subscription Plans
        </span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-content sm:text-5xl">
          Unlock your next chapter
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-content-muted">
          Choose a plan that fits your goals. Every plan unlocks curated referral vaults — upgrade
          or cancel anytime.
        </p>
      </div>

      {loading ? (
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : error ? (
        <CardError message={error} onRetry={load} />
      ) : plans.length === 0 ? (
        <CardError message="No plans are available right now." onRetry={load} retry={false} />
      ) : (
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => {
            const allAccess = /all/i.test(p.name);
            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-3xl border bg-surface p-7 shadow-card transition-all duration-200 dark:bg-surface-elevated ${
                  allAccess
                    ? 'border-brand-400 shadow-card-hover ring-2 ring-brand-500/30 dark:border-brand-500'
                    : 'border-line hover:-translate-y-0.5 hover:shadow-card-hover'
                }`}
              >
                {allAccess && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-600 to-violet-600 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                    MOST POPULAR
                  </span>
                )}
                <h3 className="text-lg font-semibold text-content">{p.name}</h3>
                <p className="mt-1 text-sm text-content-muted">{p.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-content">
                    {formatMoney(p.price, p.currency)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-content-faint">for {p.durationDays} days</p>

                <ul className="mt-6 space-y-2.5 text-sm text-content">
                  {benefitsForPlan(p.name).map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-500" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {p.vaults && p.vaults.length > 0 && (
                  <div className="mt-6 border-t border-line pt-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-content-faint">
                      <VaultIcon className="h-3.5 w-3.5" /> Included vaults
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.vaults.map((v) => (
                        <Badge key={v.id} variant="neutral">
                          {v.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-7">
                  <Link href={user ? '/dashboard/subscriptions' : '/register'}>
                    <Button className="w-full" variant={allAccess ? 'primary' : 'outline'}>
                      {user ? 'Manage subscription' : 'Get started'}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-10 text-center text-sm text-content-faint">
        Have questions? Contact us at{' '}
        <Link
          href="mailto:support@careervault.example"
          className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          support@careervault.example
        </Link>
      </p>
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
    <div className="mt-12 rounded-2xl border border-line bg-surface dark:bg-surface-elevated">
      <ErrorState
        title="We couldn't load plans"
        message={message}
        onRetry={retry ? onRetry : undefined}
      />
    </div>
  );
}

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
