'use client';

import { useEffect, useMemo, useState } from 'react';
import { calculateDiscountPercentage } from '@job-portal/shared';
import {
  adminListRvaPlans,
  adminCreateRvaPlan,
  adminUpdateRvaPlan,
  adminArchiveRvaPlan,
} from '@/lib/services';
import { RvaPlan } from '@/lib/types';
import {
  Badge,
  Button,
  Card,
  Column,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  Table,
  Textarea,
  useToast,
} from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

const DURATION_OPTIONS = [
  { value: '30', label: '1 Month (30 days)' },
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
  sortOrder: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  name: '',
  description: '',
  price: '',
  regularPrice: '',
  currency: 'INR',
  durationDays: '30',
  sortOrder: '0',
  isActive: true,
};

export default function RvaPlansPage() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<RvaPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RvaPlan | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<RvaPlan | null>(null);
  const [archiving, setArchiving] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    adminListRvaPlans()
      .then(setPlans)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (p: RvaPlan) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? '',
      price: String(p.price),
      regularPrice: String(p.regularPrice ?? p.price),
      currency: p.currency,
      durationDays: String(p.durationDays),
      sortOrder: String(p.sortOrder ?? 0),
      isActive: p.isActive,
    });
    setFormOpen(true);
  };

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
    const sortOrder = Number(form.sortOrder || 0);

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
    if (!Number.isInteger(sortOrder)) {
      showToast('Sort order must be a whole number', 'error');
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description || undefined,
        price,
        regularPrice,
        currency: form.currency,
        durationDays,
        sortOrder,
        isActive: form.isActive,
      };
      if (editing) {
        await adminUpdateRvaPlan(editing.id, body);
        showToast('Plan updated', 'success');
      } else {
        await adminCreateRvaPlan(body);
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

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await adminArchiveRvaPlan(archiveTarget.id);
      showToast('Plan archived', 'success');
      setArchiveTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setArchiving(false);
    }
  };

  const columns: Column<RvaPlan>[] = [
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
    { key: 'duration', label: 'Duration', render: (p) => <span>{p.durationDays} days</span> },
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
    { key: 'sortOrder', label: 'Order', render: (p) => <span>{p.sortOrder}</span> },
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
        <div className="flex items-center gap-2">
          <Button maxWidth="max-w-md" variant="secondary" onClick={() => openEdit(p)}>
            Edit
          </Button>
          <Button maxWidth="max-w-md" variant="danger" onClick={() => setArchiveTarget(p)}>
            Archive
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="RVA Plans"
        subtitle={
          loading ? 'Manage Recruitment Vendor Access pricing' : `${plans.length} active plans`
        }
        actions={
          <Button onClick={openCreate}>
            <span className="text-lg leading-none">+</span> New Plan
          </Button>
        }
      />

      {loading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : plans.length > 0 ? (
        <Table columns={columns} data={plans} rowKey={(p) => p.id} />
      ) : (
        <Card>
          <EmptyState
            title="No plans yet"
            description="Create the 1, 3 and 6 month plans to start selling Recruitment Vendor Access."
            action={<Button onClick={openCreate}>New Plan</Button>}
          />
        </Card>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit plan' : 'New plan'}
        maxWidth="max-w-md"
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
                <span>Vendors save {formatMoney(savings, form.currency)} on this plan</span>
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
          <Input
            label="Sort order"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
          />
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

      <ConfirmDialog
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
        title="Archive plan"
        message={`Archive "${archiveTarget?.name}"? It will be hidden from the RVA catalog but existing subscriptions remain intact.`}
        confirmText="Archive"
        loading={archiving}
      />
    </div>
  );
}
