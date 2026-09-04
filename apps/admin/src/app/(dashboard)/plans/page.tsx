'use client';

import { useEffect, useState } from 'react';
import {
  adminListPlans,
  adminCreatePlan,
  adminUpdatePlan,
  adminDeletePlan,
  adminListVaults,
  adminLinkPlanVault,
  adminUnlinkPlanVault,
} from '@/lib/services';
import { SubscriptionPlan, Vault, PaginatedResult } from '@/lib/types';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
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

interface FormState {
  name: string;
  description: string;
  price: string;
  currency: string;
  durationDays: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  name: '',
  description: '',
  price: '',
  currency: 'INR',
  durationDays: '',
  isActive: true,
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
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionPlan | null>(null);
  const [manageTarget, setManageTarget] = useState<SubscriptionPlan | null>(null);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    setError('');
    adminListPlans({
      page,
      limit: 15,
      search,
      isActive: isActive === '' ? undefined : isActive === 'true',
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
      currency: p.currency,
      durationDays: String(p.durationDays),
      isActive: p.isActive,
    });
    setFormOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        name: form.name,
        description: form.description || undefined,
        price: form.price ? Number(form.price) : 0,
        currency: form.currency,
        durationDays: form.durationDays ? Number(form.durationDays) : 0,
        isActive: form.isActive,
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
    try {
      await adminDeletePlan(deleteTarget.id);
      showToast('Plan archived', 'success');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
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
      key: 'price',
      label: 'Price',
      render: (p) => (
        <span className="font-medium text-content">{formatMoney(p.price, p.currency)}</span>
      ),
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (p) => <span className="text-content-muted">{p.durationDays} days</span>,
    },
    {
      key: 'vaults',
      label: 'Vaults',
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
      key: 'status',
      label: 'Status',
      render: (p) => (
        <Badge variant={p.isActive ? 'success' : 'danger'}>
          {p.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (p) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openManage(p)}>
            Link vaults
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(p)}>
            Archive
          </Button>
        </div>
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
            label="Active"
            placeholder="All"
            value={isActive}
            onChange={(e) => {
              setPage(1);
              setIsActive(e.target.value);
            }}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
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
              label="Price"
              type="number"
              min={0}
              required
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
            <Input
              label="Currency"
              maxLength={3}
              required
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
            />
            <Input
              label="Duration (days)"
              type="number"
              min={1}
              required
              value={form.durationDays}
              onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
            />
          </div>
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
        message={`Archive "${deleteTarget?.name}"? This cannot be undone.`}
        confirmText="Archive"
      />
    </div>
  );
}
