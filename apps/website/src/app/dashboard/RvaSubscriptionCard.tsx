'use client';

import Link from 'next/link';
import { useState } from 'react';
import { getErrorMessage } from '@/lib/errors';
import { stopRvaAutoPay } from '@/lib/services';
import { Badge, StatusBadge } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/format';
import { RvaSubscriptionSummary } from '@/lib/types';

function daysRemaining(endDate?: string | null): number {
  if (!endDate) return 0;
  const end = new Date(endDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / 86400000));
}

export default function RvaSubscriptionCard({ sub }: { sub: RvaSubscriptionSummary }) {
  const status = sub.effectiveStatus || sub.status;
  const remaining = daysRemaining(sub.endDate);
  const plan = sub.plan;
  const [stopped, setStopped] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState('');

  const stop = async () => {
    if (!window.confirm('Stop RVA AutoPay? You will keep access until the end of your paid term.'))
      return;
    setStopping(true);
    setError('');
    try {
      await stopRvaAutoPay(sub.id);
      setStopped(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setStopping(false);
    }
  };

  return (
    <div>
      <Link
        href="/recruitment-vendor/jobs"
        className="group block rounded-xl border border-line bg-surface p-4 transition-colors hover:border-brand-300 hover:bg-surface-muted dark:bg-surface-elevated dark:hover:border-brand-500/60"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-content group-hover:text-brand-700 dark:group-hover:text-brand-300">
              {plan?.name || 'Recruitment Vendor Access'}
            </p>
            <p className="mt-0.5 text-xs text-content-muted">
              {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
              {!sub.recurring && plan?.price !== undefined && (
                <span className="ml-2 font-medium text-content">
                  {(plan.discountPercentage ?? 0) > 0 && plan.regularPrice && (
                    <span className="mr-1 text-xs font-normal text-content-faint line-through">
                      {formatMoney(plan.regularPrice, plan.currency || 'INR')}
                    </span>
                  )}
                  {formatMoney(plan.price, plan.currency || 'INR')}
                  {(plan.discountPercentage ?? 0) > 0 && (
                    <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                      {plan.discountPercentage}% off
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {remaining > 0 && (
              <Badge variant={remaining <= 7 ? 'warning' : 'success'}>
                {remaining} day{remaining === 1 ? '' : 's'} left
              </Badge>
            )}
            <StatusBadge status={status} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400">
            <Badge variant="info">Recruitment Vendor Access</Badge>
            <svg
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </span>
        </div>
      </Link>
      {sub.autoRenew && !stopped && (
        <button
          type="button"
          disabled={stopping}
          onClick={stop}
          className="mt-2 text-sm text-content-muted underline"
        >
          {stopping ? 'Stopping AutoPay…' : 'Stop AutoPay'}
        </button>
      )}
      {stopped && (
        <p role="status" className="mt-2 text-sm text-content-muted">
          AutoPay stopped. Access continues until {formatDate(sub.endDate)}.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
