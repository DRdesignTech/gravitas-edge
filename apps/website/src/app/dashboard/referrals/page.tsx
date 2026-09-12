'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  Column,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Skeleton,
  Select,
  SelectOption,
  Table,
  useToast,
} from '@/components/ui';
import {
  CommissionItem,
  COMMISSION_STATUSES,
  CommissionStatistics,
  PaginatedResult,
  ReferralItem,
  REFERRAL_STATUSES,
  ReferralSummary,
} from '@/lib/types';
import {
  fetchCommissionStatistics,
  fetchMyCommissions,
  fetchMyReferrals,
  fetchReferralSummary,
  generateReferralCode,
} from '@/lib/services';
import { formatDate, formatMoney, titleCase } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

const PAGE_SIZE = 10;

type Tab = 'overview' | 'referrals' | 'commissions';

const REFERRAL_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'All statuses' },
  ...REFERRAL_STATUSES.map((s) => ({ value: s, label: titleCase(s) })),
];

const COMMISSION_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'All statuses' },
  ...COMMISSION_STATUSES.map((s) => ({ value: s, label: titleCase(s) })),
];

function ReferralIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function maskEmail(email?: string | null): string {
  if (!email) return '—';
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const safe = user.length <= 2 ? user[0] + '***' : user.slice(0, 2) + '***';
  return `${safe}@${domain}`;
}

function formatAmount(amount: string | number): string {
  return formatMoney(Number(amount), 'INR');
}

export default function ReferralsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');

  // Overview
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [stats, setStats] = useState<CommissionStatistics | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [generating, setGenerating] = useState(false);

  // My Referrals
  const [referrals, setReferrals] = useState<PaginatedResult<ReferralItem> | null>(null);
  const [refPage, setRefPage] = useState(1);
  const [refStatus, setRefStatus] = useState('');
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState('');

  // Commissions
  const [commissions, setCommissions] = useState<PaginatedResult<CommissionItem> | null>(null);
  const [comPage, setComPage] = useState(1);
  const [comStatus, setComStatus] = useState('');
  const [comLoading, setComLoading] = useState(false);
  const [comError, setComError] = useState('');

  const loadSummary = useCallback(() => {
    setSummaryLoading(true);
    setSummaryError('');
    Promise.all([fetchReferralSummary(), fetchCommissionStatistics()])
      .then(([s, st]) => {
        setSummary(s);
        setStats(st);
      })
      .catch((e) => setSummaryError(getErrorMessage(e)))
      .finally(() => setSummaryLoading(false));
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const loadReferrals = useCallback((page: number, status: string) => {
    setRefLoading(true);
    setRefError('');
    fetchMyReferrals({ page, limit: PAGE_SIZE, status: status || undefined })
      .then(setReferrals)
      .catch((e) => setRefError(getErrorMessage(e)))
      .finally(() => setRefLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'referrals') return;
    loadReferrals(refPage, refStatus);
  }, [tab, refPage, refStatus, loadReferrals]);

  const loadCommissions = useCallback((page: number, status: string) => {
    setComLoading(true);
    setComError('');
    fetchMyCommissions({ page, limit: PAGE_SIZE, status: status || undefined })
      .then(setCommissions)
      .catch((e) => setComError(getErrorMessage(e)))
      .finally(() => setComLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'commissions') return;
    loadCommissions(comPage, comStatus);
  }, [tab, comPage, comStatus, loadCommissions]);

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const code = await generateReferralCode();
      setSummary((prev) => (prev ? { ...prev, ...code } : prev));
      showToast('Your referral link is ready.', 'success');
      loadSummary();
    } catch (e) {
      showToast(getErrorMessage(e), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard.`, 'success');
    } catch {
      showToast('Copy failed. Please copy manually.', 'error');
    }
  };

  const handleShare = async () => {
    if (!summary?.referralLink) return;
    const data = {
      title: 'Refer & earn',
      text: `Join me on Gravitas Edge Consulting — you get premium referral vaults. Use my code ${summary.referralCode}`,
      url: summary.referralLink,
    };
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(data);
      } catch {
        // user cancelled share — no toast
      }
    } else {
      copyToClipboard(summary.referralLink, 'Referral link');
    }
  };

  const overviewLoading = summaryLoading || (!summary && !summaryError && !generating);
  const overviewError = summaryError || '';

  return (
    <div>
      <PageHeader
        title="Referrals"
        subtitle="Share your code and earn commissions on every successful referral."
      />

      {/* Tab navigation */}
      <div className="mt-6 flex flex-wrap gap-1 rounded-2xl border border-line bg-surface p-1 shadow-card dark:bg-surface-elevated">
        {(
          [
            ['overview', 'Overview'],
            ['referrals', 'My Referrals'],
            ['commissions', 'Commission History'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-content-muted hover:bg-surface-muted hover:text-content'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────── */}
      {tab === 'overview' && (
        <div className="mt-6 space-y-6">
          {overviewLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-28" />
            </div>
          ) : overviewError ? (
            <Card>
              <ErrorState message={overviewError} onRetry={loadSummary} />
            </Card>
          ) : (
            <>
              {/* Referral code + link */}
              {summary?.referralCode ? (
                <Card>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wider text-content-faint">
                        Your referral code
                      </p>
                      <p className="mt-1 break-all font-mono text-2xl font-bold tracking-tight text-content">
                        {summary.referralCode}
                      </p>
                      <p className="mt-1 break-all text-sm text-content-muted">
                        {summary.referralLink}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(summary.referralCode, 'Referral code')}
                      >
                        Copy code
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(summary.referralLink, 'Referral link')}
                      >
                        Copy link
                      </Button>
                      <Button size="sm" onClick={handleShare}>
                        Share
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card>
                  <p className="text-sm text-content-muted">
                    Generate your unique referral code to start earning commissions.
                  </p>
                  <Button className="mt-4" onClick={handleGenerateCode} loading={generating}>
                    Generate my referral code
                  </Button>
                </Card>
              )}

              {/* Referral counts */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatBlock label="Total referrals" value={summary?.counts.totalReferrals ?? 0} />
                <StatBlock
                  label="Successful"
                  value={summary?.counts.successfulReferrals ?? 0}
                  accent="success"
                />
                <StatBlock
                  label="Pending"
                  value={summary?.counts.pendingReferrals ?? 0}
                  accent="warning"
                />
              </div>

              {/* Commission totals */}
              <div>
                <h3 className="mb-3 text-base font-semibold text-content">Commission</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatBlock
                    label="Total commission"
                    value={formatAmount(summary?.commissionTotalAmount ?? '0')}
                    accent="brand"
                  />
                  <StatBlock
                    label="Pending"
                    value={formatAmount(commissionSum(stats, 'pending'))}
                    accent="warning"
                  />
                  <StatBlock
                    label="Approved"
                    value={formatAmount(commissionSum(stats, 'approved'))}
                    accent="info"
                  />
                  <StatBlock
                    label="Paid"
                    value={formatAmount(commissionSum(stats, 'paid'))}
                    accent="success"
                  />
                </div>
              </div>

              {/* Referral programme terms */}
              <p className="text-sm text-content-muted">
                Rewards are subject to the{' '}
                <Link
                  href="/referral-terms"
                  className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
                >
                  Referral Programme Terms
                </Link>
                .
              </p>
            </>
          )}
        </div>
      )}

      {/* ── My Referrals tab ─────────────────────────── */}
      {tab === 'referrals' && (
        <div className="mt-6 space-y-4">
          <div className="flex w-full sm:w-64">
            <Select
              label="Filter by status"
              options={REFERRAL_FILTER_OPTIONS}
              value={refStatus}
              onChange={(e) => {
                setRefStatus(e.target.value);
                setRefPage(1);
              }}
            />
          </div>

          <Card padding={false}>
            {refLoading && referrals === null ? (
              <div className="p-6">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : refError ? (
              <ErrorState message={refError} onRetry={() => loadReferrals(refPage, refStatus)} />
            ) : referrals && referrals.items.length === 0 ? (
              <EmptyState
                icon={<ReferralIcon className="h-6 w-6" />}
                title="No referrals yet"
                description="Share your referral code and get rewarded when people sign up with it."
                action={<Button onClick={() => setTab('overview')}>Get my referral code</Button>}
              />
            ) : referrals ? (
              <>
                <Table<ReferralItem>
                  columns={referralColumns}
                  data={referrals.items}
                  rowKey={(r) => r.id}
                  emptyMessage="No referrals found"
                />
                <div className="border-t border-line p-4">
                  <Pagination
                    currentPage={referrals.meta.page}
                    totalPages={referrals.meta.totalPages}
                    onPageChange={setRefPage}
                  />
                </div>
              </>
            ) : null}
          </Card>
        </div>
      )}

      {/* ── Commission History tab ───────────────────── */}
      {tab === 'commissions' && (
        <div className="mt-6 space-y-4">
          <div className="flex w-full sm:w-64">
            <Select
              label="Filter by status"
              options={COMMISSION_FILTER_OPTIONS}
              value={comStatus}
              onChange={(e) => {
                setComStatus(e.target.value);
                setComPage(1);
              }}
            />
          </div>

          <Card padding={false}>
            {comLoading && commissions === null ? (
              <div className="p-6">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : comError ? (
              <ErrorState message={comError} onRetry={() => loadCommissions(comPage, comStatus)} />
            ) : commissions && commissions.items.length === 0 ? (
              <EmptyState
                icon={<ReferralIcon className="h-6 w-6" />}
                title="No commissions yet"
                description="When someone you refer makes a subscription purchase, your commission will appear here."
                action={<Button onClick={() => setTab('overview')}>Get my referral code</Button>}
              />
            ) : commissions ? (
              <>
                <Table<CommissionItem>
                  columns={commissionColumns}
                  data={commissions.items}
                  rowKey={(c) => c.id}
                  emptyMessage="No commissions found"
                />
                <div className="border-t border-line p-4">
                  <Pagination
                    currentPage={commissions.meta.page}
                    totalPages={commissions.meta.totalPages}
                    onPageChange={setComPage}
                  />
                </div>
              </>
            ) : null}
          </Card>
        </div>
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  accent = 'brand',
}: {
  label: string;
  value: React.ReactNode;
  accent?: 'brand' | 'success' | 'warning' | 'info';
}) {
  const accents: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  };
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card dark:bg-surface-elevated">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${accents[accent]}`}
      >
        {label}
      </span>
      <p className="mt-3 break-all text-2xl font-bold tracking-tight text-content">{value}</p>
    </div>
  );
}

function commissionSum(stats: CommissionStatistics | null, key: 'pending' | 'approved' | 'paid') {
  if (!stats) return '0';
  return stats.counts[key].toString();
}

const referralColumns: Column<ReferralItem>[] = [
  {
    key: 'referredUser',
    label: 'Referred user',
    render: (r) => <p className="text-content">{maskEmail(r.referredUser?.email)}</p>,
  },
  {
    key: 'status',
    label: 'Status',
    render: (r) => <Badge variant={statusToVariant(r.status)}>{titleCase(r.status)}</Badge>,
  },
  {
    key: 'createdAt',
    label: 'Referred on',
    render: (r) => <span className="text-content-muted">{formatDate(r.createdAt)}</span>,
  },
  {
    key: 'successfulDate',
    label: 'Qualified on',
    render: (r) =>
      r.successfulDate ? (
        <span className="text-content-muted">{formatDate(r.successfulDate)}</span>
      ) : (
        <span className="text-content-faint">—</span>
      ),
  },
  {
    key: 'commission',
    label: 'Commission',
    render: (r) => {
      const total = r.commissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
      if (total <= 0) return <span className="text-content-faint">—</span>;
      return <span className="font-medium text-content">{formatAmount(total)}</span>;
    },
  },
];

const commissionColumns: Column<CommissionItem>[] = [
  {
    key: 'commissionAmount',
    label: 'Commission',
    render: (c) => (
      <span className="font-semibold text-content">{formatAmount(c.commissionAmount)}</span>
    ),
  },
  {
    key: 'subscriptionAmount',
    label: 'Subscription',
    render: (c) => <span className="text-content">{formatAmount(c.subscriptionAmount)}</span>,
  },
  {
    key: 'commissionPercentage',
    label: 'Rate',
    render: (c) => <Badge variant="info">{Number(c.commissionPercentage).toFixed(2)}%</Badge>,
  },
  {
    key: 'plan',
    label: 'Plan',
    render: (c) => <span className="text-content-muted">{c.subscription?.plan?.name || '—'}</span>,
  },
  {
    key: 'referredUser',
    label: 'Referred user',
    render: (c) => (
      <span className="text-content-muted">{maskEmail(c.referral?.referredUser?.email)}</span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (c) => <Badge variant={statusToVariant(c.status)}>{titleCase(c.status)}</Badge>,
  },
  {
    key: 'approvedDate',
    label: 'Approved',
    render: (c) =>
      c.approvedDate ? (
        <span className="text-content-muted">{formatDate(c.approvedDate)}</span>
      ) : (
        <span className="text-content-faint">—</span>
      ),
  },
  {
    key: 'paidDate',
    label: 'Paid',
    render: (c) =>
      c.paidDate ? (
        <span className="text-content-muted">{formatDate(c.paidDate)}</span>
      ) : (
        <span className="text-content-faint">—</span>
      ),
  },
  {
    key: 'payoutReference',
    label: 'Payout ref',
    render: (c) =>
      c.payoutReference ? (
        <span className="break-all font-mono text-xs text-content-muted">{c.payoutReference}</span>
      ) : (
        <span className="text-content-faint">—</span>
      ),
  },
];

function statusToVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'SUCCESSFUL':
    case 'APPROVED':
    case 'PAID':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'INVALID':
    case 'REJECTED':
    case 'CANCELLED':
    case 'SUSPENDED':
      return 'danger';
    default:
      return 'neutral';
  }
}
