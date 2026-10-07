'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PricingGroup } from '@/lib/types';
import { Button, Skeleton, ErrorState, useToast } from '@/components/ui';
import { VaultIcon } from '@/components/cards';
import { formatMoney } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import Eyebrow from '@/components/marketing/Eyebrow';
import PlanCheckoutModal from '@/components/checkout/PlanCheckoutModal';

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
  const { user } = useAuth();
  const { showToast } = useToast();
  const [checkout, setCheckout] = useState<(PricingGroup & { planId: string }) | null>(null);

  const handleChoose = (group: PricingGroup, plan: PricingGroup['plans'][number]) => {
    if (!user) {
      window.location.href = '/register';
      return;
    }
    setCheckout({ ...group, planId: plan.id });
  };

  const handlePurchased = (vaultName: string, durationLabel: string, subscriptionId: string) => {
    showToast(`${vaultName} unlocked — ${durationLabel} plan active`, 'success');
  };

  const activeGroup = checkout ? groups.find((g) => g.vault.id === checkout.vault.id) : null;
  const activePlan = activeGroup?.plans.find((p) => p.id === checkout?.planId);

  return (
    <section id="plans" className="scroll-mt-20 border-t border-line bg-surface dark:bg-surface-elevated/50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <Eyebrow>PLANS / PRICING</Eyebrow>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-content sm:text-4xl">
            Choose how long you need access.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-content-muted">
            Select the Opportunity Vault relevant to your search and choose your preferred access
            period.
          </p>
        </div>

        {loading ? (
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        ) : error ? (
          <CardError message={error} onRetry={onRetry} />
        ) : groups.length === 0 ? (
          <CardError message="No plans are available right now." onRetry={onRetry} retry={false} />
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
                    const hasDiscount = (plan.discountPercentage ?? 0) > 0;
                    const isPopular = plan.durationDays === 90;
                    return (
                      <div
                        key={key}
                        className="group/card relative flex flex-col rounded-2xl border border-line bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/60 hover:shadow-card hover:shadow-brand-500/5 dark:bg-surface"
                      >
                        {isPopular && (
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-600 px-3 py-0.5 text-[11px] font-bold text-white shadow-sm dark:bg-brand-500">
                            Most Popular
                          </span>
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
                            <span className="text-base font-bold text-slate-500 dark:text-slate-400 line-through decoration-2 decoration-slate-500/70 dark:decoration-slate-400/70">
                              {formatMoney(plan.regularPrice, plan.currency)}
                            </span>
                          )}
                          <span className="text-3xl font-extrabold tracking-tight text-content">
                            {formatMoney(plan.discountedPrice ?? plan.price, plan.currency)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-content-faint">
                          {plan.durationLabel} access ·{' '}
                          {formatMoney(plan.regularPrice, plan.currency)} value
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

      {activeGroup && activePlan && (
        <PlanCheckoutModal
          plan={activePlan}
          vaultName={activeGroup.vault.name}
          vaultId={activeGroup.vault.id}
          open={!!checkout}
          onClose={() => setCheckout(null)}
          onSuccess={(subscriptionId) =>
            handlePurchased(activeGroup.vault.name, activePlan.durationLabel, subscriptionId)
          }
        />
      )}
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
    <div className="mt-12 rounded-2xl border border-line bg-surface dark:bg-surface-elevated">
      <ErrorState
        title="We couldn't load plans"
        message={message}
        onRetry={retry ? onRetry : undefined}
      />
    </div>
  );
}