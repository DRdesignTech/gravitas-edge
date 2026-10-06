'use client';

import { useEffect, useMemo, useState } from 'react';
import { calculateDiscountPercentage } from '@job-portal/shared';
import {
  adminListPlans,
  adminCreatePlan,
  adminUpdatePlan,
  adminDeletePlan,
  adminDeletePlanPermanent,
  adminRestorePlan,
  adminListVaults,
  adminLinkPlanVault,
  adminUnlinkPlanVault,
} from '@/lib/services';
import { SubscriptionPlan, Vault, PaginatedResult } from '@/lib/types';
import {
  ActionMenu,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  StatusBadge,
  Textarea,
  EmptyState,
  ErrorState,
  PageHeader,
  useToast,
  Column,
  Table,
} from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

const DURATION_OPTIONS = [
  { value: '30', label: 'Monthly (30 days)' },
  { value: '90', label: '3 Months (90 days)' },
  { value: '180', label: '6 Months (180 days)' },
];

interface FormState {
  name: string;
  description: string;
  price: string;
  regularPrice: string;
  currency: string;
  durationDays: string;
  isActive: boolean;
  vaultId: string;
}

const emptyForm: FormState = {
  name: '',
  description: '',
  price: '',
  regularPrice: '',
  currency: 'INR',
  durationDays: '30',
  isActive: true,
  vaultId: '',
};

export default function PlansPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<PaginatedResult<SubscriptionPlan> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);

  const [allVaults, setAllVaults] = useState<Vault[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionPlan | null>(null);
  const [permDeleting, setPermDeleting] = useState(false);
  const [permTarget, setPermTarget] = useState<SubscriptionPlan | null>(null);
  const [manageTarget, setManageTarget] = useState<SubscriptionPlan | null>(null);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    setError('');
    adminListPlans({
      page,
      limit: 15,
      search,
      isActive: isActive === '' || isActive === 'archived' ? undefined : isActive === 'true',
      archived: isActive === 'archived' ? true : undefined,
    })
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, isActive]);

  useEffect(() => {
    adminListVaults({ page: 1, limit: 100 })
      .then((v) => setAllVaults(v.items))
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (p: SubscriptionPlan) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? '',
      price: String(p.price),
      regularPrice: String(p.regularPrice ?? p.price),
      currency: p.currency,
      durationDays: String(p.durationDays),
      isActive: p.isActive,
      vaultId: (p.vaults && p.vaults[0]?.id) || '',
    });
    setFormOpen(true);
  };

  // Discount is derived from the two prices on every keystroke - the admin never
  // types it. Uses the same helper as the API so the badge shown here matches
  // the "% OFF" badge shown on the website.
  const discountPercentage = useMemo(
    () => calculateDiscountPercentage(form.regularPrice, form.price),
    [form.regularPrice, form.price],
  );

  const currentPriceNum = Number(form.price);
  const regularPriceNum = Number(form.regularPrice);
  const pricesInvalid =
    form.price.trim() !== '' &&
    form.regularPrice.trim() !== '' &&
    Number.isFinite(currentPriceNum) &&
    Number.isFinite(regularPriceNum) &&
    currentPriceNum > regularPriceNum;
  const savings = Math.max(0, (regularPriceNum || 0) - (currentPriceNum || 0));

  const save = async () => {
    const price = Number(form.price);
    const regularPrice = Number(form.regularPrice);
    const durationDays = Number(form.durationDays);

    if (!form.name.trim()) {
      showToast('Name is required', 'error');
      return;
    }
    if (!(price >= 0)) {
      showToast('Current price must be 0 or more', 'error');
      return;
    }
    if (!(regularPrice >= 0)) {
      showToast('Regular price must be 0 or more', 'error');
      return;
    }
    if (price > regularPrice) {
      showToast('Current price cannot exceed regular price', 'error');
      return;
    }
    if (![30, 90, 180].includes(durationDays)) {
      showToast('Please choose a valid duration', 'error');
      return;
    }
    if (!editing && !form.vaultId) {
      showToast('A vault is required for a new pricing option', 'error');
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name,
        description: form.description || undefined,
        price,
        regularPrice,
        currency: form.currency,
        durationDays,
        isActive: form.isActive,
        ...(editing ? {} : { vaultId: form.vaultId }),
      };
      if (editing) {
        await adminUpdatePlan(editing.id, body);
        showToast('Plan updated', 'success');
      } else {
        await adminCreatePlan(body);
        showToast('Plan created', 'success');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res: any = await adminDeletePlan(deleteTarget.id);
      const refs = res?.references;
      showToast(
        refs
          ? `Plan archived (${refs.subscriptions} subscriptions preserved)`
          : 'Plan archived',
        'success',
      );
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const confirmRestore = async (p: SubscriptionPlan) => {
    try {
      await adminRestorePlan(p.id);
      showToast('Plan restored to the active catalog', 'success');
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const confirmPermanentDelete = async () => {
    if (!permTarget) return;
    setPermDeleting(true);
    try {
      await adminDeletePlanPermanent(permTarget.id);
      showToast('Plan deleted permanently', 'success');
      setPermTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setPermDeleting(false);
    }
  };

  const openManage = (p: SubscriptionPlan) => {
    setManageTarget(p);
    setLinkedIds((p.vaults || []).map((v) => v.id));
  };

  const toggleVault = async (v: Vault) => {
    if (!manageTarget) return;
    try {
      if (linkedIds.includes(v.id)) {
        await adminUnlinkPlanVault(manageTarget.id, v.id);
        setLinkedIds((prev) => prev.filter((x) => x !== v.id));
        showToast('Removed vault from plan', 'success');
      } else {
        await adminLinkPlanVault(manageTarget.id, v.id);
        setLinkedIds((prev) => [...prev, v.id]);
        showToast('Linked vault to plan', 'success');
      }
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const columns: Column<SubscriptionPlan>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (p) => (
        <div>
          <p className="font-medium text-content">{p.name}</p>
          {p.description && (
            <p className="text-sm text-content-muted line-clamp-1">{p.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'vaults',
      label: 'Vault',
      render: (p) =>
        (p.vaults || []).length === 0 ? (
          <span className="text-content-faint">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {(p.vaults || []).map((v) => (
              <Badge key={v.id} variant="info">
                {v.name}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (p) => <span className="text-content-muted">{p.durationDays} days</span>,
    },
    {
      key: 'regularPrice',
      label: 'Regular',
      render: (p) => (
        <span className="text-content-muted line-through">
          {formatMoney(p.regularPrice, p.currency)}
        </span>
      ),
    },
    {
      key: 'price',
      label: 'Current',
      render: (p) => (
        <span className="font-semibold text-content">{formatMoney(p.price, p.currency)}</span>
      ),
    },
    {
      key: 'discount',
      label: 'Discount',
      render: (p) =>
        (p.discountPercentage ?? 0) > 0 ? (
          <Badge variant="success">{p.discountPercentage}% OFF</Badge>
        ) : (
          <span className="text-content-faint">—</span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) =>
        p.status ? (
          <StatusBadge value={p.status} />
        ) : (
          <Badge variant={p.isActive ? 'success' : 'danger'}>
            {p.isActive ? 'Active' : 'Inactive'}
          </Badge>
        ),
    },
    {
      key: 'actions',
      label: '',
      render: (p) =>
        p.status === 'ARCHIVED' ? (
          <>
            <div className="hidden items-center gap-2 sm:flex">
              <Button size="sm" variant="secondary" onClick={() => confirmRestore(p)}>
                Restore
              </Button>
              <Button size="sm" variant="danger" onClick={() => setPermTarget(p)}>
                Delete
              </Button>
            </div>
            <ActionMenu
              className="sm:hidden"
              label={`Actions for ${p.name}`}
              items={[
                { label: 'Restore', onClick: () => confirmRestore(p) },
                { label: 'Delete', danger: true, onClick: () => setPermTarget(p) },
              ]}
            />
          </>
        ) : (
          <>
            <div className="hidden items-center gap-2 sm:flex">
              <Button size="sm" variant="secondary" onClick={() => openManage(p)}>
                Link vaults
              </Button>
              <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                Edit
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setDeleteTarget(p)}>
                Archive
              </Button>
              <Button size="sm" variant="danger" onClick={() => setPermTarget(p)}>
                Delete
              </Button>
            </div>
            <ActionMenu
              className="sm:hidden"
              label={`Actions for ${p.name}`}
              items={[
                { label: 'Link vaults', onClick: () => openManage(p) },
                { label: 'Edit', onClick: () => openEdit(p) },
                { label: 'Archive', danger: true, onClick: () => setDeleteTarget(p) },
                { label: 'Delete permanently', danger: true, onClick: () => setPermTarget(p) },
              ]}
            />
          </>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Subscription Plans"
        subtitle={
          data ? `${data.meta.totalItems.toLocaleString()} total plans` : 'Manage pricing plans'
        }
        actions={
          <Button onClick={openCreate}>
            <span className="text-lg leading-none">+</span> New Plan
          </Button>
        }
      />

      <Card className="mb-6" padding={false}>
        <form onSubmit={handleSearch} className="grid gap-4 p-5 md:grid-cols-3">
          <Input
            label="Search"
            placeholder="Name, description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            label="Status"
            placeholder="All active"
            value={isActive}
            onChange={(e) => {
              setPage(1);
              setIsActive(e.target.value);
            }}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
              { value: 'archived', label: 'Archived' },
            ]}
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
          <EmptyState title="No plans found" description="Try adjusting your search or filters." />
        </Card>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit plan' : 'New plan'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Current price"
              type="number"
              min={0}
              required
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
            <Input
              label="Regular price"
              type="number"
              min={0}
              required
              value={form.regularPrice}
              onChange={(e) => setForm((f) => ({ ...f, regularPrice: e.target.value }))}
            />
            <Input
              label="Discount %"
              readOnly
              tabIndex={-1}
              title="Calculated automatically from regular and current price"
              value={`${discountPercentage}%`}
            />
          </div>
          <div className="flex min-h-6 items-center gap-2 text-xs text-content-muted">
            {pricesInvalid ? (
              <span className="text-red-600 dark:text-red-400">
                Current price cannot exceed regular price
              </span>
            ) : discountPercentage > 0 ? (
              <>
                <Badge variant="success">{discountPercentage}% OFF</Badge>
                <span>Customers save {formatMoney(savings, form.currency)} on this plan</span>
              </>
            ) : (
              <span>
                No discount yet — set a current price below the regular price to calculate one
                automatically.
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Duration"
              value={form.durationDays}
              onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
              options={DURATION_OPTIONS}
            />
            <Input
              label="Currency"
              maxLength={3}
              required
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
            />
          </div>
          {!editing && (
            <Select
              label="Vault"
              placeholder="Select a vault"
              value={form.vaultId}
              onChange={(e) => setForm((f) => ({ ...f, vaultId: e.target.value }))}
              options={allVaults
                .filter((v) => v.status === 'ACTIVE')
                .map((v) => ({ value: v.id, label: v.name }))}
            />
          )}
          <label className="flex items-center gap-2 text-sm text-content">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line-strong text-brand-600 focus:ring-brand-500"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active
          </label>
        </div>
      </Modal>

      <Modal
        isOpen={!!manageTarget}
        onClose={() => setManageTarget(null)}
        title={`Link vaults — ${manageTarget?.name || ''}`}
      >
        <div className="space-y-2">
          {allVaults.length === 0 && (
            <p className="text-sm text-content-muted">No vaults defined.</p>
          )}
          {allVaults.map((v) => {
            const linked = linkedIds.includes(v.id);
            return (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-content">{v.name}</p>
                  <p className="text-xs text-content-muted">{v.status}</p>
                </div>
                <Button
                  size="sm"
                  variant={linked ? 'secondary' : 'primary'}
                  onClick={() => toggleVault(v)}
                >
                  {linked ? 'Remove' : 'Link'}
                </Button>
              </div>
            );
          })}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Archive plan"
        message={`Archive "${deleteTarget?.name}"? It will be hidden from the public catalog but existing subscriptions and entitlements remain intact. You can restore it later.`}
        confirmText="Archive"
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={!!permTarget}
        onClose={() => setPermTarget(null)}
        onConfirm={confirmPermanentDelete}
        title="Delete permanently"
        message={`Are you sure you want to delete "${permTarget?.name}"? This will permanently remove it and cannot be undone.`}
        confirmText="Yes, delete"
        loading={permDeleting}
      />
    </div>
  );
}