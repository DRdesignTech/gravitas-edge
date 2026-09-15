'use client';

import { useEffect, useState } from 'react';
import { adminListUsers, adminDeleteUser } from '@/lib/services';
import { User, PaginatedResult, USER_STATUSES, ROLES } from '@/lib/types';
import {
  Button,
  Card,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  StatusBadge,
  EmptyState,
  ErrorState,
  PageHeader,
  Table,
  Column,
  Badge,
  useToast,
} from '@/components/ui';
import { formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

export default function CandidatesPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<PaginatedResult<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [page, setPage] = useState(1);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    adminListUsers({ page, limit: 15, search, status, role })
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, role]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const columns: Column<User>[] = [
    {
      key: 'user',
      label: 'Candidate',
      render: (u) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            {(u.profile?.fullName || u.email)?.[0]?.toUpperCase()}
          </span>
          <div>
            <p className="font-medium text-content">{u.profile?.fullName || u.email}</p>
            <p className="text-sm text-content-muted">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.length === 0 ? (
            <span className="text-content-faint">—</span>
          ) : (
            u.roles.map((r) => (
              <Badge key={r} variant={r === 'ADMIN' ? 'warning' : 'info'}>
                {r}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (u) => <StatusBadge value={u.status} />,
    },
    {
      key: 'experience',
      label: 'Experience',
      render: (u) => (
        <span className="text-content-medium">
          {u.profile?.yearsExperience !== undefined
            ? `${u.profile.yearsExperience}${u.profile.monthsExperience !== undefined ? ` ${u.profile.monthsExperience} months` : ''} yrs`
            : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (u) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => (window.location.href = `/admin/candidates/${u.id}`)}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  const deleteUser = async (id: string) => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await adminDeleteUser(deleteTarget.id);
      showToast('User permanently deleted', 'success');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Candidates"
        subtitle={
          data ? `${data.meta.totalItems.toLocaleString()} total candidates` : 'Manage candidates'
        }
      />

      <Card className="mb-6" padding={false}>
        <form onSubmit={handleSearch} className="grid gap-4 p-5 md:grid-cols-4">
          <Input
            label="Search"
            placeholder="Name, email, phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            label="Status"
            placeholder="All statuses"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED');
            }}
            options={USER_STATUSES.map((s) => ({ value: s, label: s }))}
          />
          <Select
            label="Role"
            placeholder="All roles"
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value as 'USER' | 'ADMIN');
            }}
            options={ROLES.map((r) => ({ value: r, label: r }))}
          />
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Search
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mb-4" padding={false}>
        <form className="grid gap-4 p-4 md:grid-cols-3">
          <Button
            type="button"
            onClick={() => (window.location.href = '/admin/candidates/create')}
            variant="primary"
          >
            Create Candidate
          </Button>
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
          <div className="mt-4">
            <Button
              variant="primary"
              className="hidden sm:inline-flex"
              onClick={() => (window.location.href = '/admin/candidates/create')}
            >
              New User
            </Button>
          </div>
        </>
      ) : (
        <Card>
          <EmptyState
            title="No candidates found"
            description="Try adjusting your search or filters."
          />
        </Card>
      )}
    </div>
  );
}
