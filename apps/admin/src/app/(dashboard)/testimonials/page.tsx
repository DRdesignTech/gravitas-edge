'use client';

import { useEffect, useState } from 'react';
import {
  adminListTestimonials,
  adminCreateTestimonial,
  adminUpdateTestimonial,
  adminDeleteTestimonial,
} from '@/lib/services';
import { Testimonial } from '@/lib/types';
import {
  ActionMenu,
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
  Skeleton,
  Table,
  Textarea,
  useToast,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/errors';

interface FormState {
  name: string;
  role: string;
  badge: string;
  quote: string;
  linkedinUrl: string;
  sortOrder: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  name: '',
  role: '',
  badge: '',
  quote: '',
  linkedinUrl: '',
  sortOrder: '0',
  isActive: true,
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function TestimonialsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    adminListTestimonials()
      .then(setItems)
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

  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setForm({
      name: t.name,
      role: t.role,
      badge: t.badge ?? '',
      quote: t.quote,
      linkedinUrl: t.linkedinUrl ?? '',
      sortOrder: String(t.sortOrder ?? 0),
      isActive: t.isActive,
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      showToast('Name is required', 'error');
      return;
    }
    if (!form.role.trim()) {
      showToast('Role is required', 'error');
      return;
    }
    if (!form.quote.trim()) {
      showToast('Quote is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const body: Partial<Testimonial> = {
        name: form.name.trim(),
        role: form.role.trim(),
        badge: form.badge.trim() || undefined,
        quote: form.quote.trim(),
        linkedinUrl: form.linkedinUrl.trim() || undefined,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : 0,
        isActive: form.isActive,
      };
      if (editing) {
        await adminUpdateTestimonial(editing.id, body);
        showToast('Testimonial updated', 'success');
      } else {
        await adminCreateTestimonial(body);
        showToast('Testimonial created', 'success');
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
      await adminDeleteTestimonial(deleteTarget.id);
      showToast('Testimonial deleted', 'success');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (t: Testimonial) => {
    try {
      await adminUpdateTestimonial(t.id, { isActive: !t.isActive });
      showToast(t.isActive ? 'Testimonial hidden' : 'Testimonial shown', 'success');
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const columns: Column<Testimonial>[] = [
    {
      key: 'person',
      label: 'Person',
      render: (t) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            {initials(t.name)}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-medium text-content">
              {t.name}
              {t.linkedinUrl && (
                <a
                  href={t.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:text-brand-800 dark:text-brand-400"
                  title={`Open ${t.name}'s LinkedIn`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 110-4.14 2.07 2.07 0 010 4.14zM7.12 20.45H3.56V9h3.56v11.45z" />
                  </svg>
                </a>
              )}
            </p>
            <p className="truncate text-sm text-content-muted">{t.role}</p>
            {t.badge && (
              <p className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate rounded-full border border-transparent bg-[#C8943E] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#061B36]">
                {t.badge}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'quote',
      label: 'Quote',
      render: (t) => (
        <p className="max-w-md truncate text-sm text-content-muted">&ldquo;{t.quote}&rdquo;</p>
      ),
    },
    {
      key: 'order',
      label: 'Order',
      render: (t) => <span className="text-sm text-content">{t.sortOrder}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (t) =>
        t.isActive ? (
          <Badge variant="success">Visible</Badge>
        ) : (
          <Badge variant="neutral">Hidden</Badge>
        ),
    },
    {
      key: 'actions',
      label: '',
      render: (t) => (
        <>
          <div className="hidden items-center gap-2 sm:flex">
            <Button maxWidth="max-w-md" variant="secondary" onClick={() => toggleActive(t)}>
              {t.isActive ? 'Hide' : 'Show'}
            </Button>
            <Button maxWidth="max-w-md" variant="secondary" onClick={() => openEdit(t)}>
              Edit
            </Button>
            <Button maxWidth="max-w-md" variant="danger" onClick={() => setDeleteTarget(t)}>
              Delete
            </Button>
          </div>
          <ActionMenu
            className="sm:hidden"
            label={`Actions for ${t.name}`}
            items={[
              { label: t.isActive ? 'Hide' : 'Show', onClick: () => toggleActive(t) },
              { label: 'Edit', onClick: () => openEdit(t) },
              { label: 'Delete', danger: true, onClick: () => setDeleteTarget(t) },
            ]}
          />
        </>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Testimonials"
        subtitle={`${items.length.toLocaleString()} testimonials`}
        actions={
          <Button onClick={openCreate}>
            <span className="text-lg leading-none">+</span> New Testimonial
          </Button>
        }
      />

      {loading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="No testimonials"
            description="Add your first subscriber story to appear on the website."
          />
        </Card>
      ) : (
        <Table columns={columns} data={items} />
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit testimonial — ${editing.name}` : 'New testimonial'}
        maxWidth="max-w-2xl"
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              required
              placeholder="e.g. Simran Khurana"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Sort order"
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            />
          </div>
          <Input
            label="Role / Company"
            required
            placeholder="e.g. Lead Product Manager @ FinTech Growth Scale-Up"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          />
          <Input
            label="Result badge (optional)"
            placeholder="e.g. 45% Pay Jump, Hired in 12 Days"
            value={form.badge}
            onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
          />
          <Textarea
            label="Quote"
            required
            placeholder="What did this subscriber achieve?"
            value={form.quote}
            onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
          />
          <Input
            label="LinkedIn URL"
            type="url"
            placeholder="https://www.linkedin.com/in/username"
            value={form.linkedinUrl}
            onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
            error={
              form.linkedinUrl.trim() && !/^https?:\/\/.+/i.test(form.linkedinUrl.trim())
                ? 'Must start with http:// or https://'
                : undefined
            }
          />
          <div className="rounded-xl border border-line bg-surface px-4 py-3 text-xs text-content-muted">
            {form.linkedinUrl.trim() ? (
              <>
                Visitors tapping{' '}
                <span className="font-semibold text-content">{form.name || 'the name'}</span> on the
                homepage will open{' '}
                <a
                  href={form.linkedinUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-600 underline dark:text-brand-400"
                >
                  {form.linkedinUrl.trim()}
                </a>{' '}
                in a new tab.
              </>
            ) : (
              <>Leave LinkedIn blank to show the name without a link.</>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-content">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line-strong text-brand-600 focus:ring-brand-500"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Visible on website
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete testimonial"
        message={`Delete "${deleteTarget?.name}"'s testimonial? This cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}
