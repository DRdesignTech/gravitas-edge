'use client';

import { useEffect, useState } from 'react';
import {
  adminListExperienceLevels,
  adminCreateExperienceLevel,
  adminUpdateExperienceLevel,
  adminDeleteExperienceLevel,
} from '@/lib/services';
import { ExperienceLevel } from '@/lib/types';
import {
  ActionMenu,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Modal,
  Skeleton,
  Textarea,
  EmptyState,
  ErrorState,
  PageHeader,
  useToast,
  Column,
  Table,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/errors';

interface FormState {
  name: string;
  slug: string;
  code: string;
  minYears: string;
  maxYears: string;
  description: string;
  sortOrder: string;
}

const emptyForm: FormState = {
  name: '',
  slug: '',
  code: '',
  minYears: '',
  maxYears: '',
  description: '',
  sortOrder: '0',
};

export default function ExperienceLevelsPage() {
  const { showToast } = useToast();
  const [levels, setLevels] = useState<ExperienceLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExperienceLevel | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExperienceLevel | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    adminListExperienceLevels()
      .then(setLevels)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (el: ExperienceLevel) => {
    setEditing(el);
    setForm({
      name: el.name,
      slug: el.slug ?? '',
      code: el.code ?? '',
      minYears: String(el.minYears),
      maxYears: el.maxYears != null ? String(el.maxYears) : '',
      description: el.description ?? '',
      sortOrder: String(el.sortOrder ?? 0),
    });
    setFormOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        name: form.name,
        slug: form.slug || undefined,
        code: form.code || undefined,
        minYears: form.minYears ? Number(form.minYears) : 0,
        maxYears: form.maxYears ? Number(form.maxYears) : undefined,
        description: form.description || undefined,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
      };
      if (editing) {
        await adminUpdateExperienceLevel(editing.id, body);
        showToast('Experience level updated', 'success');
      } else {
        await adminCreateExperienceLevel(body as Partial<ExperienceLevel>);
        showToast('Experience level created', 'success');
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
      await adminDeleteExperienceLevel(deleteTarget.id);
      showToast('Experience level deleted', 'success');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<ExperienceLevel>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (el) => (
        <div>
          <p className="font-medium text-content">{el.name}</p>
          {el.slug && <p className="text-sm text-content-muted">/{el.slug}</p>}
        </div>
      ),
    },
    {
      key: 'range',
      label: 'Experience range',
      render: (el) => (
        <span className="text-content">
          {el.minYears}+{el.maxYears != null ? ` – ${el.maxYears}` : ''} yrs
        </span>
      ),
    },
    {
      key: 'code',
      label: 'Code',
      render: (el) => <span className="text-content">{el.code || '—'}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (el) => (
        <>
          <div className="hidden items-center gap-2 sm:flex">
            <Button maxWidth="max-w-md" variant="secondary" onClick={() => openEdit(el)}>
              Edit
            </Button>
            <Button maxWidth="max-w-md" variant="danger" onClick={() => setDeleteTarget(el)}>
              Delete
            </Button>
          </div>
          <ActionMenu
            className="sm:hidden"
            label={`Actions for ${el.name}`}
            items={[
              { label: 'Edit', onClick: () => openEdit(el) },
              { label: 'Delete', danger: true, onClick: () => setDeleteTarget(el) },
            ]}
          />
        </>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Experience Levels"
        subtitle={`${levels.length.toLocaleString()} levels defined`}
        actions={
          <Button onClick={openCreate}>
            <span className="text-lg leading-none">+</span> New Level
          </Button>
        }
      />

      {loading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : levels.length === 0 ? (
        <Card>
          <EmptyState
            title="No experience levels"
            description="Create your first experience level to get started."
          />
        </Card>
      ) : (
        <Table columns={columns} data={levels} />
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit experience level' : 'New experience level'}
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Slug"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
            <Input
              label="Code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
            <Input
              label="Min years"
              type="number"
              min={0}
              required
              value={form.minYears}
              onChange={(e) => setForm((f) => ({ ...f, minYears: e.target.value }))}
            />
            <Input
              label="Max years"
              type="number"
              min={0}
              value={form.maxYears}
              onChange={(e) => setForm((f) => ({ ...f, maxYears: e.target.value }))}
            />
            <Input
              label="Sort order"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            />
          </div>
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete experience level"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}
