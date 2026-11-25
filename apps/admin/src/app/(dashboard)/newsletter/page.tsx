'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  adminGetNewsletterStats,
  adminListNewsletterSubscribers,
  adminUpdateNewsletterSubscriberStatus,
} from '@/lib/services';
import type {
  NewsletterSubscriber,
  NewsletterSubscriberStats,
  NewsletterSubscriberStatus,
  PaginatedResult,
} from '@/lib/types';
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
  RefreshIcon,
  Select,
  Skeleton,
  Table,
  useToast,
} from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

const PAGE_LIMIT = 20;

type StatusFilter = 'ALL' | NewsletterSubscriberStatus;

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'SUBSCRIBED', label: 'Subscribed' },
  { value: 'UNSUBSCRIBED', label: 'Unsubscribed' },
];

export default function NewsletterSubscribersPage() {
  const { showToast } = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<PaginatedResult<NewsletterSubscriber> | null>(null);
  const [stats, setStats] = useState<NewsletterSubscriberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, statsRes] = await Promise.all([
        adminListNewsletterSubscribers({
          page,
          limit: PAGE_LIMIT,
          search: searchTerm || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        }),
        adminGetNewsletterStats(),
      ]);
      setResult(listRes);
      setStats(statsRes);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStatus = async (subscriber: NewsletterSubscriber) => {
    const nextStatus: NewsletterSubscriberStatus =
      subscriber.status === 'SUBSCRIBED' ? 'UNSUBSCRIBED' : 'SUBSCRIBED';

    setUpdatingId(subscriber.id);
    try {
      const updated = await adminUpdateNewsletterSubscriberStatus(subscriber.id, nextStatus);
      showToast(
        `${updated.email} marked as ${nextStatus === 'SUBSCRIBED' ? 'Subscribed' : 'Unsubscribed'}.`,
        'success',
      );
      await loadData();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const items = result?.items ?? [];
  const totalPages = result?.meta.totalPages ?? 0;
  const totalItems = result?.meta.totalItems ?? 0;

  const columns: Column<NewsletterSubscriber>[] = [
    {
      key: 'email',
      label: 'Email',
      render: (row) => <span className="font-medium text-content">{row.email}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'SUBSCRIBED' ? 'success' : 'neutral'}>
          {row.status === 'SUBSCRIBED' ? 'Subscribed' : 'Unsubscribed'}
        </Badge>
      ),
    },
    {
      key: 'subscribedAt',
      label: 'Subscribed At',
      render: (row) => (
        <span className="text-content-muted">{formatDateTime(row.subscribedAt)}</span>
      ),
    },
    {
      key: 'unsubscribedAt',
      label: 'Unsubscribed At',
      render: (row) => (
        <span className="text-content-muted">
          {row.unsubscribedAt ? formatDateTime(row.unsubscribedAt) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant={row.status === 'SUBSCRIBED' ? 'outline' : 'secondary'}
            loading={updatingId === row.id}
            onClick={() => handleToggleStatus(row)}
          >
            {row.status === 'SUBSCRIBED' ? 'Unsubscribe' : 'Re-subscribe'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newsletter Subscribers"
        subtitle={`${totalItems.toLocaleString()} matching ${totalItems === 1 ? 'subscriber' : 'subscribers'}`}
        actions={
          <Button variant="outline" size="sm" onClick={loadData} loading={loading}>
            <RefreshIcon className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
            Total Subscribers
          </p>
          <p className="mt-2 text-2xl font-bold text-content">
            {stats ? stats.total.toLocaleString() : '—'}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
            Active (Subscribed)
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats ? stats.subscribed.toLocaleString() : '—'}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
            Unsubscribed
          </p>
          <p className="mt-2 text-2xl font-bold text-content-muted">
            {stats ? stats.unsubscribed.toLocaleString() : '—'}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Search email"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Filter by email address…"
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value as StatusFilter);
              }}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
      </Card>

      {/* Subscriber Table */}
      {loading && !result ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={loadData} />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="No subscribers found"
            description={
              searchTerm || statusFilter !== 'ALL'
                ? 'Try clearing your search or status filter to view all newsletter subscribers.'
                : 'No visitors have subscribed to the newsletter yet.'
            }
            action={
              searchTerm || statusFilter !== 'ALL' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchInput('');
                    setSearchTerm('');
                    setStatusFilter('ALL');
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <Table columns={columns} data={items} rowKey={(row) => row.id} />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
