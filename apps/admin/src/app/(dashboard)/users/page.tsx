'use client';

import { useEffect, useState } from 'react';
import {
  adminListUsers,
  adminUpdateUser,
  adminCreateUser,
  adminDeleteUser,
  adminListSubscriptions,
  adminListPlans,
  adminListVaults,
  adminGrantVaultAccess,
  adminManualVaultGrant,
} from '@/lib/services';
import {
  User,
  PaginatedResult,
  USER_STATUSES,
  ROLES,
  AdminSubscription,
  SubscriptionPlan,
  Vault,
} from '@/lib/types';
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
  const [createPlanId, setCreatePlanId] = useState('');
  const [createVaultId, setCreateVaultId] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [grantTarget, setGrantTarget] = useState<User | null>(null);
  const [grantSubscriptions, setGrantSubscriptions] = useState<AdminSubscription[]>([]);
  const [grantPlans, setGrantPlans] = useState<SubscriptionPlan[]>([]);
  const [grantVaults, setGrantVaults] = useState<Vault[]>([]);
  const [grantSubscriptionId, setGrantSubscriptionId] = useState('');
  const [grantVaultId, setGrantVaultId] = useState('');
  const [grantPaymentId, setGrantPaymentId] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);
  const [manualGrantTarget, setManualGrantTarget] = useState<User | null>(null);
  const [manualGrantPlanId, setManualGrantPlanId] = useState('');
  const [manualGrantVaultId, setManualGrantVaultId] = useState('');
  const [manualGrantReason, setManualGrantReason] = useState('');
  const [manualGrantRequestId, setManualGrantRequestId] = useState('');

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

  useEffect(() => {
    Promise.all([
      adminListPlans({ isActive: true, page: 1, limit: 100 }),
      adminListVaults({ status: 'ACTIVE', page: 1, limit: 100 }),
    ])
      .then(([plans, vaults]) => {
        setGrantPlans(plans.items);
        setGrantVaults(vaults.items);
      })
      .catch((err) => showToast(getErrorMessage(err), 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setCreatePlanId('');
    setCreateVaultId('');
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
        ...(createPlanId && createVaultId ? { planId: createPlanId, vaultId: createVaultId } : {}),
      });
      showToast(
        createPlanId ? 'User created with initial vault access' : 'User created',
        'success',
      );
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
      render: (u) => <StatusBadge status={u.status} />,
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
          <Button maxWidth="max-w-md" variant="secondary" onClick={() => openEdit(u)}>
            Edit
          </Button>
          <Button maxWidth="max-w-md" variant="secondary" onClick={() => void openGrant(u)}>
            Grant access
          </Button>
          <Button maxWidth="max-w-md" variant="secondary" onClick={() => openManualGrant(u)}>
            Manual grant
          </Button>
          <Button maxWidth="max-w-md" variant="danger" onClick={() => setDeleteTarget(u)}>
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

  const openGrant = async (user: User) => {
    setGrantTarget(user);
    setGrantLoading(true);
    setGrantSubscriptions([]);
    setGrantPlans([]);
    setGrantVaults([]);
    setGrantSubscriptionId('');
    setGrantVaultId('');
    setGrantPaymentId('');
    try {
      const [subscriptions, plans, vaults] = await Promise.all([
        adminListSubscriptions({ userId: user.id, status: 'PENDING', page: 1, limit: 100 }),
        adminListPlans({ isActive: true, page: 1, limit: 100 }),
        adminListVaults({ status: 'ACTIVE', page: 1, limit: 100 }),
      ]);
      setGrantSubscriptions(subscriptions.items);
      setGrantPlans(plans.items);
      setGrantVaults(vaults.items);
      setGrantSubscriptionId(subscriptions.items[0]?.id ?? '');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setGrantLoading(false);
    }
  };

  const selectedGrantSubscription = grantSubscriptions.find((s) => s.id === grantSubscriptionId);
  const selectedGrantPlan = grantPlans.find((p) => p.id === selectedGrantSubscription?.plan?.id);
  const activeVaultIds = new Set(grantVaults.filter((v) => v.status === 'ACTIVE').map((v) => v.id));
  const selectableVaults = (selectedGrantPlan?.vaults ?? []).filter((v) =>
    activeVaultIds.has(v.id),
  );
  const selectedCreatePlan = grantPlans.find((p) => p.id === createPlanId);
  const createVaultOptions = (selectedCreatePlan?.vaults ?? []).filter((v) =>
    activeVaultIds.has(v.id),
  );

  const submitGrant = async () => {
    if (!grantSubscriptionId || !grantVaultId || !grantPaymentId.trim()) return;
    setSaving(true);
    try {
      await adminGrantVaultAccess({
        subscriptionId: grantSubscriptionId,
        vaultId: grantVaultId,
        razorpayPaymentId: grantPaymentId.trim(),
      });
      showToast('Verified payment access granted for the selected vault', 'success');
      setGrantTarget(null);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const openManualGrant = (user: User) => {
    setManualGrantTarget(user);
    setManualGrantPlanId('');
    setManualGrantVaultId('');
    setManualGrantReason('');
    setManualGrantRequestId(crypto.randomUUID());
  };

  const selectedManualPlan = grantPlans.find((p) => p.id === manualGrantPlanId);
  const manualVaultOptions = (selectedManualPlan?.vaults ?? []).filter((v) =>
    activeVaultIds.has(v.id),
  );

  const submitManualGrant = async () => {
    if (
      !manualGrantTarget ||
      !manualGrantPlanId ||
      !manualGrantVaultId ||
      manualGrantReason.trim().length < 8
    ) {
      return;
    }
    setSaving(true);
    try {
      await adminManualVaultGrant({
        userId: manualGrantTarget.id,
        planId: manualGrantPlanId,
        vaultId: manualGrantVaultId,
        reason: manualGrantReason.trim(),
        requestId: manualGrantRequestId,
      });
      showToast('Manual access granted for the selected vault', 'success');
      setManualGrantTarget(null);
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
          <Select
            label="Initial plan (optional)"
            placeholder="Create user without access"
            value={createPlanId}
            onChange={(e) => {
              setCreatePlanId(e.target.value);
              setCreateVaultId('');
            }}
            options={grantPlans.map((plan) => ({
              value: plan.id,
              label: `${plan.name} · ${plan.durationDays} days`,
            }))}
          />
          <Select
            label="Single vault"
            placeholder={createPlanId ? 'Select a linked vault' : 'Select a plan first'}
            value={createVaultId}
            onChange={(e) => setCreateVaultId(e.target.value)}
            options={createVaultOptions.map((vault) => ({ value: vault.id, label: vault.name }))}
          />
          {createPlanId && (
            <p className="text-sm text-content-muted md:col-span-2">
              This is an admin-issued grant and does not collect payment. The selected plan and one
              linked vault will be recorded for the new user.
            </p>
          )}
          <div className="flex items-end">
            <Button
              type="button"
              onClick={saveCreate}
              loading={creating}
              disabled={
                !createEmail ||
                !createPassword ||
                Boolean(createPlanId) !== Boolean(createVaultId) ||
                (Boolean(createPlanId) && createStatus !== 'ACTIVE')
              }
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
        isOpen={!!grantTarget}
        onClose={() => setGrantTarget(null)}
        title="Grant access after payment"
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setGrantTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitGrant}
              loading={saving}
              disabled={
                grantLoading ||
                !grantSubscriptionId ||
                !grantVaultId ||
                !grantPaymentId.trim() ||
                selectableVaults.length === 0
              }
            >
              Verify payment and grant
            </Button>
          </>
        }
      >
        {grantTarget && (
          <div className="space-y-4">
            <div>
              <p className="font-medium text-content">
                {grantTarget.profile?.fullName || grantTarget.email}
              </p>
              <p className="text-sm text-content-muted">{grantTarget.email}</p>
            </div>
            {grantLoading ? (
              <Skeleton className="h-32 rounded-xl" />
            ) : grantSubscriptions.length === 0 ? (
              <p className="text-sm text-content-muted">
                This user has no pending checkout to recover. Access grants are only available after
                a matching captured payment is verified.
              </p>
            ) : (
              <>
                <Select
                  label="Pending checkout / plan"
                  value={grantSubscriptionId}
                  onChange={(e) => {
                    setGrantSubscriptionId(e.target.value);
                    setGrantVaultId('');
                  }}
                  options={grantSubscriptions.map((s) => ({
                    value: s.id,
                    label: `${s.plan?.name ?? 'Plan'} · ${s.id.slice(0, 8)}`,
                  }))}
                />
                <Select
                  label="Single vault to grant"
                  value={grantVaultId}
                  onChange={(e) => setGrantVaultId(e.target.value)}
                  options={selectableVaults.map((v) => ({ value: v.id, label: v.name }))}
                />
                <Input
                  label="Razorpay captured payment ID"
                  placeholder="pay_..."
                  value={grantPaymentId}
                  onChange={(e) => setGrantPaymentId(e.target.value)}
                />
                <p className="text-xs text-content-muted">
                  The server verifies the captured amount, currency, and checkout association. The
                  grant uses the original checkout validity dates and does not extend billing or
                  alter payment history.
                </p>
                {selectableVaults.length === 0 && (
                  <p className="text-sm text-amber-700">
                    The selected plan has no active linked vault available for a single-vault grant.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!manualGrantTarget}
        onClose={() => setManualGrantTarget(null)}
        title="Manual vault access grant"
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setManualGrantTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitManualGrant}
              loading={saving}
              disabled={
                !manualGrantPlanId ||
                !manualGrantVaultId ||
                manualGrantReason.trim().length < 8 ||
                manualVaultOptions.length === 0
              }
            >
              Grant selected vault
            </Button>
          </>
        }
      >
        {manualGrantTarget && (
          <div className="space-y-4">
            <div>
              <p className="font-medium text-content">
                {manualGrantTarget.profile?.fullName || manualGrantTarget.email}
              </p>
              <p className="text-sm text-content-muted">{manualGrantTarget.email}</p>
            </div>
            <Select
              label="Plan"
              placeholder="Select an active plan"
              value={manualGrantPlanId}
              onChange={(e) => {
                setManualGrantPlanId(e.target.value);
                setManualGrantVaultId('');
              }}
              options={grantPlans.map((plan) => ({
                value: plan.id,
                label: `${plan.name} · ${plan.durationDays} days`,
              }))}
            />
            <Select
              label="Single vault"
              placeholder={manualGrantPlanId ? 'Select a linked vault' : 'Select a plan first'}
              value={manualGrantVaultId}
              onChange={(e) => setManualGrantVaultId(e.target.value)}
              options={manualVaultOptions.map((vault) => ({ value: vault.id, label: vault.name }))}
            />
            <Input
              label="Reason (required for audit)"
              placeholder="Why is this manual access being granted?"
              value={manualGrantReason}
              onChange={(e) => setManualGrantReason(e.target.value)}
            />
            <p className="text-xs text-content-muted">
              This creates a non-renewing admin grant for the selected plan duration. It does not
              charge the user or change payment history.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Edit user"
        maxWidth="max-w-md"
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
        maxWidth="max-w-md"
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
