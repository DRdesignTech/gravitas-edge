'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchPublicPricing } from '@/lib/services';
import { PricingGroup } from '@/lib/types';
import { Button, Badge, Skeleton, ErrorState } from '@/components/ui';
import { VaultIcon } from '@/components/cards';
import { formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/lib/auth';
import PlanCheckoutModal from '@/components/checkout/PlanCheckoutModal';

export default function PlansPage() {
  const { user, hasVaultAccess } = useAuth();
  const [groups, setGroups] = useState<PricingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkout, setCheckout] = useState<(PricingGroup & { planId: string }) | null>(null);

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

  const handleChoose = (group: PricingGroup, plan: PricingGroup['plans'][number]) => {
    if (!user) {
      window.location.href = '/register';
      return;
    }
    setCheckout({ ...group, planId: plan.id });
  };

  const activeGroup = checkout ? groups.find((g) => g.vault.id === checkout.vault.id) : null;
  const activePlan = activeGroup?.plans.find((p) => p.id === checkout?.planId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
          Vault Access Plans
        </span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-content sm:text-5xl">
          Choose how long you need access.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-content-muted">
          Select the Opportunity Vault relevant to your search and choose your preferred access
          period.
        </p>
      </div>

      {user && hasVaultAccess === false && (
        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-[#C8943E]/30 bg-[#FFF3D9] px-4 py-3 text-center text-sm leading-relaxed text-[#7A5A1E] dark:border-[#C8943E]/30 dark:bg-brand-950 dark:text-brand-200">
          You don&apos;t have Vault access yet. Purchase any Vault plan below to unlock your
          dashboard and start accessing full opportunity details.
        </div>
      )}

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
              className="card-static flex flex-col rounded-3xl p-7"
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
                  const hasDiscount = (plan.discountPercentage ?? 0) > 0;
                  const isPopular = plan.durationDays === 90;
                  return (
                    <div
                      key={plan.id}
                      className="group/card relative flex flex-col rounded-2xl border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/60 hover:shadow-card hover:shadow-brand-500/5 dark:bg-surface"
                    >
                      {isPopular && (
                        <Badge
                          variant="premium"
                          className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 text-[11px] font-bold shadow-sm"
                        >
                          Most Popular
                        </Badge>
                      )}

                      <p
                        className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-semibold uppercase tracking-wider text-content-faint ${
                          hasDiscount ? 'justify-center' : ''
                        }`}
                      >
                        {plan.durationLabel}
                        {hasDiscount && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                            {plan.discountPercentage}% OFF
                          </span>
                        )}
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
                        <Button
                          className="w-full"
                          variant={hasDiscount ? 'primary' : 'outline'}
                          onClick={() => handleChoose(group, plan)}
                        >
                          {user ? 'Choose Plan' : 'Get Started'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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

      {activeGroup && activePlan && (
        <PlanCheckoutModal
          plan={activePlan}
          vaultName={activeGroup.vault.name}
          vaultId={activeGroup.vault.id}
          open={!!checkout}
          onClose={() => setCheckout(null)}
        />
      )}
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