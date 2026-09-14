'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchPublicPricing, purchasePlan, confirmPurchase } from '@/lib/services';
import { PricingGroup } from '@/lib/types';
import { Button, Badge, Skeleton, ErrorState, useToast } from '@/components/ui';
import { VaultIcon } from '@/components/cards';
import { formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/lib/auth';

export default function PlansPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [groups, setGroups] = useState<PricingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<Record<string, string>>({});

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

  const handleChoose = async (group: PricingGroup, plan: PricingGroup['plans'][number]) => {
    if (!user) {
      window.location.href = '/register';
      return;
    }
    const key = plan.id;
    if (purchasing) return;
    setPurchasing(key);
    try {
      const started = await purchasePlan(plan.id, group.vault.id);
      const result = await confirmPurchase(started.paymentId);
      const vaultName = result.subscription.vaultAccess?.[0]?.vaultName ?? group.vault.name;
      setPurchased((prev) => ({ ...prev, [key]: result.subscription.id }));
      showToast(`${vaultName} unlocked — ${plan.durationLabel} plan active`, 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
          Vault Access Plans
        </span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-content sm:text-5xl">
          Unlock your next chapter
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-content-muted">
          Each vault unlocks a curated set of referral opportunities. Pick the vault that fits your
          career stage and choose how long you need access — upgrade or cancel anytime.
        </p>
      </div>

      {loading ? (
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      ) : error ? (
        <CardError message={error} onRetry={load} />
      ) : groups.length === 0 ? (
        <CardError message="No plans are available right now." onRetry={load} retry={false} />
      ) : (
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {groups.map((group) => (
            <div
              key={group.vault.id}
              className="flex flex-col rounded-3xl border border-line bg-surface p-7 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-brand-300/60 hover:shadow-card-hover dark:bg-surface-elevated"
            >
              <div className="flex items-start gap-3">
                <VaultIcon className="mt-0.5 h-6 w-6 shrink-0 text-brand-600 dark:text-brand-400" />
                <div>
                  <h3 className="text-xl font-bold text-content">{group.vault.name}</h3>
                  {group.vault.description && (
                    <p className="mt-1 text-sm text-content-muted">{group.vault.description}</p>
                  )}
                </div>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                {group.plans.map((plan) => {
                  const key = plan.id;
                  const done = purchased[key];
                  const busy = purchasing === key;
                  const hasDiscount = (plan.discountPercentage ?? 0) > 0;
                  return (
                    <div
                      key={key}
                      className="group/card relative flex flex-col rounded-2xl border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/60 hover:shadow-card hover:shadow-brand-500/5 dark:bg-surface"
                    >
                      {hasDiscount && (
                        <Badge
                          variant="success"
                          className="absolute -top-2.5 right-3 px-2.5 py-0.5 text-xs font-bold shadow-sm"
                        >
                          {plan.discountPercentage}% OFF
                        </Badge>
                      )}

                      <p className="text-xs font-semibold uppercase tracking-wider text-content-faint">
                        {plan.durationLabel}
                      </p>

                      <div className="mt-3 flex min-h-[3.25rem] flex-col">
                        {hasDiscount && (
                          <span className="text-sm text-content-muted line-through decoration-content-faint/60">
                            {formatMoney(plan.regularPrice, plan.currency)}
                          </span>
                        )}
                        <span className="text-3xl font-extrabold tracking-tight text-content">
                          {formatMoney(plan.discountedPrice ?? plan.price, plan.currency)}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-content-faint">
                        {plan.durationLabel} access · {formatMoney(plan.regularPrice, plan.currency)}{' '}
                        value
                      </p>

                      <div className="mt-auto pt-5">
                        {done ? (
                          <Link href="/dashboard/subscriptions" className="w-full">
                            <Button className="w-full" variant="primary">
                              Active
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            className="w-full"
                            variant={hasDiscount ? 'primary' : 'outline'}
                            loading={busy}
                            onClick={() => handleChoose(group, plan)}
                          >
                            {user ? 'Choose Plan' : 'Get Started'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {group.plans.every((p) => purchased[p.id]) && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  All durations unlocked —{' '}
                  <Link href="/dashboard/subscriptions" className="underline">
                    view your subscriptions
                  </Link>
                </div>
              )}
            </div>
          ))}
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