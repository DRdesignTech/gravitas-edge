'use client';

import { useEffect, useState } from 'react';
import {
  adminListRvaOpportunities,
  adminCreateRvaOpportunity,
  adminUpdateRvaOpportunity,
  adminArchiveRvaOpportunity,
  adminDeleteRvaOpportunityPermanent,
} from '@/lib/services';
import {
  RvaOpportunity,
  PaginatedResult,
  RVA_CATEGORIES,
  RVA_CATEGORY_LABELS,
  RVA_OPPORTUNITY_STATUSES,
} from '@/lib/types';
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
  Pagination,
  Select,
  Skeleton,
  StatusBadge,
  Table,
  Textarea,
  useToast,
} from '@/components/ui';
import { formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

const CATEGORY_OPTIONS = RVA_CATEGORIES.map((c) => ({ value: c, label: RVA_CATEGORY_LABELS[c] }));
const STATUS_OPTIONS = RVA_OPPORTUNITY_STATUSES.map((s) => ({ value: s, label: s }));

interface FormState {
  title: string;
  category: string;
  status: string;
  role: string;
  sector: string;
  company: string;
  organization: string;
  location: string;
  geography: string;
  country: string;
  budget: string;
  salary: string;
  commercialValue: string;
  minExperience: string;
  maxExperience: string;
  experienceText: string;
  eligibility: string;
  qualification: string;
  requirements: string;
  otherDetails: string;
  description: string;
  howToApply: string;
  applicationUrl: string;
  applicationContact: string;
  source: string;
  referenceId: string;
  jobId: string;
  publishedDate: string;
  expiryDate: string;
}

const emptyForm: FormState = {
  title: '',
  category: 'RFP_EOI_RFQ',
  status: 'DRAFT',
  role: '',
  sector: '',
  company: '',
  organization: '',
  location: '',
  geography: '',
  country: '',
  budget: '',
  salary: '',
  commercialValue: '',
  minExperience: '',
  maxExperience: '',
  experienceText: '',
  eligibility: '',
  qualification: '',
  requirements: '',
  otherDetails: '',
  description: '',
  howToApply: '',
  applicationUrl: '',
  applicationContact: '',
  source: '',
  referenceId: '',
  jobId: '',
  publishedDate: '',
  expiryDate: '',
};

function toDateInput(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export default function RvaOpportunitiesPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<PaginatedResult<RvaOpportunity> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RvaOpportunity | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<RvaOpportunity | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [permTarget, setPermTarget] = useState<RvaOpportunity | null>(null);
  const [permDeleting, setPermDeleting] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    adminListRvaOpportunities({
      page,
      limit: 15,
      search,
      status,
      category,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, category]);

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

  const openEdit = (o: RvaOpportunity) => {
    setEditing(o);
    setForm({
      title: o.title,
      category: o.category,
      status: o.status,
      role: o.role ?? '',
      sector: o.sector ?? '',
      company: o.company ?? '',
      organization: o.organization ?? '',
      location: o.location ?? '',
      geography: o.geography ?? '',
      country: o.country ?? '',
      budget: o.budget ?? '',
      salary: o.salary ?? '',
      commercialValue: o.commercialValue ?? '',
      minExperience: o.minExperience != null ? String(o.minExperience) : '',
      maxExperience: o.maxExperience != null ? String(o.maxExperience) : '',
      experienceText: o.experienceText ?? '',
      eligibility: o.eligibility ?? '',
      qualification: o.qualification ?? '',
      requirements: o.requirements ?? '',
      otherDetails: o.otherDetails ?? '',
      description: o.description ?? '',
      howToApply: o.howToApply ?? '',
      applicationUrl: o.applicationUrl ?? '',
      applicationContact: o.applicationContact ?? '',
      source: o.source ?? '',
      referenceId: o.referenceId ?? '',
      jobId: o.jobId ?? '',
      publishedDate: toDateInput(o.publishedDate),
      expiryDate: toDateInput(o.expiryDate),
    });
    setFormOpen(true);
  };

  const buildBody = () => {
    const text = (v: string) => (v.trim() ? v.trim() : null);
    const num = (v: string) => (v.trim() === '' ? null : Number(v));
    return {
      title: form.title.trim(),
      category: form.category,
      status: form.status,
      description: text(form.description),
      role: text(form.role),
      sector: text(form.sector),
      company: text(form.company),
      organization: text(form.organization),
      location: text(form.location),
      geography: text(form.geography),
      country: text(form.country),
      budget: text(form.budget),
      salary: text(form.salary),
      commercialValue: text(form.commercialValue),
      minExperience: num(form.minExperience),
      maxExperience: num(form.maxExperience),
      experienceText: text(form.experienceText),
      eligibility: text(form.eligibility),
      qualification: text(form.qualification),
      requirements: text(form.requirements),
      otherDetails: text(form.otherDetails),
      howToApply: text(form.howToApply),
      applicationUrl: text(form.applicationUrl),
      applicationContact: text(form.applicationContact),
      source: text(form.source),
      referenceId: text(form.referenceId),
      jobId: text(form.jobId),
      publishedDate: form.publishedDate || null,
      expiryDate: form.expiryDate || null,
    };
  };

  const save = async () => {
    if (!form.title.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    const minExp = form.minExperience.trim() === '' ? null : Number(form.minExperience);
    const maxExp = form.maxExperience.trim() === '' ? null : Number(form.maxExperience);
    if (minExp != null && (!Number.isInteger(minExp) || minExp < 0)) {
      showToast('Minimum experience must be a whole number of 0 or more', 'error');
      return;
    }
    if (maxExp != null && (!Number.isInteger(maxExp) || maxExp < 0)) {
      showToast('Maximum experience must be a whole number of 0 or more', 'error');
      return;
    }
    if (minExp != null && maxExp != null && minExp > maxExp) {
      showToast('Minimum experience cannot exceed maximum experience', 'error');
      return;
    }

    setSaving(true);
    try {
      const body = buildBody();
      if (editing) {
        await adminUpdateRvaOpportunity(editing.id, body);
        showToast('Opportunity updated', 'success');
      } else {
        await adminCreateRvaOpportunity(body);
        showToast('Opportunity created', 'success');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (o: RvaOpportunity) => {
    setStatusBusy(o.id);
    try {
      if (o.status === 'PUBLISHED') {
        await adminUpdateRvaOpportunity(o.id, { status: 'DRAFT' });
        showToast('Opportunity unpublished', 'success');
      } else {
        await adminUpdateRvaOpportunity(o.id, {
          status: 'PUBLISHED',
          publishedDate: o.publishedDate ?? new Date().toISOString(),
        });
        showToast('Opportunity published', 'success');
      }
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setStatusBusy(null);
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await adminArchiveRvaOpportunity(archiveTarget.id);
      showToast('Opportunity archived', 'success');
      setArchiveTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setArchiving(false);
    }
  };

  const confirmDelete = async () => {
    if (!permTarget) return;
    setPermDeleting(true);
    try {
      await adminDeleteRvaOpportunityPermanent(permTarget.id);
      showToast('Opportunity deleted permanently', 'success');
      setPermTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setPermDeleting(false);
    }
  };

  const rowActions = (o: RvaOpportunity) => [
    {
      label: o.status === 'PUBLISHED' ? 'Unpublish' : 'Publish',
      onClick: () => togglePublish(o),
    },
    { label: 'Edit', onClick: () => openEdit(o) },
    { label: 'Archive', danger: true, onClick: () => setArchiveTarget(o) },
    { label: 'Delete permanently', danger: true, onClick: () => setPermTarget(o) },
  ];

  const columns: Column<RvaOpportunity>[] = [
    {
      key: 'title',
      label: 'Opportunity',
      render: (o) => (
        <div className="max-w-xs">
          <p className="font-medium text-content">{o.title}</p>
          <p className="truncate text-xs text-content-muted">
            {[o.company || o.organization, o.jobId || o.referenceId].filter(Boolean).join(' · ') ||
              '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (o) => <Badge variant="info">{RVA_CATEGORY_LABELS[o.category] ?? o.category}</Badge>,
    },
    {
      key: 'role',
      label: 'Role / Sector',
      render: (o) => (
        <span className="text-content-muted">
          {[o.role, o.sector].filter(Boolean).join(' · ') || '—'}
        </span>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (o) => (
        <span className="text-content-muted">
          {[o.location, o.country].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    {
      key: 'publishedDate',
      label: 'Published',
      render: (o) => <span className="text-content-muted">{formatDate(o.publishedDate)}</span>,
    },
    { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
    {
      key: 'actions',
      label: '',
      render: (o) => (
        <>
          <div className="hidden items-center gap-2 sm:flex">
            <Button
              maxWidth="max-w-md"
              variant="secondary"
              loading={statusBusy === o.id}
              onClick={() => togglePublish(o)}
            >
              {o.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
            </Button>
            <Button maxWidth="max-w-md" variant="secondary" onClick={() => openEdit(o)}>
              Edit
            </Button>
            <Button maxWidth="max-w-md" variant="danger" onClick={() => setArchiveTarget(o)}>
              Archive
            </Button>
            <Button maxWidth="max-w-md" variant="danger" onClick={() => setPermTarget(o)}>
              Delete
            </Button>
          </div>
          <ActionMenu
            className="sm:hidden"
            label={`Actions for ${o.title}`}
            items={rowActions(o)}
          />
        </>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="RVA Opportunities"
        subtitle={
          data
            ? `${data.meta.totalItems.toLocaleString()} opportunities in Recruitment Vendor Access`
            : 'Procurement, RFP and vendor opportunities'
        }
        actions={
          <Button onClick={openCreate}>
            <span className="text-lg leading-none">+</span> New Opportunity
          </Button>
        }
      />

      <Card className="mb-6" padding={false}>
        <form onSubmit={handleSearch} className="grid gap-4 p-5 md:grid-cols-4">
          <Input
            label="Search"
            placeholder="Title, role, company, ID"
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
            options={STATUS_OPTIONS}
          />
          <Select
            label="Category"
            placeholder="All categories"
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value);
            }}
            options={CATEGORY_OPTIONS}
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
          <Table columns={columns} data={data.items} rowKey={(o) => o.id} />
          <Pagination
            currentPage={data.meta.page}
            totalPages={data.meta.totalPages}
            onPageChange={setPage}
          />
        </>
      ) : (
        <Card>
          <EmptyState
            title="No opportunities found"
            description="Create an opportunity or adjust your search and filters."
            action={<Button onClick={openCreate}>New Opportunity</Button>}
          />
        </Card>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit opportunity' : 'New opportunity'}
        maxWidth="max-w-3xl"
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
        <div className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-content">Core details</h3>
            <Input
              label="Title"
              required
              placeholder="RFP: Contingent staffing partner"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                options={CATEGORY_OPTIONS}
              />
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                options={STATUS_OPTIONS}
              />
            </div>
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-content">Scope & party</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Role / Opportunity title"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              />
              <Input
                label="Sector"
                value={form.sector}
                onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
              />
              <Input
                label="Company"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
              <Input
                label="Organization"
                value={form.organization}
                onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
              />
              <Input
                label="Location"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
              <Input
                label="Geography"
                value={form.geography}
                onChange={(e) => setForm((f) => ({ ...f, geography: e.target.value }))}
              />
              <Input
                label="Country"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-content">Commercials</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Budget"
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              />
              <Input
                label="Salary"
                value={form.salary}
                onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
              />
              <Input
                label="Commercial value"
                value={form.commercialValue}
                onChange={(e) => setForm((f) => ({ ...f, commercialValue: e.target.value }))}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-content">Experience & eligibility</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Min experience (years)"
                type="number"
                min={0}
                value={form.minExperience}
                onChange={(e) => setForm((f) => ({ ...f, minExperience: e.target.value }))}
              />
              <Input
                label="Max experience (years)"
                type="number"
                min={0}
                value={form.maxExperience}
                onChange={(e) => setForm((f) => ({ ...f, maxExperience: e.target.value }))}
              />
            </div>
            <Input
              label="Experience text"
              value={form.experienceText}
              onChange={(e) => setForm((f) => ({ ...f, experienceText: e.target.value }))}
            />
            <Textarea
              label="Eligibility"
              value={form.eligibility}
              onChange={(e) => setForm((f) => ({ ...f, eligibility: e.target.value }))}
            />
            <Textarea
              label="Qualification"
              value={form.qualification}
              onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))}
            />
            <Textarea
              label="Requirements"
              value={form.requirements}
              onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
            />
            <Textarea
              label="Other details"
              value={form.otherDetails}
              onChange={(e) => setForm((f) => ({ ...f, otherDetails: e.target.value }))}
            />
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-content">Application</h3>
            <Textarea
              label="How to apply"
              value={form.howToApply}
              onChange={(e) => setForm((f) => ({ ...f, howToApply: e.target.value }))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Application URL"
                placeholder="https://"
                value={form.applicationUrl}
                onChange={(e) => setForm((f) => ({ ...f, applicationUrl: e.target.value }))}
              />
              <Input
                label="Application contact"
                value={form.applicationContact}
                onChange={(e) => setForm((f) => ({ ...f, applicationContact: e.target.value }))}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-content">Tracking</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Source"
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              />
              <Input
                label="Reference ID"
                value={form.referenceId}
                onChange={(e) => setForm((f) => ({ ...f, referenceId: e.target.value }))}
              />
              <Input
                label="Opportunity ID"
                value={form.jobId}
                onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}
              />
              <Input
                label="Published date"
                type="date"
                value={form.publishedDate}
                onChange={(e) => setForm((f) => ({ ...f, publishedDate: e.target.value }))}
              />
              <Input
                label="Expiry date"
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
              />
            </div>
          </section>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
        title="Archive opportunity"
        message={`Archive "${archiveTarget?.title}"? It will be removed from the RVA catalog but retained for records.`}
        confirmText="Archive"
        loading={archiving}
      />

      <ConfirmDialog
        isOpen={!!permTarget}
        onClose={() => setPermTarget(null)}
        onConfirm={confirmDelete}
        title="Delete permanently"
        message={`Are you sure you want to permanently delete "${permTarget?.title}"? This cannot be undone.`}
        confirmText="Yes, delete"
        loading={permDeleting}
      />
    </div>
  );
}
