'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchMySubscriptions } from '@/lib/services';
import { Subscription } from '@/lib/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
  ErrorState,
  PageHeader,
  statusVariant,
} from '@/components/ui';
import { LayersIcon } from '@/components/cards';
import { formatDate, formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    fetchMySubscriptions()
      .then(setSubscriptions)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader title="My Subscriptions" subtitle="Your plans and vault access." />

      {loading ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : error ? (
        <Card className="mt-6">
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : subscriptions.length === 0 ? (
        <Card className="mt-6 py-4">
          <EmptyState
            icon={<LayersIcon className="h-6 w-6" />}
            title="You don't have an active subscription yet"
            description="Unlock curated referral vaults and premium opportunities."
            action={
              <Link href="/plans">
                <Button>View plans</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {subscriptions.map((s) => {
            const status = s.effectiveStatus || s.status;
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-line bg-surface p-5 shadow-card dark:bg-surface-elevated"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-content">
                        {s.plan?.name || 'Subscription'}
                      </h3>
                      <Badge variant={statusVariant(status)}>{status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-content-muted">
                      {formatDate(s.startDate)} → {formatDate(s.endDate)}
                      {s.cancelledAt ? ` · Cancelled ${formatDate(s.cancelledAt)}` : ''}
                    </p>
                    {s.plan?.price !== undefined && (
                      <p className="mt-1 text-sm text-content">
                        {(s.plan.discountPercentage ?? 0) > 0 && s.plan.regularPrice ? (
                          <span className="text-content-faint line-through">
                            {formatMoney(s.plan.regularPrice, s.plan.currency || 'INR')}{' '}
                          </span>
                        ) : null}
                        {formatMoney(s.plan.price, s.plan.currency || 'INR')}
                        {(s.plan.discountPercentage ?? 0) > 0 && (
                          <Badge variant="success" className="ml-2">
                            {s.plan.discountPercentage}% OFF
                          </Badge>
                        )}
                        <span className="text-content-muted"> · {s.plan.durationDays} days</span>
                      </p>
                    )}
                  </div>
                  {s.plan?.durationDays ? (
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      {s.plan.durationDays} days
                    </span>
                  ) : null}
                </div>

                {s.vaultAccess && s.vaultAccess.length > 0 && (
                  <div className="mt-4 border-t border-line pt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-content-faint">
                      Vaults included
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {s.vaultAccess.map((va) => (
                        <Badge key={va.vaultId} variant="info">
                          {va.vaultName || 'Vault'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
