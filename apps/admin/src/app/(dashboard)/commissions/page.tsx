'use client';

import { useEffect, useState } from 'react';
import {
  adminApproveCommission,
  adminCancelCommission,
  adminGetCommission,
  adminListCommissions,
  adminPayCommission,
  adminRejectCommission,
} from '@/lib/services';
import {
  COMMISSION_STATUSES,
  COMMISSION_STATUS_LABELS,
  PaginatedResult,
  ReferralCommission,
} from '@/lib/types';
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

type ActionType = 'approve' | 'reject' | 'pay' | 'cancel';

interface ActionState {
  type: ActionType;
  commission: ReferralCommission;
}

interface ActionConfig {
  title: string;
  description: string;
  fieldLabel: string;
  fieldPlaceholder: string;
  required: boolean;
  submitText: string;
  danger?: boolean;
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'PAID') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'APPROVED') return 'info';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'danger';
  return 'neutral';
}

const configs: Record<ActionType, ActionConfig> = {
  approve: {
    title: 'Approve commission',
    description: 'Confirm this commission after manual review.',
    fieldLabel: 'Note (optional)',
    fieldPlaceholder: 'e.g. Verified subscription is active',
    required: false,
    submitText: 'Approve',
  },
  reject: {
    title: 'Reject commission',
    description: 'A reason is required. Rejection is final for a PENDING commission.',
    fieldLabel: 'Reason',
    fieldPlaceholder: 'e.g. Subscription refunded before activation completed',
    required: true,
    submitText: 'Reject',
    danger: true,
  },
  pay: {
    title: 'Mark as paid',
    description: 'Record how this commission was paid out to the referrer.',
    fieldLabel: 'Payout reference (optional)',
    fieldPlaceholder: 'e.g. UTR-1234567890',
    required: false,
    submitText: 'Mark paid',
  },
  cancel: {
    title: 'Cancel commission',
    description: 'Void this commission. Cancellation is final.',
    fieldLabel: 'Reason (optional)',
    fieldPlaceholder: 'e.g. Commission voided by admin',
    required: false,
    submitText: 'Cancel',
    danger: true,
  },
};

export default function CommissionsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<PaginatedResult<ReferralCommission> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<ReferralCommission | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [action, setAction] = useState<ActionState | null>(null);
  const [actionValue, setActionValue] = useState('');
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    adminListCommissions({ page, limit: 15, search, status })
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const openDetail = (id: string) => {
    setDetail(null);
    setDetailLoading(true);
    setDetailError('');
    adminGetCommission(id)
      .then((c) => setDetail(c))
      .catch((e) => setDetailError(getErrorMessage(e)))
      .finally(() => setDetailLoading(false));
  };

  const openAction = (type: ActionType, commission: ReferralCommission) => {
    setAction({ type, commission });
    setActionValue('');
    setActionError('');
  };

  const runAction = () => {
    if (!action) return;
    const cfg = configs[action.type];
    const value = actionValue.trim();
    if (cfg.required && !value) {
      setActionError('This field is required');
      return;
    }
    setActing(true);
    setActionError('');
    const id = action.commission.id;
    const finish = (promise: Promise<unknown>) =>
      promise
        .then(() => {
          showToast(`${cfg.submitText} successful`, 'success');
          setAction(null);
          load();
        })
        .catch((e) => setActionError(getErrorMessage(e)))
        .finally(() => setActing(false));

    switch (action.type) {
      case 'approve':
        finish(adminApproveCommission(id, { note: value || undefined }));
        break;
      case 'reject':
        finish(adminRejectCommission(id, { reason: value }));
        break;
      case 'pay':
        finish(adminPayCommission(id, { payoutReference: value || undefined }));
        break;
      case 'cancel':
        finish(adminCancelCommission(id, { reason: value || undefined }));
        break;
    }
  };

  const actionItems = (
    c: ReferralCommission,
  ): Array<{ label: string; onClick: () => void; danger?: boolean }> => {
    const items: Array<{ label: string; onClick: () => void; danger?: boolean }> = [
      { label: 'View', onClick: () => openDetail(c.id) },
    ];
    if (c.status === 'PENDING') {
      items.push({ label: 'Approve', onClick: () => openAction('approve', c) });
      items.push({ label: 'Reject', danger: true, onClick: () => openAction('reject', c) });
      items.push({ label: 'Cancel', danger: true, onClick: () => openAction('cancel', c) });
    } else if (c.status === 'APPROVED') {
      items.push({ label: 'Mark paid', onClick: () => openAction('pay', c) });
      items.push({ label: 'Cancel', danger: true, onClick: () => openAction('cancel', c) });
    }
    return items;
  };

  const columns: Column<ReferralCommission>[] = [
    {
      key: 'referrer',
      label: 'Referrer',
      render: (c) => (
        <span className="text-content">{c.referral?.referrer?.email ?? c.referralId}</span>
      ),
    },
    {
      key: 'referred',
      label: 'Referred User',
      render: (c) => <span className="text-content">{c.referral?.referredUser?.email ?? '—'}</span>,
    },
    {
      key: 'code',
      label: 'Code',
      render: (c) => (
        <span className="font-mono text-xs text-content">{c.referral?.code ?? '—'}</span>
      ),
    },
    {
      key: 'plan',
      label: 'Plan',
      render: (c) => <span className="text-content">{c.subscription?.plan?.name ?? '—'}</span>,
    },
    {
      key: 'amount',
      label: 'Commission',
      render: (c) => (
        <span className="font-medium text-content">
          {formatMoney(c.commissionAmount, c.subscription?.plan?.currency ?? 'USD')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (c) => (
        <Badge variant={statusVariant(c.status)}>
          {COMMISSION_STATUS_LABELS[c.status] ?? c.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (c) => <span className="text-content-muted">{formatDateTime(c.createdAt)}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (c) => {
        const items = actionItems(c);
        return (
          <>
            <div className="hidden items-center gap-2 sm:flex">
              <Button maxWidth="max-w-md" variant="secondary" onClick={() => openDetail(c.id)}>
                View
              </Button>
              {items
                .filter((i) => i.label !== 'View')
                .slice(0, 2)
                .map((i) => (
                  <Button
                    key={i.label}
                    maxWidth="max-w-md"
                    variant={i.danger ? 'danger' : 'secondary'}
                    onClick={i.onClick}
                  >
                    {i.label}
                  </Button>
                ))}
            </div>
            <ActionMenu
              className="sm:hidden"
              label={`Actions for commission ${c.id.slice(0, 8)}`}
              items={items}
            />
          </>
        );
      },
    },
  ];

  const cfg = action ? configs[action.type] : null;

  return (
    <div>
      <PageHeader
        title="Commissions"
        subtitle={
          data
            ? `${data.meta.totalItems.toLocaleString()} total commissions`
            : 'Review and manage referral commissions'
        }
      />

      <Card className="mb-6" padding={false}>
        <form onSubmit={handleSearch} className="grid gap-4 p-5 md:grid-cols-3">
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
            options={COMMISSION_STATUSES.map((s) => ({
              value: s,
              label: COMMISSION_STATUS_LABELS[s],
            }))}
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
            title="No commissions found"
            description="Try adjusting your search or filters."
          />
        </Card>
      )}

      <Modal
        isOpen={!!detail || detailLoading}
        onClose={() => setDetail(null)}
        title="Commission Details"
        maxWidth="max-w-4xl"
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
                  Status
                </p>
                <Badge variant={statusVariant(detail.status)}>
                  {COMMISSION_STATUS_LABELS[detail.status] ?? detail.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Referral code
                </p>
                <p className="font-mono text-sm text-content">{detail.referral?.code ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Referrer
                </p>
                <p className="text-sm text-content">{detail.referral?.referrer?.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Referred user
                </p>
                <p className="text-sm text-content">
                  {detail.referral?.referredUser?.email ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Plan
                </p>
                <p className="text-sm text-content">{detail.subscription?.plan?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Subscription status
                </p>
                <p className="text-sm text-content">{detail.subscription?.status ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Subscription amount
                </p>
                <p className="text-sm text-content">
                  {formatMoney(
                    detail.subscriptionAmount,
                    detail.subscription?.plan?.currency ?? 'USD',
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Commission
                </p>
                <p className="text-sm text-content">
                  {detail.commissionPercentage}% •{' '}
                  {formatMoney(
                    detail.commissionAmount,
                    detail.subscription?.plan?.currency ?? 'USD',
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Created
                </p>
                <p className="text-sm text-content">{formatDateTime(detail.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Approved
                </p>
                <p className="text-sm text-content">{formatDateTime(detail.approvedDate)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Paid
                </p>
                <p className="text-sm text-content">{formatDateTime(detail.paidDate)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Payout reference
                </p>
                <p className="text-sm text-content">{detail.payoutReference ?? '—'}</p>
              </div>
            </div>
            {detail.rejectedReason && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-content-muted">
                  Reject reason
                </p>
                <p className="text-sm text-content">{detail.rejectedReason}</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={!!action && !!cfg}
        onClose={() => setAction(null)}
        title={cfg?.title ?? ''}
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAction(null)} disabled={acting}>
              Cancel
            </Button>
            <Button
              variant={cfg?.danger ? 'danger' : 'primary'}
              onClick={runAction}
              loading={acting}
            >
              {cfg?.submitText}
            </Button>
          </div>
        }
      >
        {action && cfg && (
          <div className="space-y-4">
            <p className="text-sm text-content-muted">{cfg.description}</p>
            <Textarea
              label={cfg.fieldLabel}
              required={cfg.required}
              rows={3}
              placeholder={cfg.fieldPlaceholder}
              value={actionValue}
              onChange={(e) => setActionValue(e.target.value)}
              error={actionError}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
