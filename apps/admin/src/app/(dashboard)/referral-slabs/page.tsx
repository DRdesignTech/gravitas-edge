'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminListReferralSlabs, adminUpdateReferralSlab } from '@/lib/services';
import { ReferralSlab, ReferralSlabList } from '@/lib/types';
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
  Skeleton,
  Table,
  useToast,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/errors';

interface SlabForm {
  minReferrals: string;
  maxReferrals: string;
  commissionPercentage: string;
  isActive: boolean;
}

function rangeLabel(slab: ReferralSlab): string {
  return slab.maxReferrals == null
    ? `${slab.minReferrals}+`
    : `${slab.minReferrals}–${slab.maxReferrals}`;
}

function defaultForm(slab: ReferralSlab): SlabForm {
  return {
    minReferrals: String(slab.minReferrals),
    maxReferrals: slab.maxReferrals == null ? '' : String(slab.maxReferrals),
    commissionPercentage: String(slab.commissionPercentage),
    isActive: slab.isActive,
  };
}

export default function ReferralSlabsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<ReferralSlabList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState<ReferralSlab | null>(null);
  const [form, setForm] = useState<SlabForm | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SlabForm, string>>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListReferralSlabs()
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (slab: ReferralSlab) => {
    setEditing(slab);
    setForm(defaultForm(slab));
    setFieldErrors({});
  };

  const validate = (): boolean => {
    if (!form) return false;
    const errors: Partial<Record<keyof SlabForm, string>> = {};
    const min = Number(form.minReferrals);
    const max = form.maxReferrals === '' ? null : Number(form.maxReferrals);
    const pct = Number(form.commissionPercentage);

    if (!Number.isInteger(min) || min < 0) {
      errors.minReferrals = 'Must be a whole number ≥ 0';
    }
    if (max !== null && (!Number.isInteger(max) || max < 0)) {
      errors.maxReferrals = 'Must be a whole number ≥ 0';
    }
    if (max !== null && min >= 0 && max < min) {
      errors.maxReferrals = 'Must be greater than or equal to minimum referral count';
    }
    if (pct < 0 || pct > 100) {
      errors.commissionPercentage = 'Must be between 0 and 100';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const save = () => {
    if (!editing || !form) return;
    if (!validate()) return;

    const body: Partial<ReferralSlab> = {
      minReferrals: Number(form.minReferrals),
      commissionPercentage: Number(form.commissionPercentage),
      isActive: form.isActive,
    };
    const max = form.maxReferrals === '' ? undefined : Number(form.maxReferrals);
    if (max !== undefined) body.maxReferrals = max;

    setSaving(true);
    adminUpdateReferralSlab(editing.id, body)
      .then(() => {
        showToast('Slab updated', 'success');
        setEditing(null);
        load();
      })
      .catch((e) => setFieldErrors({ commissionPercentage: getErrorMessage(e) }))
      .finally(() => setSaving(false));
  };

  const toggleActive = (slab: ReferralSlab, isActive: boolean) => {
    adminUpdateReferralSlab(slab.id, { isActive })
      .then(() => {
        showToast(isActive ? 'Slab activated' : 'Slab deactivated', 'success');
        load();
      })
      .catch((e) => showToast(getErrorMessage(e), 'error'));
  };

  const columns: Column<ReferralSlab>[] = [
    {
      key: 'range',
      label: 'Referral range',
      render: (s) => <span className="font-medium text-content">{rangeLabel(s)}</span>,
    },
    {
      key: 'active',
      label: 'Active',
      render: (s) => (
        <Badge variant={s.isActive ? 'success' : 'neutral'}>
          {s.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'commission',
      label: 'Commission',
      render: (s) => <span className="text-content">{s.commissionPercentage}%</span>,
    },
    {
      key: 'updated',
      label: 'Updated',
      render: (s) => (
        <span className="text-content-muted">
          {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString('en-US') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (s) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant={s.isActive ? 'danger' : 'outline'}
            onClick={() => toggleActive(s, !s.isActive)}
          >
            {s.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Referral Slabs"
        subtitle="Commission tiers awarded per successful referral"
      />

      {loading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : data && data.items.length > 0 ? (
        <Card padding={false}>
          <Table columns={columns} data={data.items} />
        </Card>
      ) : (
        <Card>
          <EmptyState
            title="No slabs configured"
            description="Add slabs in the backend to get started."
          />
        </Card>
      )}

      <Modal
        isOpen={!!editing && !!form}
        onClose={() => setEditing(null)}
        title="Edit referral slab"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save
            </Button>
          </div>
        }
      >
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Min referrals"
                required
                type="number"
                value={form.minReferrals}
                onChange={(e) => setForm({ ...form, minReferrals: e.target.value })}
                error={fieldErrors.minReferrals}
              />
              <Input
                label="Max referrals (blank = ∞)"
                type="number"
                value={form.maxReferrals}
                onChange={(e) => setForm({ ...form, maxReferrals: e.target.value })}
                error={fieldErrors.maxReferrals}
              />
            </div>
            <Input
              label="Commission percentage"
              required
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.commissionPercentage}
              onChange={(e) => setForm({ ...form, commissionPercentage: e.target.value })}
              error={fieldErrors.commissionPercentage}
            />
            <label className="flex items-center gap-2 text-sm font-medium text-content">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-line-strong text-brand-600 focus:ring-brand-500"
              />
              Slab is active
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
