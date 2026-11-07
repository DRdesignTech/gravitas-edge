'use client';

import { useEffect, useState } from 'react';
import {
  adminListRvaSubscriptions,
  adminGrantRvaAccess,
  adminGetRvaSubscription,
  adminListRvaPlans,
} from '@/lib/services';
import {
  RvaSubscription,
  RvaSubscriptionDetail,
  RvaPlan,
  PaginatedResult,
  SUBSCRIPTION_STATUSES,
} from '@/lib/types';
import {
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
  StatusBadge,
  Table,
} from '@/components/ui';
import { formatDateTime, formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

export default function RvaSubscriptionsPage() {
  const [data, setData] = useState<PaginatedResult<RvaSubscription> | null>(null);
  const [plans, setPlans] = useState<RvaPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [planId, setPlanId] = useState('');
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<RvaSubscriptionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [grantOpen, setGrantOpen] = useState(false);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantPlan, setGrantPlan] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantMessage, setGrantMessage] = useState('');
  const [grantError, setGrantError] = useState('');

  const grantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (grantBusy) return;
    setGrantBusy(true);
    setGrantError('');
    try {
      const result = await adminGrantRvaAccess({
        email: grantEmail.trim(),
        planId: grantPlan,
        reason: grantReason.trim(),
      });
      setGrantMessage(
        result.created ? 'RVA access granted.' : 'This user already has active RVA access.',
      );
      setGrantOpen(false);
      setGrantEmail('');
      setGrantPlan('');
      setGrantReason('');
      load();
    } catch (e) {
      setGrantError(getErrorMessage(e));
    } finally {
      setGrantBusy(false);
    }
  };

  const load = () => {
    setLoading(true);
    setError('');
    adminListRvaSubscriptions({ page, limit: 15, search, status, planId, sortBy: 'createdAt' })
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    adminListRvaPlans()
      .then(setPlans)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, planId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const openDetail = async (s: RvaSubscription) => {
    setDetailLoading(true);
    setDetailError('');
    setDetail({
      ...s,
      plan: null,
    } as unknown as RvaSubscriptionDetail);
    try {
      const full = await adminGetRvaSubscription(s.id);
      setDetail(full);
    } catch (e) {
      setDetailError(getErrorMessage(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: Column<RvaSubscription>[] = [
    {
      key: 'user',
      label: 'User',
      render: (s) => (
        <div>
          <p className="font-medium text-content">{s.user?.email || s.userId}</p>
          {s.user?.phone && <p className="text-xs text-content-muted">{s.user.phone}</p>}
        </div>
      ),
    },
    {
      key: 'plan',
      label: 'Plan',
      render: (s) => (
        <div>
          <p className="text-content">{s.plan?.name || '—'}</p>
          {s.plan && (
            <p className="text-xs text-content-muted">
              {s.plan.durationDays} days · {formatMoney(s.plan.price, s.plan.currency)}
            </p>
          )}
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    {
      key: 'start',
      label: 'Start',
      render: (s) => <span className="text-content-muted">{formatDateTime(s.startDate)}</span>,
    },
    {
      key: 'end',
      label: 'End',
      render: (s) => <span className="text-content-muted">{formatDateTime(s.endDate)}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (s) => (
        <Button maxWidth="max-w-md" variant="secondary" onClick={() => openDetail(s)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="RVA Subscriptions"
        actions={
          <Button
            onClick={() => {
              setGrantError('');
              setGrantOpen(true);
            }}
          >
            Grant RVA access
          </Button>
        }
        subtitle={
          data
            ? `${data.meta.totalItems.toLocaleString()} Recruitment Vendor Access subscriptions`
            : 'Vendor subscriptions and access'
        }
      />

      {grantMessage && (
        <p role="status" className="mb-4 text-sm text-content">
          {grantMessage}
        </p>
      )}
      <Modal
        isOpen={grantOpen}
        onClose={() => {
          if (!grantBusy) setGrantOpen(false);
        }}
        title="Grant RVA access"
      >
        <form onSubmit={grantAccess} className="space-y-4">
          <p className="text-sm text-content-muted">
            Grants access for the selected plan term without billing the user.
          </p>
          <Input
            label="User email"
            type="email"
            required
            value={grantEmail}
            onChange={(e) => setGrantEmail(e.target.value)}
          />
          <Select
            label="RVA plan"
            required
            value={grantPlan}
            onChange={(e) => setGrantPlan(e.target.value)}
            placeholder="Choose an active plan"
            options={plans
              .filter((plan) => plan.isActive)
              .map((plan) => ({ value: plan.id, label: plan.name }))}
          />
          <Input
            label="Reason"
            required
            minLength={5}
            maxLength={500}
            value={grantReason}
            onChange={(e) => setGrantReason(e.target.value)}
          />
          {grantError && (
            <p role="alert" className="text-sm text-red-600">
              {grantError}
            </p>
          )}
          <Button
            type="submit"
            loading={grantBusy}
            disabled={!grantPlan || grantReason.trim().length < 5}
          >
            Grant access
          </Button>
        </form>
      </Modal>

      <Card className="mb-6" padding={false}>
        <form onSubmit={handleSearch} className="grid gap-4 p-5 md:grid-cols-4">
          <Input
            label="Search"
            placeholder="User email or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            label="Status"
            placeholder="All statuses"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            options={SUBSCRIPTION_STATUSES.map((s) => ({ value: s, label: s }))}
          />
          <Select
            label="Plan"
            placeholder="All plans"
            value={planId}
            onChange={(e) => {
              setPage(1);
              setPlanId(e.target.value);
            }}
            options={plans.map((p) => ({ value: p.id, label: p.name }))}
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
          <Table columns={columns} data={data.items} rowKey={(s) => s.id} />
          <Pagination
            currentPage={data.meta.page}
            totalPages={data.meta.totalPages}
            onPageChange={setPage}
          />
        </>
      ) : (
        <Card>
          <EmptyState
            title="No subscriptions found"
            description="Vendor subscriptions will appear here once purchases are made."
          />
        </Card>
      )}

      <Modal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title="Subscription details"
        maxWidth="max-w-lg"
      >
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-content-muted">Status</span>
              <StatusBadge status={detail.status} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="User" value={detail.user?.email || detail.userId} />
              <Field label="Phone" value={detail.user?.phone || '—'} />
              <Field label="Plan" value={detail.plan?.name || '—'} />
              <Field
                label="Duration"
                value={detail.plan ? `${detail.plan.durationDays} days` : '—'}
              />
              <Field label="Start" value={formatDateTime(detail.startDate)} />
              <Field label="End" value={formatDateTime(detail.endDate)} />
              <Field label="Created" value={formatDateTime(detail.createdAt)} />
              <Field label="Payment reference" value={detail.paymentReference || '—'} />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
                Payments
              </p>
              {detailLoading ? (
                <Skeleton className="h-16 rounded-xl" />
              ) : detailError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{detailError}</p>
              ) : detail.payments && detail.payments.length > 0 ? (
                <div className="space-y-2">
                  {detail.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-line px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-content">
                          {formatMoney(p.amount, p.currency)}
                        </p>
                        <p className="text-xs text-content-muted">{formatDateTime(p.createdAt)}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-content-muted">No payment records.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-content-faint">{label}</p>
      <p className="text-content">{value}</p>
    </div>
  );
}
