'use client';

import { useEffect, useState } from 'react';
import { adminListSubscriptions } from '@/lib/services';
import { AdminSubscription, PaginatedResult, SUBSCRIPTION_STATUSES } from '@/lib/types';
import {
  Badge,
  Button,
  Card,
  Column,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Pagination,
  Select,
  Skeleton,
  Table,
} from '@/components/ui';
import { formatDateTime, formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'EXPIRED' || status === 'CANCELLED' || status === 'FAILED') return 'danger';
  return 'neutral';
}

export default function SubscriptionsPage() {
  const [data, setData] = useState<PaginatedResult<AdminSubscription> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    setError('');
    adminListSubscriptions({ page, limit: 15, userId, status })
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

  const columns: Column<AdminSubscription>[] = [
    {
      key: 'user',
      label: 'User',
      render: (s) => <span className="text-content">{s.user?.email || s.userId}</span>,
    },
    {
      key: 'plan',
      label: 'Plan',
      render: (s) => <span className="text-content">{s.plan?.name || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (s) => (
        <Badge variant={statusVariant(s.effectiveStatus || s.status)}>
          {s.effectiveStatus || s.status}
        </Badge>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (s) => (
        <span className="text-content">
          {s.plan ? formatMoney(s.plan.price, s.plan.currency) : '—'}
        </span>
      ),
    },
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
      key: 'vaults',
      label: 'Vaults',
      render: (s) => <span className="text-content">{s.vaultAccessCount ?? 0}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        subtitle={
          data
            ? `${data.meta.totalItems.toLocaleString()} total subscriptions`
            : 'All user subscriptions'
        }
      />

      <Card className="mb-6" padding={false}>
        <form onSubmit={handleSearch} className="grid gap-4 p-5 md:grid-cols-3">
          <Input
            label="User ID"
            placeholder="User id (optional)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
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
            title="No subscriptions found"
            description="Try adjusting your search or filters."
          />
        </Card>
      )}
    </div>
  );
}
