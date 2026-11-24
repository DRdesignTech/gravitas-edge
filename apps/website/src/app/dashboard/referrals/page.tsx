'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  BadgeVariant,
  Button,
  Card,
  Column,
  EmptyState,
  ErrorState,
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
import {
  HiGift,
  HiCurrencyRupee,
  HiUserGroup,
  HiCheckCircle,
  HiClock,
  HiClipboardDocument,
  HiShare,
  HiArrowPath,
  HiSparkles,
  HiShieldCheck,
  HiDocumentText,
  HiEnvelope,
  HiLink,
  HiBanknotes,
  HiArrowRight,
  HiInformationCircle,
} from 'react-icons/hi2';

const PAGE_SIZE = 10;

// Client-provided reward structure (matches the published Referral Programme
// Terms). NOTE: this is display content only — the active backend ReferralSlab
// rows are 5% / 10% / 15% / 20%. No reward is calculated from these values here.
const REWARD_STRUCTURE = [
  { rate: '10%', range: '1–5 referrals', tier: 'Foundation Partner', desc: 'Starting commission tier on all referred candidate subscription activations.' },
  { rate: '15%', range: '6–10 referrals', tier: 'Growth Partner', desc: 'Enhanced commission tier unlocked automatically upon reaching 6 referrals.' },
  { rate: '20%', range: '11+ referrals', tier: 'Executive Elite', desc: 'Maximum partner tier. Earn 20% on every subscription with no upper cap.' },
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

function commissionSum(stats: CommissionStatistics | null, key: 'pending' | 'approved' | 'paid'): string {
  if (!stats) return '0';
  return stats.counts[key].toString();
}

function statusToVariant(status: string): BadgeVariant {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'SUCCESSFUL':
    case 'APPROVED':
    case 'PAID':
    case 'SUBSCRIBED':
      return 'success';
    case 'PENDING':
    case 'REGISTERED':
      return 'warning';
    case 'INVALID':
    case 'REJECTED':
    case 'CANCELLED':
    case 'SUSPENDED':
    case 'EXPIRED':
      return 'danger';
    default:
      return 'neutral';
  }
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
      showToast('Your referral link and code are ready.', 'success');
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
    const text = `Join me on Gravitas Edge Consulting and unlock verified executive opportunity vaults. Use my referral link: ${summary.referralLink}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const overviewLoading = summaryLoading || (!summary && !summaryError && !generating);
  const overviewError = summaryError || '';

  // Calculate current commission tier for badge display
  const totalRefs = summary?.counts.totalReferrals ?? 0;
  const currentTier =
    totalRefs >= 11
      ? { rate: '20%', label: 'Executive Elite (Tier 3)', tag: 'MAX TIER' }
      : totalRefs >= 6
      ? { rate: '15%', label: 'Growth Partner (Tier 2)', tag: 'TIER 2' }
      : { rate: '10%', label: 'Foundation Partner (Tier 1)', tag: 'TIER 1' };

  // Columns for My Referrals Table
  const referralColumns: Column<ReferralItem>[] = [
    {
      key: 'referredUser',
      label: 'Referred Candidate',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#061B36]/5 text-[#061B36] dark:bg-white/10 dark:text-white">
            <HiEnvelope className="h-3.5 w-3.5" />
          </div>
          <span className="font-medium text-content">{maskEmail(r.referredUser?.email)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <Badge variant={statusToVariant(r.status)}>{titleCase(r.status)}</Badge>,
    },
    {
      key: 'createdAt',
      label: 'Referred On',
      render: (r) => <span className="text-content-muted">{formatDate(r.createdAt)}</span>,
    },
    {
      key: 'successfulDate',
      label: 'Qualified On',
      render: (r) =>
        r.successfulDate ? (
          <span className="text-content-muted">{formatDate(r.successfulDate)}</span>
        ) : (
          <span className="text-content-faint">—</span>
        ),
    },
    {
      key: 'commission',
      label: 'Earned Commission',
      render: (r) => {
        const total = r.commissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
        if (total <= 0) return <span className="text-content-faint">—</span>;
        return <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatAmount(total)}</span>;
      },
    },
  ];

  // Columns for Commission History Table
  const commissionColumns: Column<CommissionItem>[] = [
    {
      key: 'commissionAmount',
      label: 'Commission',
      render: (c) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          {formatAmount(c.commissionAmount)}
        </span>
      ),
    },
    {
      key: 'subscriptionAmount',
      label: 'Subscription',
      render: (c) => <span className="font-medium text-content">{formatAmount(c.subscriptionAmount)}</span>,
    },
    {
      key: 'commissionPercentage',
      label: 'Rate',
      render: (c) => <Badge variant="info">{Number(c.commissionPercentage).toFixed(1)}%</Badge>,
    },
    {
      key: 'plan',
      label: 'Plan',
      render: (c) => <span className="font-medium text-content-muted">{c.subscription?.plan?.name || '—'}</span>,
    },
    {
      key: 'referredUser',
      label: 'Referred Candidate',
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
      label: 'Approved On',
      render: (c) =>
        c.approvedDate ? (
          <span className="text-content-muted">{formatDate(c.approvedDate)}</span>
        ) : (
          <span className="text-content-faint">—</span>
        ),
    },
    {
      key: 'paidDate',
      label: 'Paid On',
      render: (c) =>
        c.paidDate ? (
          <span className="text-content-muted">{formatDate(c.paidDate)}</span>
        ) : (
          <span className="text-content-faint">—</span>
        ),
    },
    {
      key: 'payoutReference',
      label: 'Payout Reference',
      render: (c) =>
        c.payoutReference ? (
          <span className="rounded bg-surface-muted px-2 py-0.5 font-mono text-xs text-content-muted">
            {c.payoutReference}
          </span>
        ) : (
          <span className="text-content-faint">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Executive Page Header ────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C8943E]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#C8943E]">
              <HiSparkles className="h-3.5 w-3.5 text-[#C8943E]" />
              Partner Programme & Wallet
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-content sm:text-3xl">
            Refer & Earn Rewards
          </h1>
          <p className="mt-1 text-sm text-content-muted">
            Share verified opportunities with senior peers. Earn up to 20% recurring commissions on all active subscriptions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/referral-terms"
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-medium text-content-muted transition hover:border-[#C8943E] hover:text-content"
          >
            <HiDocumentText className="h-4 w-4 text-[#C8943E]" />
            Programme Terms
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSummary}
            disabled={summaryLoading}
            title="Refresh metrics"
          >
            <HiArrowPath className={`h-4 w-4 ${summaryLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Top Executive KPI Metrics ────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Total Commissions Earned */}
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:shadow-md dark:bg-surface-elevated">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-content-faint">
              Total Commissions
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C8943E]/10 text-[#C8943E]">
              <HiCurrencyRupee className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-serif-heading text-2xl font-bold tracking-tight text-content sm:text-3xl">
              {formatAmount(summary?.commissionTotalAmount ?? '0')}
            </p>
            <p className="mt-1 text-xs text-content-muted">Lifetime earnings credited to wallet</p>
          </div>
        </div>

        {/* Metric 2: Active Referrals */}
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:shadow-md dark:bg-surface-elevated">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-content-faint">
              Active Referrals
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <HiCheckCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="font-serif-heading text-2xl font-bold tracking-tight text-content sm:text-3xl">
                {summary?.counts.successfulReferrals ?? 0}
              </p>
              <span className="text-xs font-medium text-content-muted">
                of {summary?.counts.totalReferrals ?? 0} total
              </span>
            </div>
            <p className="mt-1 text-xs text-content-muted">Subscribed candidates generating payouts</p>
          </div>
        </div>

        {/* Metric 3: Pending In Pipeline */}
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:shadow-md dark:bg-surface-elevated">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-content-faint">
              Pending Pipeline
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <HiClock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="font-serif-heading text-2xl font-bold tracking-tight text-content sm:text-3xl">
                {summary?.counts.pendingReferrals ?? 0}
              </p>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Awaiting activation</span>
            </div>
            <p className="mt-1 text-xs text-content-muted">Registered candidates awaiting plan purchase</p>
          </div>
        </div>

        {/* Metric 4: Active Tier & Rate */}
        <div className="relative overflow-hidden rounded-2xl border border-[#C8943E]/30 bg-gradient-to-br from-[#061B36] to-[#0B254A] p-5 text-white shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C8943E]">
              Commission Rate
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C8943E]/20 text-[#C8943E]">
              <HiSparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="font-serif-heading text-2xl font-extrabold tracking-tight text-[#E3B968] sm:text-3xl">
                {currentTier.rate}
              </p>
              <span className="rounded-full bg-[#C8943E]/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#E3B968]">
                {currentTier.tag}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#9FB0CC]">{currentTier.label}</p>
          </div>
        </div>
      </div>

      {/* ── Referral Link & Code Showcase Card ──────────── */}
      {summary?.referralCode ? (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card transition dark:bg-surface-elevated">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
            {/* Link Side */}
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2">
                <HiLink className="h-4 w-4 text-[#C8943E]" />
                <span className="text-xs font-bold uppercase tracking-wider text-content-faint">
                  Your Unique Referral Link
                </span>
              </div>
              <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <input
                    type="text"
                    readOnly
                    value={summary.referralLink}
                    className="w-full rounded-xl border border-line bg-surface-muted px-3.5 py-2.5 font-mono text-xs text-content shadow-inner focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(summary.referralLink, 'Referral link')}
                    className="whitespace-nowrap"
                  >
                    <HiClipboardDocument className="h-4 w-4 text-[#C8943E]" />
                    Copy Link
                  </Button>
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1DA851] active:scale-[0.98]"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                    WhatsApp
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-content-muted">
                Direct colleagues straight to registration with your referral credentials automatically embedded.
              </p>
            </div>

            {/* Code Side */}
            <div className="border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 lg:col-span-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HiGift className="h-4 w-4 text-[#C8943E]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-content-faint">
                    Your Referral Code
                  </span>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Ready to Share
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#C8943E]/50 bg-[#FFF3D9]/30 p-3 dark:bg-[#C8943E]/10">
                <span className="font-mono text-xl font-bold tracking-wider text-[#061B36] dark:text-[#E3B968]">
                  {summary.referralCode}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(summary.referralCode, 'Referral code')}
                  className="shrink-0"
                >
                  <HiClipboardDocument className="h-3.5 w-3.5 text-[#C8943E]" />
                  Copy Code
                </Button>
              </div>
              <p className="mt-2 text-xs text-content-muted">
                Can be entered manually during signup or subscription checkout.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card dark:bg-surface-elevated">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <div>
              <h3 className="text-base font-semibold text-content">
                Activate Your Executive Referral Programme
              </h3>
              <p className="mt-1 text-sm text-content-muted">
                Generate your personal referral code and link to begin inviting candidates and earning recurring commissions.
              </p>
            </div>
            <Button onClick={handleGenerateCode} loading={generating} className="shrink-0">
              <HiSparkles className="h-4 w-4 text-[#C8943E]" />
              Generate My Referral Code
            </Button>
          </div>
        </div>
      )}

      {/* ── Segmented Tab Navigation ────────────────────── */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-4">
        <button
          onClick={() => setTab('overview')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            tab === 'overview'
              ? 'bg-[#061B36] text-white shadow-sm dark:bg-[#C8943E] dark:text-[#061B36]'
              : 'border border-line bg-surface text-content-muted hover:border-[#C8943E]/50 hover:bg-surface-muted hover:text-content'
          }`}
        >
          <HiSparkles className="h-4 w-4" />
          Overview & Rewards
        </button>
        <button
          onClick={() => setTab('referrals')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            tab === 'referrals'
              ? 'bg-[#061B36] text-white shadow-sm dark:bg-[#C8943E] dark:text-[#061B36]'
              : 'border border-line bg-surface text-content-muted hover:border-[#C8943E]/50 hover:bg-surface-muted hover:text-content'
          }`}
        >
          <HiUserGroup className="h-4 w-4" />
          My Referrals
          {summary?.counts.totalReferrals !== undefined && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                tab === 'referrals'
                  ? 'bg-white/20 text-white dark:bg-[#061B36]/20 dark:text-[#061B36]'
                  : 'bg-surface-muted text-content-muted'
              }`}
            >
              {summary.counts.totalReferrals}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('commissions')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            tab === 'commissions'
              ? 'bg-[#061B36] text-white shadow-sm dark:bg-[#C8943E] dark:text-[#061B36]'
              : 'border border-line bg-surface text-content-muted hover:border-[#C8943E]/50 hover:bg-surface-muted hover:text-content'
          }`}
        >
          <HiCurrencyRupee className="h-4 w-4" />
          Commission History
          {stats?.counts.total !== undefined && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                tab === 'commissions'
                  ? 'bg-white/20 text-white dark:bg-[#061B36]/20 dark:text-[#061B36]'
                  : 'bg-surface-muted text-content-muted'
              }`}
            >
              {stats.counts.total}
            </span>
          )}
        </button>
      </div>

      {/* ── Overview Tab ─────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
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
              {/* Commission Reward Tiers */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-content">
                      Tiered Partner Reward Structure
                    </h3>
                    <p className="mt-0.5 text-xs text-content-muted">
                      Your commission percentage scales automatically with the total number of candidates referred.
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-[#C8943E]">
                    <HiShieldCheck className="h-4 w-4" /> Verified Payout Slabs
                  </span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {REWARD_STRUCTURE.map((tier, idx) => {
                    const isCurrent =
                      (idx === 0 && totalRefs <= 5) ||
                      (idx === 1 && totalRefs >= 6 && totalRefs <= 10) ||
                      (idx === 2 && totalRefs >= 11);

                    return (
                      <div
                        key={tier.rate}
                        className={`relative rounded-2xl border p-5 transition ${
                          isCurrent
                            ? 'border-[#C8943E] bg-[#FFF3D9]/30 shadow-md ring-1 ring-[#C8943E]/50 dark:bg-[#C8943E]/10'
                            : 'border-line bg-surface dark:bg-surface-elevated'
                        }`}
                      >
                        {isCurrent && (
                          <div className="absolute -top-3 right-4">
                            <span className="rounded-full bg-[#061B36] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#E3B968] shadow-sm dark:bg-[#C8943E] dark:text-[#061B36]">
                              Current Tier
                            </span>
                          </div>
                        )}
                        <span className="text-xs font-semibold uppercase tracking-wider text-content-faint">
                          {tier.tier}
                        </span>
                        <p className="mt-2 font-serif-heading text-3xl font-extrabold tracking-tight text-[#C8943E]">
                          {tier.rate}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-content">{tier.range}</p>
                        <p className="mt-2 text-xs leading-relaxed text-content-muted">{tier.desc}</p>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-content-muted">
                  From 11 referrals onwards, you remain at the maximum 20% tier on all subsequent candidate subscription purchases with no upper limit.
                </p>
              </div>

              {/* Commission Lifecycle Overview */}
              <div>
                <h3 className="text-base font-semibold text-content">Commission Status Breakdown</h3>
                <p className="mt-0.5 text-xs text-content-muted">
                  Overview of commission payouts across verification stages.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-line bg-surface p-4 dark:bg-surface-elevated">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        Pending Verification
                      </span>
                      <HiClock className="h-4 w-4 text-amber-500" />
                    </div>
                    <p className="mt-2 text-xl font-bold text-content">
                      {commissionSum(stats, 'pending')} orders
                    </p>
                    <p className="mt-1 text-xs text-content-muted">
                      Transactions being reviewed and within standard cooling period
                    </p>
                  </div>

                  <div className="rounded-2xl border border-line bg-surface p-4 dark:bg-surface-elevated">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        Approved for Payout
                      </span>
                      <HiShieldCheck className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="mt-2 text-xl font-bold text-content">
                      {commissionSum(stats, 'approved')} orders
                    </p>
                    <p className="mt-1 text-xs text-content-muted">
                      Verified commissions queued for next bank settlement cycle
                    </p>
                  </div>

                  <div className="rounded-2xl border border-line bg-surface p-4 dark:bg-surface-elevated">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Paid Out to Account
                      </span>
                      <HiCheckCircle className="h-4 w-4 text-emerald-500" />
                    </div>
                    <p className="mt-2 text-xl font-bold text-content">
                      {commissionSum(stats, 'paid')} orders
                    </p>
                    <p className="mt-1 text-xs text-content-muted">
                      Successfully disbursed to your designated bank account
                    </p>
                  </div>
                </div>
              </div>

              {/* How It Works Guide */}
              <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm dark:bg-surface-elevated">
                <h3 className="text-base font-semibold text-content">How the Referral Programme Works</h3>
                <div className="mt-4 grid gap-6 sm:grid-cols-3">
                  <div className="flex flex-col">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#061B36]/5 text-[#061B36] font-bold dark:bg-white/10 dark:text-white">
                      1
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-content">Share Your Invite Link</h4>
                    <p className="mt-1 text-xs leading-relaxed text-content-muted">
                      Copy your personal link or share your code directly with senior executives seeking curated opportunities.
                    </p>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#061B36]/5 text-[#061B36] font-bold dark:bg-white/10 dark:text-white">
                      2
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-content">Colleague Subscribes</h4>
                    <p className="mt-1 text-xs leading-relaxed text-content-muted">
                      When your referred candidate joins and unlocks any opportunity vault or plan, the order is linked to your partner wallet.
                    </p>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#061B36]/5 text-[#061B36] font-bold dark:bg-white/10 dark:text-white">
                      3
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-content">Receive Cash Payouts</h4>
                    <p className="mt-1 text-xs leading-relaxed text-content-muted">
                      Earn up to 20% of every subscription. Payouts are credited regularly directly to your bank account or wallet.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-surface-muted p-4 text-xs text-content-muted">
                <span>
                  All referral commissions and disbursements are governed by the{' '}
                  <Link
                    href="/referral-terms"
                    className="font-medium text-[#C8943E] underline underline-offset-2 hover:text-[#B6822E]"
                  >
                    Referral Programme Terms & Conditions
                  </Link>
                  .
                </span>
                <Link
                  href="/referral-terms"
                  className="hidden sm:inline-flex items-center gap-1 font-semibold text-content hover:text-[#C8943E]"
                >
                  View Terms <HiArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── My Referrals Tab ─────────────────────────────── */}
      {tab === 'referrals' && (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-base font-semibold text-content">Referred Candidates</h3>
              <p className="text-xs text-content-muted">
                Candidates who joined Gravitas Edge using your invitation link or code.
              </p>
            </div>
            <div className="w-full sm:w-64">
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
          </div>

          <Card padding={false}>
            {refLoading && referrals === null ? (
              <div className="space-y-3 p-6">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : refError ? (
              <ErrorState message={refError} onRetry={() => loadReferrals(refPage, refStatus)} />
            ) : referrals && referrals.items.length === 0 ? (
              <EmptyState
                icon={<HiUserGroup className="h-8 w-8 text-[#C8943E]" />}
                title="No referrals found"
                description={
                  refStatus
                    ? `No referred candidates found with status "${titleCase(refStatus)}".`
                    : 'Share your referral code and earn cash rewards when your colleagues subscribe.'
                }
                action={
                  <Button onClick={() => setTab('overview')}>
                    <HiShare className="h-4 w-4" />
                    Get My Referral Link
                  </Button>
                }
              />
            ) : referrals ? (
              <>
                <Table<ReferralItem>
                  columns={referralColumns}
                  data={referrals.items}
                  rowKey={(r) => r.id}
                  emptyMessage="No referrals matching criteria"
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

      {/* ── Commission History Tab ───────────────────────── */}
      {tab === 'commissions' && (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-base font-semibold text-content">Commission Earnings History</h3>
              <p className="text-xs text-content-muted">
                Detailed transaction records of all subscription purchases attributed to your account.
              </p>
            </div>
            <div className="w-full sm:w-64">
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
          </div>

          <Card padding={false}>
            {comLoading && commissions === null ? (
              <div className="space-y-3 p-6">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : comError ? (
              <ErrorState message={comError} onRetry={() => loadCommissions(comPage, comStatus)} />
            ) : commissions && commissions.items.length === 0 ? (
              <EmptyState
                icon={<HiCurrencyRupee className="h-8 w-8 text-[#C8943E]" />}
                title="No commissions found"
                description={
                  comStatus
                    ? `No commission records found with status "${titleCase(comStatus)}".`
                    : 'When someone you refer makes an eligible subscription purchase, your commission will appear here.'
                }
                action={
                  <Button onClick={() => setTab('overview')}>
                    <HiGift className="h-4 w-4" />
                    View Referral Link
                  </Button>
                }
              />
            ) : commissions ? (
              <>
                <Table<CommissionItem>
                  columns={commissionColumns}
                  data={commissions.items}
                  rowKey={(c) => c.id}
                  emptyMessage="No commissions matching criteria"
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
