'use client';

import { useEffect, useState } from 'react';
import {
  adminListRvaFaqs,
  adminCreateRvaFaq,
  adminUpdateRvaFaq,
  adminArchiveRvaFaq,
} from '@/lib/services';
import { RvaFaq } from '@/lib/types';
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
  Skeleton,
  Table,
  Textarea,
  useToast,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/errors';

interface FormState {
  question: string;
  answer: string;
  category: string;
  sortOrder: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  question: '',
  answer: '',
  category: '',
  sortOrder: '0',
  isActive: true,
};

export default function RvaFaqsPage() {
  const { showToast } = useToast();
  const [faqs, setFaqs] = useState<RvaFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RvaFaq | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<RvaFaq | null>(null);
  const [archiving, setArchiving] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    adminListRvaFaqs()
      .then(setFaqs)
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

  const openEdit = (f: RvaFaq) => {
    setEditing(f);
    setForm({
      question: f.question,
      answer: f.answer,
      category: f.category ?? '',
      sortOrder: String(f.sortOrder ?? 0),
      isActive: f.isActive,
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.question.trim()) {
      showToast('Question is required', 'error');
      return;
    }
    if (!form.answer.trim()) {
      showToast('Answer is required', 'error');
      return;
    }
    const sortOrder = Number(form.sortOrder || 0);
    if (!Number.isInteger(sortOrder)) {
      showToast('Sort order must be a whole number', 'error');
      return;
    }

    setSaving(true);
    try {
      const body = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        category: form.category.trim() || undefined,
        sortOrder,
        isActive: form.isActive,
      };
      if (editing) {
        await adminUpdateRvaFaq(editing.id, body);
        showToast('FAQ updated', 'success');
      } else {
        await adminCreateRvaFaq(body);
        showToast('FAQ created', 'success');
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
      await adminArchiveRvaFaq(archiveTarget.id);
      showToast('FAQ archived', 'success');
      setArchiveTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setArchiving(false);
    }
  };

  const columns: Column<RvaFaq>[] = [
    {
      key: 'question',
      label: 'Question',
      render: (f) => (
        <div className="max-w-md">
          <p className="font-medium text-content">{f.question}</p>
          <p className="line-clamp-2 text-xs text-content-muted">{f.answer}</p>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (f) =>
        f.category ? (
          <Badge variant="info">{f.category}</Badge>
        ) : (
          <span className="text-content-faint">—</span>
        ),
    },
    { key: 'sortOrder', label: 'Order', render: (f) => <span>{f.sortOrder}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (f) => (
        <Badge variant={f.isActive ? 'success' : 'danger'}>
          {f.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (f) => (
        <div className="flex items-center gap-2">
          <Button maxWidth="max-w-md" variant="secondary" onClick={() => openEdit(f)}>
            Edit
          </Button>
          <Button maxWidth="max-w-md" variant="danger" onClick={() => setArchiveTarget(f)}>
            Archive
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="RVA FAQs"
        subtitle={loading ? 'Manage vendor-facing FAQs' : `${faqs.length} active FAQs`}
        actions={
          <Button onClick={openCreate}>
            <span className="text-lg leading-none">+</span> New FAQ
          </Button>
        }
      />

      {loading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : faqs.length > 0 ? (
        <Table columns={columns} data={faqs} rowKey={(f) => f.id} />
      ) : (
        <Card>
          <EmptyState
            title="No FAQs yet"
            description="Add FAQs to answer common questions about Recruitment Vendor Access."
            action={<Button onClick={openCreate}>New FAQ</Button>}
          />
        </Card>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit FAQ' : 'New FAQ'}
        maxWidth="max-w-lg"
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
            label="Question"
            required
            value={form.question}
            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
          />
          <Textarea
            label="Answer"
            required
            value={form.answer}
            onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Category"
              placeholder="e.g. Pricing"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
            <Input
              label="Sort order"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
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

      <ConfirmDialog
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
        title="Archive FAQ"
        message={`Archive "${archiveTarget?.question}"? It will no longer be shown publicly.`}
        confirmText="Archive"
        loading={archiving}
      />
    </div>
  );
}
