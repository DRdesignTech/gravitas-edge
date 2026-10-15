'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  adminRvaAnalyticsOverview,
  adminRvaAnalyticsRevenue,
  adminRvaAnalyticsOpportunities,
  adminRvaAnalyticsSubscriptions,
} from '@/lib/services';
import {
  RvaAnalyticsOverview,
  RvaRevenueData,
  RvaOpportunityAnalytics,
  RvaSubscriptionAnalytics,
  RVA_CATEGORY_LABELS,
  DateRange,
} from '@/lib/types';
import { Card, Skeleton, EmptyState, Button, Input, ErrorState, PageHeader } from '@/components/ui';
import { formatMoney, titleCase } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

type Filter = { range: DateRange; startDate?: string; endDate?: string };

const RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
];

const CHART_COLORS = ['#061B4F', '#008FEF', '#0B2D78', '#94BEF5', '#10b981', '#f59e0b', '#ef4444'];
const AXIS_TICK = 'var(--color-content-faint)';
const GRID_STROKE = 'var(--color-line)';

export default function RvaOverviewPage() {
  const [filter, setFilter] = useState<Filter>({ range: '30d' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<RvaAnalyticsOverview | null>(null);
  const [revenue, setRevenue] = useState<RvaRevenueData | null>(null);
  const [opps, setOpps] = useState<RvaOpportunityAnalytics | null>(null);
  const [subs, setSubs] = useState<RvaSubscriptionAnalytics | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (f: Filter, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [o, r, op, s] = await Promise.all([
        adminRvaAnalyticsOverview(f.range, f.startDate, f.endDate),
        adminRvaAnalyticsRevenue(f.range, f.startDate, f.endDate),
        adminRvaAnalyticsOpportunities(f.range, f.startDate, f.endDate),
        adminRvaAnalyticsSubscriptions(f.range, f.startDate, f.endDate),
      ]);
      setOverview(o);
      setRevenue(r);
      setOpps(op);
      setSubs(s);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const applyRange = (range: DateRange) => {
    setFilter({ range, startDate: undefined, endDate: undefined });
  };

  const revenueChartData = useMemo(() => {
    if (!revenue || revenue.timeline.length === 0) return [];
    return revenue.timeline.map((t) => ({
      period: t.period,
      revenue: t.revenue,
      payments: t.paymentCount,
    }));
  }, [revenue]);

  const categoryData = useMemo(
    () =>
      (opps?.byCategory ?? []).map((c) => ({
        name: RVA_CATEGORY_LABELS[c.category] ?? titleCase(c.category),
        value: c.count,
      })),
    [opps],
  );

  const oppStatusData = useMemo(
    () => (opps?.byStatus ?? []).map((c) => ({ name: titleCase(c.status), value: c.count })),
    [opps],
  );

  const planData = useMemo(
    () =>
      (subs?.byPlan ?? []).map((p) => ({
        name: p.planName ?? p.planId,
        count: p.count,
        durationDays: p.durationDays,
      })),
    [subs],
  );

  const subStatusData = useMemo(
    () => (subs?.byStatus ?? []).map((s) => ({ name: titleCase(s.status), value: s.count })),
    [subs],
  );

  const tooltipStyle = {
    background: 'var(--color-surface-elevated)',
    borderColor: 'var(--color-line)',
    color: 'var(--color-content)',
  };

  const kpiCards = [
    { label: 'Total Opportunities', value: overview?.totalOpportunities.toLocaleString() ?? '—' },
    { label: 'Published', value: overview?.publishedOpportunities.toLocaleString() ?? '—' },
    { label: 'Drafts', value: overview?.draftOpportunities.toLocaleString() ?? '—' },
    {
      label: 'Active Subscriptions',
      value: overview?.activeSubscriptions.toLocaleString() ?? '—',
    },
    { label: 'Total Subscriptions', value: overview?.totalSubscriptions.toLocaleString() ?? '—' },
    { label: 'Enrollments', value: overview?.totalEnrollments.toLocaleString() ?? '—' },
    { label: 'Gross Revenue', value: overview ? formatMoney(overview.grossRevenue, 'INR') : '—' },
    {
      label: 'Revenue (period)',
      value: overview ? formatMoney(overview.periodRevenue, 'INR') : '—',
    },
    {
      label: 'Refunds',
      value:
        overview && overview.refundedCount > 0
          ? `${overview.refundedCount} (${formatMoney(overview.refundedAmount, 'INR')})`
          : '0',
    },
    { label: 'Active Plans', value: overview?.activePlans.toLocaleString() ?? '—' },
    {
      label: 'Expired Subscriptions',
      value: overview?.expiredSubscriptions.toLocaleString() ?? '—',
    },
    {
      label: 'Enrollments (period)',
      value: overview?.periodEnrollments.toLocaleString() ?? '—',
    },
  ];

  if (loading) {
    return (
      <div>
        <PageHeader title="Recruitment Vendor Access" subtitle="Loading RVA analytics…" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Recruitment Vendor Access" subtitle="RVA performance overview." />
        <Card>
          <ErrorState message={error} onRetry={() => load(filter, true)} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Recruitment Vendor Access"
        subtitle="Opportunities, subscriptions and revenue scoped to the RVA vault."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex flex-wrap rounded-lg border border-line bg-surface p-1 dark:bg-surface-elevated">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => applyRange(opt.value as DateRange)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    filter.range === opt.value
                      ? 'bg-brand-600 text-white dark:bg-brand-500'
                      : 'text-content-muted hover:bg-surface-muted hover:text-content'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button
              variant="secondary"
              maxWidth="max-w-md"
              loading={refreshing}
              onClick={() => load(filter, true)}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {filter.range === 'custom' && (
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4 dark:bg-surface-elevated">
          <Input
            type="date"
            label="Start date"
            value={filter.startDate ?? ''}
            onChange={(e) => setFilter((p) => ({ ...p, startDate: e.target.value }))}
            className="w-44"
          />
          <Input
            type="date"
            label="End date"
            value={filter.endDate ?? ''}
            onChange={(e) => setFilter((p) => ({ ...p, endDate: e.target.value }))}
            className="w-44"
          />
          <Button maxWidth="max-w-md" onClick={() => setFilter((p) => ({ ...p, range: 'custom' }))}>
            Apply
          </Button>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <p className="text-sm font-medium text-content-muted">{kpi.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-content">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Revenue & Payments">
          {revenueChartData.length === 0 ? (
            <EmptyState
              title="No revenue data"
              description="RVA revenue will appear here once successful payments are recorded."
            />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: AXIS_TICK }} />
                  <YAxis tick={{ fontSize: 12, fill: AXIS_TICK }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: 'var(--color-content-muted)' }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#061B4F"
                    strokeWidth={2}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="payments"
                    name="Payments"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Opportunities by Category">
          {categoryData.length === 0 ? (
            <EmptyState
              title="No opportunity data"
              description="Category breakdown will appear here once opportunities are added."
            />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: AXIS_TICK }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis tick={{ fontSize: 12, fill: AXIS_TICK }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Opportunities" fill="#061B4F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Opportunity Status">
          {oppStatusData.length === 0 ? (
            <EmptyState
              title="No opportunity data"
              description="Status breakdown will appear here once opportunities are added."
            />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={oppStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {oppStatusData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: 'var(--color-content-muted)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Subscriptions by Plan">
          {planData.length === 0 ? (
            <EmptyState
              title="No subscription data"
              description="Plan distribution will appear here once vendors subscribe."
            />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: AXIS_TICK }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis tick={{ fontSize: 12, fill: AXIS_TICK }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Subscriptions" fill="#008FEF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Subscription Status" className="lg:col-span-2">
          {subStatusData.length === 0 ? (
            <EmptyState
              title="No subscription data"
              description="Status breakdown will appear here once vendors subscribe."
            />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {subStatusData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: 'var(--color-content-muted)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
