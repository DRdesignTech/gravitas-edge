'use client';

import { useEffect, useState } from 'react';
import { adminListUsers, adminUpdateUser, adminCreateUser, adminDeleteUser } from '@/lib/services';
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
  Badge,
  useToast,
  Column,
  Table,
} from '@/components/ui';
import { formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

export default function UsersPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<PaginatedResult<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<User | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'USER' | 'ADMIN'>('USER');
  const [createStatus, setCreateStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ACTIVE');

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

  const openEdit = (u: User) => {
    setEditing(u);
    setEditStatus(u.status);
    setEditRoles(u.roles || []);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminUpdateUser(editing.id, { status: editStatus, roles: editRoles });
      showToast('User updated', 'success');
      setEditing(null);
      load();
    } catch (err) {
      const message = getErrorMessage(err);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setCreateEmail('');
    setCreatePassword('');
    setCreateRole('USER');
    setCreateStatus('ACTIVE');
    setCreating(true);
  };

  const saveCreate = async () => {
    if (!createEmail || !createPassword) return;
    setCreating(true);
    try {
      await adminCreateUser({
        email: createEmail,
        password: createPassword,
        role: createRole,
        status: createStatus,
      });
      showToast('User created', 'success');
      setCreating(false);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setCreating(false);
    }
  };

  const toggleRole = (r: string) =>
    setEditRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const columns: Column<User>[] = [
    {
      key: 'user',
      label: 'User',
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
      key: 'roles',
      label: 'Roles',
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
      key: 'joined',
      label: 'Joined',
      render: (u) => <span className="text-content-muted">{formatDate(u.createdAt)}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (u) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(u)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(u)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const deleteUser = async (id: string) => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await adminDeleteUser(id);
      showToast('User permanently deleted', 'success');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={
          data ? `${data.meta.totalItems.toLocaleString()} total users` : 'Manage user accounts'
        }
      />

      <Card className="mb-6" padding={false}>
        <form onSubmit={handleSearch} className="grid gap-4 p-5 md:grid-cols-4">
          <Input
            label="Search"
            placeholder="Email, name, phone"
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
            options={USER_STATUSES.map((s) => ({ value: s, label: s }))}
          />
          <Select
            label="Role"
            placeholder="All roles"
            value={role}
            onChange={(e) => {
              setPage(1);
              setRole(e.target.value);
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
          <Input
            label="Email"
            placeholder="user@example.com"
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={createPassword}
            onChange={(e) => setCreatePassword(e.target.value)}
          />
          <Select
            label="Role"
            value={createRole}
            onChange={(e) => setCreateRole(e.target.value as 'USER' | 'ADMIN')}
            options={[
              { value: 'USER', label: 'USER' },
              { value: 'ADMIN', label: 'ADMIN' },
            ]}
          />
          <Select
            label="Status"
            value={createStatus}
            onChange={(e) => setCreateStatus(e.target.value as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED')}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
              { value: 'SUSPENDED', label: 'Suspended' },
            ]}
          />
          <div className="flex items-end">
            <Button
              type="button"
              onClick={saveCreate}
              loading={creating}
              disabled={!createEmail || !createPassword}
            >
              Create User
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
          <EmptyState title="No users found" description="Try adjusting your search or filters." />
        </Card>
      )}

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Edit user"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-5">
            <div>
              <p className="font-medium text-content">
                {editing.profile?.fullName || editing.email}
              </p>
              <p className="text-sm text-content-muted">{editing.email}</p>
            </div>
            <Select
              label="Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              options={USER_STATUSES.map((s) => ({ value: s, label: s }))}
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-content">Roles</label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => {
                  const active = editRoles.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleRole(r)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        active
                          ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500'
                          : 'border-line-strong text-content-muted hover:bg-surface-muted dark:border-line'
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete user"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => deleteTarget && deleteUser(deleteTarget.id)}
              loading={false}
              disabled={!deleteTarget}
              variant="danger"
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-content-muted">
          Are you sure you want to permanently delete {deleteTarget?.email}? This action is
          irreversible and will remove the account and all of their data.
        </p>
      </Modal>
    </div>
  );
}
