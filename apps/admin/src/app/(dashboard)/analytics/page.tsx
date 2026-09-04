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
  adminAnalyticsOverview,
  adminAnalyticsRevenue,
  adminAnalyticsVaults,
  adminAnalyticsOpportunities,
  adminAnalyticsUsers,
} from '@/lib/services';
import {
  AnalyticsOverview,
  RevenueData,
  VaultAnalytics,
  OpportunityAnalytics,
  UsersAnalytics,
  DateRange,
} from '@/lib/types';
import {
  Card,
  Skeleton,
  Badge,
  EmptyState,
  Button,
  Input,
  ErrorState,
  PageHeader,
  StatusBadge,
} from '@/components/ui';
import { formatMoney, formatDate, titleCase } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

type Filter = { range: DateRange; startDate?: string; endDate?: string };

const RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
  { value: 'custom', label: 'Custom range' },
];

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#14b8a6'];
const AXIS_TICK = 'var(--color-content-faint)';
const GRID_STROKE = 'var(--color-line)';

export default function AnalyticsPage() {
  const [filter, setFilter] = useState<Filter>({ range: '30d' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [vaults, setVaults] = useState<VaultAnalytics[]>([]);
  const [opps, setOpps] = useState<OpportunityAnalytics | null>(null);
  const [usersData, setUsersData] = useState<UsersAnalytics | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (f: Filter, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [o, r, v, op, u] = await Promise.all([
        adminAnalyticsOverview(f.range, f.startDate, f.endDate),
        adminAnalyticsRevenue(f.range, f.startDate, f.endDate),
        adminAnalyticsVaults(f.range, f.startDate, f.endDate),
        adminAnalyticsOpportunities(f.range, f.startDate, f.endDate),
        adminAnalyticsUsers(f.range, f.startDate, f.endDate),
      ]);
      setOverview(o);
      setRevenue(r);
      setVaults(v);
      setOpps(op);
      setUsersData(u);
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

  const applyCustom = () => {
    setFilter((prev) => ({ ...prev, range: 'custom' }));
  };

  const revenueChartData = useMemo(() => {
    if (!revenue || revenue.timeline.length === 0) return [];
    return revenue.timeline.map((t) => ({
      month: t.month,
      revenue: t.revenue,
      payments: t.paymentCount,
    }));
  }, [revenue]);

  const userGrowthData = useMemo(() => {
    if (!revenue || revenue.timeline.length === 0 || !overview) return [];
    return revenue.timeline.map((t, i) => ({
      month: t.month,
      newUsers: i === 0 ? Math.round(overview.newUsers / Math.max(1, revenue.timeline.length)) : 0,
      totalUsers: overview.totalUsers,
    }));
  }, [revenue, overview]);

  const opportunityCharts = useMemo(() => {
    if (!opps) return { category: [], status: [], employment: [], country: [] };
    return {
      category: opps.byCategory.map((c) => ({ name: titleCase(c.category), value: c.count })),
      status: opps.byStatus.map((c) => ({ name: titleCase(c.status), value: c.count })),
      employment: opps.byEmploymentType.map((c) => ({ name: titleCase(c.type), value: c.count })),
      country: opps.byCountry.map((c) => ({ name: c.country ?? 'Unknown', value: c.count })),
    };
  }, [opps]);

  const kpiCards = [
    { label: 'Total Users', value: overview?.totalUsers.toLocaleString() ?? '—' },
    { label: 'New Users', value: overview?.newUsers.toLocaleString() ?? '—' },
    { label: 'Active Subscriptions', value: overview?.activeSubscriptions.toLocaleString() ?? '—' },
    { label: 'Total Revenue', value: overview ? formatMoney(overview.totalRevenue, 'INR') : '—' },
    {
      label: 'Monthly Revenue',
      value: overview ? formatMoney(overview.monthlyRevenue, 'INR') : '—',
    },
    { label: 'Total Opportunities', value: overview?.totalOpportunities.toLocaleString() ?? '—' },
    { label: 'Published Ops', value: overview?.publishedOpportunities.toLocaleString() ?? '—' },
    { label: 'Expired Subs', value: overview?.expiredSubscriptions.toLocaleString() ?? '—' },
  ];

  if (loading) {
    return (
      <div>
        <PageHeader title="Analytics" subtitle="Loading platform analytics…" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
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
        <PageHeader title="Analytics" subtitle="Platform performance overview." />
        <Card>
          <ErrorState message={error} onRetry={() => load(filter, true)} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Platform performance overview."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-line bg-surface p-1 dark:bg-surface-elevated">
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
              size="sm"
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
          <Button size="sm" onClick={applyCustom}>
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
        <Card title="Revenue & Subscriptions">
          {revenueChartData.length === 0 ? (
            <EmptyState
              title="No revenue data"
              description="Revenue will appear here once successful payments are recorded."
            />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: AXIS_TICK }} />
                  <YAxis tick={{ fontSize: 12, fill: AXIS_TICK }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-line)',
                      color: 'var(--color-content)',
                    }}
                  />
                  <Legend wrapperStyle={{ color: 'var(--color-content-muted)' }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#6366f1"
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

        <Card title="Vault Performance">
          {vaults.length === 0 ? (
            <EmptyState
              title="No vault data"
              description="Vault performance will appear here once subscriptions are recorded."
            />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={vaults.map((v) => ({
                    name: v.name,
                    purchases: v.purchases,
                    activeUsers: v.activeUsers,
                    revenue: v.revenue,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: AXIS_TICK }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12, fill: AXIS_TICK }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-line)',
                      color: 'var(--color-content)',
                    }}
                  />
                  <Legend wrapperStyle={{ color: 'var(--color-content-muted)' }} />
                  <Bar dataKey="purchases" name="Purchases" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="activeUsers"
                    name="Active users"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Revenue by Period">
          {revenueChartData.length === 0 ? (
            <EmptyState
              title="No plan data"
              description="Plan performance will appear here once data is available."
            />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueChartData}
                    dataKey="revenue"
                    nameKey="month"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    fill="#8884d8"
                    label
                  >
                    {revenueChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-line)',
                      color: 'var(--color-content)',
                    }}
                  />
                  <Legend wrapperStyle={{ color: 'var(--color-content-muted)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="User Growth">
          {userGrowthData.length === 0 ? (
            <EmptyState
              title="No user growth data"
              description="User registrations will appear here over time."
            />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: AXIS_TICK }} />
                  <YAxis tick={{ fontSize: 12, fill: AXIS_TICK }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-line)',
                      color: 'var(--color-content)',
                    }}
                  />
                  <Legend wrapperStyle={{ color: 'var(--color-content-muted)' }} />
                  <Line
                    type="monotone"
                    dataKey="newUsers"
                    name="New users"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalUsers"
                    name="Total users"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Opportunity Distribution">
          {opportunityCharts.category.length === 0 && opportunityCharts.status.length === 0 ? (
            <EmptyState
              title="No opportunity data"
              description="Opportunity statistics will appear once opportunities exist."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {opportunityCharts.category.length > 0 && (
                <div className="h-56">
                  <p className="mb-2 text-sm font-medium text-content-muted">By Category</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={opportunityCharts.category}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label
                      >
                        {opportunityCharts.category.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'var(--color-surface-elevated)',
                          borderColor: 'var(--color-line)',
                          color: 'var(--color-content)',
                        }}
                      />
                      <Legend wrapperStyle={{ color: 'var(--color-content-muted)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {opportunityCharts.status.length > 0 && (
                <div className="h-56">
                  <p className="mb-2 text-sm font-medium text-content-muted">By Status</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={opportunityCharts.status}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label
                      >
                        {opportunityCharts.status.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'var(--color-surface-elevated)',
                          borderColor: 'var(--color-line)',
                          color: 'var(--color-content)',
                        }}
                      />
                      <Legend wrapperStyle={{ color: 'var(--color-content-muted)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {opportunityCharts.employment.length > 0 && (
                <div className="h-56">
                  <p className="mb-2 text-sm font-medium text-content-muted">By Employment Type</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={opportunityCharts.employment}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: AXIS_TICK }}
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis tick={{ fontSize: 12, fill: AXIS_TICK }} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--color-surface-elevated)',
                          borderColor: 'var(--color-line)',
                          color: 'var(--color-content)',
                        }}
                      />
                      <Bar dataKey="value" name="Count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {opportunityCharts.country.length > 0 && (
                <div className="h-56">
                  <p className="mb-2 text-sm font-medium text-content-muted">By Country / Region</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={opportunityCharts.country}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: AXIS_TICK }}
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis tick={{ fontSize: 12, fill: AXIS_TICK }} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--color-surface-elevated)',
                          borderColor: 'var(--color-line)',
                          color: 'var(--color-content)',
                        }}
                      />
                      <Bar dataKey="value" name="Count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card title="Subscription Status">
          {!overview ||
          (overview.activeSubscriptions === 0 && overview.expiredSubscriptions === 0) ? (
            <EmptyState
              title="No subscription data"
              description="Subscription status will appear here once subscriptions exist."
            />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Active', value: overview?.activeSubscriptions ?? 0 },
                      { name: 'Expired', value: overview?.expiredSubscriptions ?? 0 },
                      { name: 'Cancelled', value: overview?.cancelledSubscriptions ?? 0 },
                      { name: 'Pending', value: overview?.pendingSubscriptions ?? 0 },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#3b82f6" />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-line)',
                      color: 'var(--color-content)',
                    }}
                  />
                  <Legend wrapperStyle={{ color: 'var(--color-content-muted)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Top Performing Vaults">
          {vaults.length === 0 ? (
            <EmptyState title="No vaults" description="Add vaults to see performance metrics." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line">
                <thead className="bg-surface-muted dark:bg-surface">
                  <tr>
                    {['Vault', 'Purchases', 'Active Users', 'Revenue', 'Share'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-content-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-surface dark:bg-surface-elevated">
                  {vaults.map((v) => (
                    <tr key={v.id} className="transition-colors hover:bg-surface-muted">
                      <td className="px-4 py-3 text-sm font-medium text-content">{v.name}</td>
                      <td className="px-4 py-3 text-sm text-content">{v.purchases}</td>
                      <td className="px-4 py-3 text-sm text-content">{v.activeUsers}</td>
                      <td className="px-4 py-3 text-sm text-content">
                        {formatMoney(v.revenue, 'INR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-content">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-line">
                            <div
                              className="h-full rounded-full bg-brand-600 dark:bg-brand-400"
                              style={{ width: `${v.percentageShare}%` }}
                            />
                          </div>
                          <span className="text-content-muted">{v.percentageShare}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="Recent Registrations">
          {!usersData || usersData.recentUsers.length === 0 ? (
            <EmptyState
              title="No recent registrations"
              description="Users who register will appear here."
            />
          ) : (
            <ul className="divide-y divide-line">
              {usersData.recentUsers.slice(0, 10).map((u) => (
                <li key={u.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-content">{u.name || u.email}</p>
                    <p className="truncate text-xs text-content-muted">{u.email}</p>
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-1">
                    <Badge variant={u.roles.includes('ADMIN') ? 'info' : 'neutral'}>
                      {u.roles.join(', ')}
                    </Badge>
                    <span className="text-xs text-content-faint">{formatDate(u.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent Subscriptions">
          {!usersData || usersData.recentSubscriptions.length === 0 ? (
            <EmptyState
              title="No recent subscriptions"
              description="Subscriptions will appear here once created."
            />
          ) : (
            <ul className="divide-y divide-line">
              {usersData.recentSubscriptions.slice(0, 10).map((s) => (
                <li key={s.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-content">
                      {s.userName || s.userEmail}
                    </p>
                    <StatusBadge value={s.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-content-muted">{s.planName}</p>
                  <p className="mt-0.5 text-xs text-content-faint">{formatDate(s.startDate)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recently Published Opportunities">
          {!usersData || usersData.recentOpportunities.length === 0 ? (
            <EmptyState
              title="No recent opportunities"
              description="Published opportunities will appear here."
            />
          ) : (
            <ul className="divide-y divide-line">
              {usersData.recentOpportunities.slice(0, 10).map((o) => (
                <li key={o.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-content">{o.title}</p>
                    <StatusBadge value={o.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-content-muted">
                    {o.company || '—'} {o.location ? `· ${o.location}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-content-faint">{formatDate(o.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
