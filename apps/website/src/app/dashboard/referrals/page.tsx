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

// Client-provided reward structure (matches the published Referral Programme
// Terms). NOTE: this is display content only — the active backend ReferralSlab
// rows are 5% / 10% / 15% / 20%. No reward is calculated from these values here.
const REWARD_STRUCTURE = [
  { rate: '10%', range: '1–5 referrals' },
  { rate: '15%', range: '6–10 referrals' },
  { rate: '20%', range: '11+ referrals' },
];

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

function WhatsAppIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 004.74 1.21c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.83 9.83 0 0012.04 2zm0 18.15a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.83c0 4.54-3.69 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29z" />
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

  const handleShareWhatsApp = () => {
    if (!summary?.referralLink) return;
    const text = `Join me on Gravitas Edge Consulting and unlock premium opportunity vaults. Use my referral link: ${summary.referralLink}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const overviewLoading = summaryLoading || (!summary && !summaryError && !generating);
  const overviewError = summaryError || '';

  return (
    <div>
      <PageHeader
        title="Refer & Earn"
        subtitle="Share opportunities with your network and earn rewards."
      />

      {/* Tab navigation */}
      <div className="mt-6 flex flex-wrap gap-1 rounded-2xl border border-line bg-surface p-1 card-static dark:bg-surface-elevated">
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
              {/* Referral link + code */}
              {summary?.referralCode ? (
                <Card>
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Your referral link */}
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wider text-content-faint">
                        Your Referral Link
                      </p>
                      <p className="mt-1.5 break-all text-sm text-content-muted">
                        {summary.referralLink}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(summary.referralLink, 'Referral link')}
                        >
                          Copy Link
                        </Button>
                        <button
                          type="button"
                          onClick={handleShareWhatsApp}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#1DA851] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.98]"
                        >
                          <WhatsAppIcon />
                          Share via WhatsApp
                        </button>
                      </div>
                    </div>

                    {/* Your referral code */}
                    <div className="min-w-0 md:border-l md:border-line md:pl-6">
                      <p className="text-xs font-medium uppercase tracking-wider text-content-faint">
                        Your Referral Code
                      </p>
                      <p className="mt-1 break-all font-mono text-2xl font-bold tracking-tight text-content">
                        {summary.referralCode}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(summary.referralCode, 'Referral code')}
                        >
                          Copy Code
                        </Button>
                      </div>
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

              {/* Referral rewards structure */}
              <div>
                <h3 className="mb-3 text-base font-semibold text-content">
                  Referral Rewards Structure
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  {REWARD_STRUCTURE.map((tier) => (
                    <div
                      key={tier.rate}
                      className="rounded-2xl border border-line bg-surface p-5 text-center card-static dark:bg-surface-elevated"
                    >
                      <p className="font-serif-heading text-3xl font-extrabold tracking-tight text-[#C8943E]">
                        {tier.rate}
                      </p>
                      <p className="mt-2 text-sm font-medium text-content-muted">{tier.range}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm text-content-muted">
                  From 11 referrals onwards, you continue to earn 20% on every additional referral.
                  No upper limit on the number of referrals.
                </p>
              </div>

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
    info: 'bg-[#061B36]/5 text-[#061B36] dark:bg-blue-500/10 dark:text-blue-400',
  };
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 card-static dark:bg-surface-elevated">
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
