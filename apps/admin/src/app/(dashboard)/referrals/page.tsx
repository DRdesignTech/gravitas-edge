'use client';

import { useEffect, useState } from 'react';
import { adminGetReferral, adminListReferrals, adminSuspendReferral } from '@/lib/services';
import { PaginatedResult, Referral, REFERRAL_STATUSES, REFERRAL_STATUS_LABELS } from '@/lib/types';
import {
  ActionMenu,
  Badge,
  Button,
  Card,
  Column,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Skeleton,
  Table,
  Textarea,
  useToast,
} from '@/components/ui';
import { formatDateTime, formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'SUCCESSFUL') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'INVALID') return 'neutral';
  if (status === 'SUSPENDED') return 'danger';
  return 'neutral';
}

function userName(user?: { id: string; email: string }) {
  return user?.email ?? '—';
}

export default function ReferralsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<PaginatedResult<Referral> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<Referral | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [suspendTarget, setSuspendTarget] = useState<Referral | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendError, setSuspendError] = useState('');
  const [suspending, setSuspending] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    adminListReferrals({ page, limit: 15, search, status, fromDate, toDate })
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, fromDate, toDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const openDetail = (id: string) => {
    setDetail(null);
    setDetailLoading(true);
    setDetailError('');
    adminGetReferral(id)
      .then((r) => setDetail(r))
      .catch((e) => setDetailError(getErrorMessage(e)))
      .finally(() => setDetailLoading(false));
  };

  const openSuspend = (r: Referral) => {
    setSuspendTarget(r);
    setSuspendReason('');
    setSuspendError('');
  };

  const confirmSuspend = () => {
    if (!suspendTarget) return;
    if (!suspendReason.trim()) {
      setSuspendError('A reason is required');
      return;
    }
    setSuspending(true);
    setSuspendError('');
    adminSuspendReferral(suspendTarget.id, { reason: suspendReason.trim() })
      .then(() => {
        showToast(`${suspendTarget.code} suspended`, 'success');
        setSuspendTarget(null);
        load();
      })
      .catch((e) => setSuspendError(getErrorMessage(e)))
      .finally(() => setSuspending(false));
  };

  const columns: Column<Referral>[] = [
    {
      key: 'referrer',
      label: 'Referrer',
      render: (r) => <span className="text-content">{userName(r.referrer)}</span>,
    },
    {
      key: 'referred',
      label: 'Referred User',
      render: (r) => <span className="text-content">{userName(r.referredUser)}</span>,
    },
    {
      key: 'code',
      label: 'Code',
      render: (r) => <span className="font-mono text-xs text-content">{r.code}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <Badge variant={statusVariant(r.status)}>
          {REFERRAL_STATUS_LABELS[r.status] ?? r.status}
        </Badge>
      ),
    },
    {
      key: 'successfulDate',
      label: 'Successful',
      render: (r) => <span className="text-content-muted">{formatDateTime(r.successfulDate)}</span>,
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (r) => <span className="text-content-muted">{formatDateTime(r.createdAt)}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <>
          <div className="hidden items-center gap-2 sm:flex">
            <Button size="sm" variant="secondary" onClick={() => openDetail(r.id)}>
              View
            </Button>
            {r.status !== 'SUCCESSFUL' && (
              <Button size="sm" variant="danger" onClick={() => openSuspend(r)}>
                Suspend
              </Button>
            )}
          </div>
          <ActionMenu
            className="sm:hidden"
            label={`Actions for ${r.code}`}
            items={[
              { label: 'View', onClick: () => openDetail(r.id) },
              ...(r.status !== 'SUCCESSFUL'
                ? [{ label: 'Suspend', danger: true, onClick: () => openSuspend(r) }]
                : []),
            ]}
          />
        </>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Referrals"
        subtitle={
          data
            ? `${data.meta.totalItems.toLocaleString()} total referrals`
            : 'Manage referral attributions'
        }
      />

      <Card className="mb-6" padding={false}>
        <form onSubmit={handleSearch} className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-5">
          <Input
            label="Search"
            placeholder="Name, email or code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            label="Status"
            placeholder="All"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            options={REFERRAL_STATUSES.map((s) => ({ value: s, label: REFERRAL_STATUS_LABELS[s] }))}
          />
          <Input
            label="From"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            label="To"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Search
            </Button>
          </div>
        </form>
      </Card>

      {loading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : data && data.items.length > 0 ? (
        <>
          <Table columns={columns} data={data.items} />
          <Pagination
            currentPage={data.meta.page}
            totalPages={data.meta.totalPages}
            onPageChange={setPage}
          />
        </>
      ) : (
        <Card>
          <EmptyState
            title="No referrals found"
            description="Try adjusting your search or filters."
          />
        </Card>
      )}

      <Modal
        isOpen={!!detail || detailLoading}
        onClose={() => setDetail(null)}
        title="Referral Details"
        size="lg"
      >
        {detailLoading ? (
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : detailError ? (
          <ErrorState message={detailError} onRetry={() => detail && openDetail(detail.id)} />
        ) : detail ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Code
                </p>
                <p className="font-mono text-sm text-content">{detail.code}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Status
                </p>
                <Badge variant={statusVariant(detail.status)}>
                  {REFERRAL_STATUS_LABELS[detail.status] ?? detail.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Referrer
                </p>
                <p className="text-sm text-content">{userName(detail.referrer)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Referred user
                </p>
                <p className="text-sm text-content">{userName(detail.referredUser)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Created
                </p>
                <p className="text-sm text-content">{formatDateTime(detail.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Successful
                </p>
                <p className="text-sm text-content">{formatDateTime(detail.successfulDate)}</p>
              </div>
            </div>

            {detail.referralLink && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Referral link
                </p>
                <p className="break-all rounded-lg border border-line bg-surface-muted px-3 py-2 text-xs text-content dark:bg-surface">
                  {detail.referralLink}
                </p>
              </div>
            )}

            {detail.invalidReason && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Invalid reason
                </p>
                <p className="text-sm text-content">{detail.invalidReason}</p>
              </div>
            )}
            {detail.suspendedReason && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Suspend reason
                </p>
                <p className="text-sm text-content">{detail.suspendedReason}</p>
              </div>
            )}

            {detail.commissions.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Commissions
                </p>
                <div className="space-y-2">
                  {detail.commissions.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-line px-3 py-2"
                    >
                      <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                      <span className="text-sm font-medium text-content">
                        {formatMoney(c.commissionAmount, 'USD')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        title="Suspend referral"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setSuspendTarget(null)}
              disabled={suspending}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmSuspend} loading={suspending}>
              Suspend
            </Button>
          </div>
        }
      >
        <Textarea
          label="Reason"
          required
          rows={3}
          placeholder="Required • e.g. Fraudulent sign-up detected"
          value={suspendReason}
          onChange={(e) => setSuspendReason(e.target.value)}
          error={suspendError}
        />
      </Modal>
    </div>
  );
}
