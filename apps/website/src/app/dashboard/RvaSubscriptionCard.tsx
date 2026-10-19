'use client';

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

  return (
    <div className="rounded-xl border border-line bg-surface p-4 dark:bg-surface-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-content">{plan?.name || 'Recruitment Vendor Access'}</p>
          <p className="mt-0.5 text-xs text-content-muted">
            {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
            {plan?.price !== undefined && (
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
        <Badge variant="info">Recruitment Vendor Access</Badge>
      </div>
    </div>
  );
}
