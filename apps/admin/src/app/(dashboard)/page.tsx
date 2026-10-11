'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminAnalyticsOverview } from '@/lib/services';
import { AnalyticsOverview } from '@/lib/types';
import { Card, Skeleton, ErrorState, PageHeader, Button, RefreshIcon } from '@/components/ui';
import { formatMoney } from '@/lib/format';

const EMPTY: AnalyticsOverview = {
  totalUsers: 0,
  newUsers: 0,
  totalSubscriptions: 0,
  activeSubscriptions: 0,
  expiredSubscriptions: 0,
  cancelledSubscriptions: 0,
  pendingSubscriptions: 0,
  failedSubscriptions: 0,
  totalOpportunities: 0,
  publishedOpportunities: 0,
  totalPlans: 0,
  activePlans: 0,
  totalVaults: 0,
  activeVaults: 0,
  grossRevenue: 0,
  monthlyRevenue: 0,
  refundedCount: 0,
  refundedAmount: 0,
  referralRegistrations: 0,
  periodReferralRegistrations: 0,
  successfulReferrals: 0,
  pendingReferrals: 0,
  totalCommissions: 0,
  periodCommissions: 0,
  totalResumes: 0,
  periodResumes: 0,
};

export default function DashboardHomePage() {
  const [stats, setStats] = useState<AnalyticsOverview>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    adminAnalyticsOverview('30d')
      .then(setStats)
      .catch(() => setError('Could not load dashboard metrics.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis = [
    {
      label: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      sub: `${stats.newUsers.toLocaleString()} new`,
      href: '/users',
      tint: 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
    },
    {
      label: 'Active Subscriptions',
      value: stats.activeSubscriptions.toLocaleString(),
      sub: `${stats.totalSubscriptions.toLocaleString()} total`,
      href: '/subscriptions',
      tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    {
      label: 'Published Opportunities',
      value: stats.publishedOpportunities.toLocaleString(),
      sub: `${stats.totalOpportunities.toLocaleString()} total`,
      href: '/opportunities',
      tint: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
    },
    {
      label: 'Active Vaults',
      value: stats.activeVaults.toLocaleString(),
      sub: `${stats.totalVaults.toLocaleString()} total`,
      href: '/vaults',
      tint: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    },
    {
      label: 'Total Revenue (30d)',
      value: formatMoney(stats.grossRevenue, 'INR').replace(/\.00$/, ''),
      sub: `${formatMoney(stats.monthlyRevenue, 'INR').replace(/\.00$/, '')} this month`,
      href: '/analytics',
      tint: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    },
    {
      label: 'Referral Registrations',
      value: stats.referralRegistrations.toLocaleString(),
      sub: `${stats.successfulReferrals.toLocaleString()} successful`,
      href: '/referrals',
      tint: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
    },
    {
      label: 'Referral Commissions',
      value: formatMoney(stats.totalCommissions, 'INR').replace(/\.00$/, ''),
      sub: `${formatMoney(stats.periodCommissions, 'INR').replace(/\.00$/, '')} this period`,
      href: '/commissions',
      tint: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
    },
    {
      label: 'Resume Uploads',
      value: stats.totalResumes.toLocaleString(),
      sub: `${stats.periodResumes.toLocaleString()} this period`,
      href: '/analytics',
      tint: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
    },
  ];

  const quickLinks = [
    { label: 'Manage Opportunities', href: '/opportunities', hint: 'Create, import & publish' },
    { label: 'Manage Vaults', href: '/vaults', hint: 'Organize by region & type' },
    { label: 'Subscription Plans', href: '/plans', hint: 'Pricing & vault access' },
    { label: 'View Analytics', href: '/analytics', hint: 'Revenue, users & engagement' },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of Gravitas Edge Consulting's health and performance."
        actions={
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshIcon className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {kpis.map((k) => (
              <Link key={k.label} href={k.href}>
                <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-card-hover">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-content-muted">{k.label}</p>
                      <p className="mt-1 text-2xl font-bold tracking-tight text-content">
                        {k.value}
                      </p>
                    </div>
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${k.tint}`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-current" />
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-content-faint">{k.sub}</p>
                </Card>
              </Link>
            ))}
          </div>

          <h2 className="mb-3 mt-8 text-base font-semibold text-content">Quick actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((q) => (
              <Link key={q.href} href={q.href}>
                <Card className="h-full transition hover:border-brand-400 hover:shadow-card-hover dark:hover:border-brand-600">
                  <p className="font-semibold text-content">{q.label}</p>
                  <p className="mt-1 text-sm text-content-muted">{q.hint}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
                    Open
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
