'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  adminListOpportunities,
  adminUpdateOpportunity,
  adminCreateOpportunity,
  adminDeleteOpportunity,
  adminDeleteOpportunityPermanent,
  adminListVaults,
  adminListExperienceLevels,
} from '@/lib/services';
import {
  Opportunity,
  Vault,
  ExperienceLevel,
  PaginatedResult,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_CATEGORIES,
  EMPLOYMENT_TYPES,
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
  Table,
  Textarea,
  useToast,
} from '@/components/ui';
import { formatDate, titleCase, experienceLabel } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

type OpportunityView = 'grid' | 'list';

function GridIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

function ListIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: OpportunityView;
  onChange: (v: OpportunityView) => void;
}) {
  const base =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400';
  const active = 'bg-brand-600 text-white shadow-sm';
  const idle = 'text-content-muted hover:text-content';
  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1"
      role="group"
      aria-label="Toggle view"
    >
      <button
        type="button"
        onClick={() => onChange('grid')}
        aria-pressed={view === 'grid'}
        className={`${base} ${view === 'grid' ? active : idle}`}
      >
        <GridIcon className="h-4 w-4" />
        Grid
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-pressed={view === 'list'}
        className={`${base} ${view === 'list' ? active : idle}`}
      >
        <ListIcon className="h-4 w-4" />
        List
      </button>
    </div>
  );
}

interface FormState {
  title: string;
  description: string;
  qualification: string;
  company: string;
  location: string;
  country: string;
  employmentType: string;
  industry: string;
  functionalArea: string;
  minExperience: string;
  maxExperience: string;
  applicationUrl: string;
  applicationContact: string;
  source: string;
  salary: string;
  experienceText: string;
  externalRef: string;
  category: string;
  status: string;
  expiryDate: string;
  vaultIds: string[];
  experienceLevelIds: string[];
}

const emptyForm: FormState = {
  title: '',
  description: '',
  qualification: '',
  company: '',
  location: '',
  country: '',
  employmentType: '',
  industry: '',
  functionalArea: '',
  minExperience: '',
  maxExperience: '',
  applicationUrl: '',
  applicationContact: '',
  source: '',
  salary: '',
  experienceText: '',
  externalRef: '',
  category: 'INDIA',
  status: 'DRAFT',
  expiryDate: '',
  vaultIds: [],
  experienceLevelIds: [],
};

export default function OpportunitiesPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<PaginatedResult<Opportunity> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [vaultId, setVaultId] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<OpportunityView>('list');

  const [allVaults, setAllVaults] = useState<Vault[]>([]);
  const [allLevels, setAllLevels] = useState<ExperienceLevel[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Opportunity | null>(null);
  const [permDeleting, setPermDeleting] = useState(false);
  const [permTarget, setPermTarget] = useState<Opportunity | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    adminListOpportunities({
      page,
      limit: 15,
      search,
      status,
      category,
      employmentType,
      vaultId,
    })
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, category, employmentType, vaultId]);

  useEffect(() => {
    adminListVaults({ page: 1, limit: 100 })
      .then((v) => setAllVaults(v.items))
      .catch(() => {});
    adminListExperienceLevels()
      .then(setAllLevels)
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const openEdit = (o: Opportunity) => {
    setEditing(o);
    setForm({
      title: o.title,
      description: o.description ?? '',
      qualification: o.qualification ?? '',
      company: o.company ?? '',
      location: o.location ?? '',
      country: o.country ?? '',
      employmentType: o.employmentType ?? '',
      industry: o.industry ?? '',
      functionalArea: o.functionalArea ?? '',
      minExperience: o.minExperience != null ? String(o.minExperience) : '',
      maxExperience: o.maxExperience != null ? String(o.maxExperience) : '',
      applicationUrl: o.applicationUrl ?? '',
      applicationContact: o.applicationContact ?? '',
      source: o.source ?? '',
      salary: o.salary ?? '',
      experienceText: o.experienceText ?? '',
      externalRef: o.externalRef ?? '',
      category: o.category,
      status: o.status,
      expiryDate: o.expiryDate ? o.expiryDate.slice(0, 10) : '',
      vaultIds: (o.vaults || []).map((v) => v.id),
      experienceLevelIds: (o.experienceLevels || []).map((el) => el.id),
    });
    setFormOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        title: form.title,
        description: form.description || undefined,
        qualification: form.qualification || undefined,
        company: form.company || undefined,
        location: form.location || undefined,
        country: form.country || undefined,
        employmentType: form.employmentType || undefined,
        industry: form.industry || undefined,
        functionalArea: form.functionalArea || undefined,
        minExperience: form.minExperience ? Number(form.minExperience) : undefined,
        maxExperience: form.maxExperience ? Number(form.maxExperience) : undefined,
        applicationUrl: form.applicationUrl || undefined,
        applicationContact: form.applicationContact || undefined,
        source: form.source || undefined,
        salary: form.salary || undefined,
        experienceText: form.experienceText || undefined,
        externalRef: form.externalRef || undefined,
        category: form.category,
        status: form.status || undefined,
        expiryDate: form.expiryDate || undefined,
        vaultIds: form.vaultIds,
        experienceLevelIds: form.experienceLevelIds,
      };
      if (editing) {
        await adminUpdateOpportunity(editing.id, body);
        showToast('Opportunity updated', 'success');
      } else {
        await adminCreateOpportunity(body);
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDeleteOpportunity(deleteTarget.id);
      showToast('Opportunity archived', 'success');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!permTarget) return;
    setPermDeleting(true);
    try {
      await adminDeleteOpportunityPermanent(permTarget.id);
      showToast('Opportunity deleted permanently', 'success');
      setPermTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setPermDeleting(false);
    }
  };

  const toggle = (field: 'vaultIds' | 'experienceLevelIds', value: string) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((x) => x !== value)
        : [...f[field], value],
    }));

  const oppStatusVariant = (s: string): 'success' | 'neutral' | 'danger' =>
    s === 'PUBLISHED' ? 'success' : s === 'DRAFT' ? 'neutral' : 'danger';

  const columns: Column<Opportunity>[] = [
    {
      key: 'title',
      label: 'Title',
      render: (o) => (
        <div>
          <p className="font-medium text-content">{o.title}</p>
          {o.externalRef && <p className="text-xs text-content-faint">{o.externalRef}</p>}
        </div>
      ),
    },
    {
      key: 'vaults',
      label: 'Vaults',
      render: (o) => (
        <div className="flex flex-wrap gap-1">
          {(o.vaults || []).map((v) => (
            <Badge key={v.id} variant="info">
              {v.name}
            </Badge>
          ))}
          {(o.vaults || []).length === 0 && <span className="text-content-faint">—</span>}
        </div>
      ),
    },
    {
      key: 'company',
      label: 'Company / Location',
      render: (o) => (
        <div>
          <span className="text-content">{o.company || '—'}</span>
          {o.location && <p className="text-xs text-content-muted">{o.location}</p>}
        </div>
      ),
    },
    {
      key: 'salary',
      label: 'Salary',
      render: (o) => <span className="text-content-muted">{o.salary || '—'}</span>,
    },
    {
      key: 'exp',
      label: 'Experience',
      render: (o) => (
        <span className="text-content-muted">
          {experienceLabel(o.minExperience, o.maxExperience)}
        </span>
      ),
    },
    {
      key: 'qualification',
      label: 'Qualification',
      render: (o) => <span className="text-content-muted">{o.qualification || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (o) => <Badge variant={oppStatusVariant(o.status)}>{o.status}</Badge>,
    },
    {
      key: 'published',
      label: 'Published',
      render: (o) => <span className="text-content-muted">{formatDate(o.publishedDate)}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (o) => (
        <>
          <div className="hidden items-center gap-2 sm:flex">
            <Button size="sm" variant="secondary" onClick={() => openEdit(o)}>
              Edit
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setDeleteTarget(o)}>
              Archive
            </Button>
            <Button size="sm" variant="danger" onClick={() => setPermTarget(o)}>
              Delete
            </Button>
          </div>
          <ActionMenu
            className="sm:hidden"
            label={`Actions for ${o.title}`}
            items={[
              { label: 'Edit', onClick: () => openEdit(o) },
              { label: 'Archive', danger: true, onClick: () => setDeleteTarget(o) },
              { label: 'Delete permanently', danger: true, onClick: () => setPermTarget(o) },
            ]}
          />
        </>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Opportunities"
        subtitle={
          data
            ? `${data.meta.totalItems.toLocaleString()} total opportunities`
            : 'Manage job opportunities by vault'
        }
        actions={
          <>
            <Link href="/opportunities/import">
              <Button variant="secondary">Import Jobs</Button>
            </Link>
            <Link href="/opportunities/new">
              <Button>Add Job</Button>
            </Link>
          </>
        }
      />

      <Card className="mb-6" padding={false}>
        <form onSubmit={handleSearch} className="grid gap-4 p-5 md:grid-cols-6">
          <Input
            label="Search"
            placeholder="Title, company"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            label="Vault"
            placeholder="All"
            value={vaultId}
            onChange={(e) => {
              setPage(1);
              setVaultId(e.target.value);
            }}
            options={allVaults.map((v) => ({ value: v.id, label: v.name }))}
          />
          <Select
            label="Status"
            placeholder="All"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            options={OPPORTUNITY_STATUSES.map((s) => ({ value: s, label: s }))}
          />
          <Select
            label="Category"
            placeholder="All"
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value);
            }}
            options={OPPORTUNITY_CATEGORIES.map((c) => ({ value: c, label: titleCase(c) }))}
          />
          <Select
            label="Employment type"
            placeholder="All"
            value={employmentType}
            onChange={(e) => {
              setPage(1);
              setEmploymentType(e.target.value);
            }}
            options={EMPLOYMENT_TYPES.map((t) => ({ value: t, label: titleCase(t) }))}
          />
          <div className="flex items-end gap-2">
            <Button type="submit" className="flex-1">
              Search
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSearch('');
                setStatus('');
                setCategory('');
                setEmploymentType('');
                setVaultId('');
                setPage(1);
                load();
              }}
            >
              Reset
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
          <div className="mb-4 flex justify-end">
            <ViewToggle view={view} onChange={setView} />
          </div>
          {view === 'grid' ? (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.map((o) => (
                <article
                  key={o.id}
                  className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-content">{o.title}</h3>
                      {o.externalRef && (
                        <p className="mt-0.5 text-xs text-content-faint">{o.externalRef}</p>
                      )}
                    </div>
                    <Badge variant={oppStatusVariant(o.status)}>{o.status}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(o.vaults || []).map((v) => (
                      <Badge key={v.id} variant="info">
                        {v.name}
                      </Badge>
                    ))}
                    {(o.vaults || []).length === 0 && <span className="text-content-faint">—</span>}
                  </div>
                  <dl className="mt-4 space-y-2 text-sm text-content-muted">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt>Company</dt>
                      <dd className="truncate font-medium text-content">{o.company || '—'}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt>Location</dt>
                      <dd className="truncate text-content">{o.location || o.country || '—'}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt>Salary</dt>
                      <dd className="truncate text-content">{o.salary || '—'}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt>Experience</dt>
                      <dd className="whitespace-nowrap text-content">
                        {experienceLabel(o.minExperience, o.maxExperience)}
                      </dd>
                    </div>
                    {o.qualification && (
                      <div className="flex items-baseline justify-between gap-3">
                        <dt>Qualification</dt>
                        <dd className="truncate text-content">{o.qualification}</dd>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between gap-3">
                      <dt>Published</dt>
                      <dd className="whitespace-nowrap text-content">
                        {formatDate(o.publishedDate)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-auto flex items-center justify-end gap-2 border-t border-line pt-4">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(o)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setDeleteTarget(o)}>
                      Archive
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setPermTarget(o)}>
                      Delete
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Table columns={columns} data={data.items} />
          )}
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
            description="Try adjusting your search or filters."
          />
        </Card>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit opportunity' : 'New opportunity'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Textarea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <Input
            label="Qualification"
            value={form.qualification}
            onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Company"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
            <Input
              label="Country"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
            <Input
              label="Industry"
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            />
            <Input
              label="Functional area"
              value={form.functionalArea}
              onChange={(e) => setForm((f) => ({ ...f, functionalArea: e.target.value }))}
            />
            <Input
              label="Source"
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            />
            <Select
              label="Employment type"
              placeholder="Select"
              value={form.employmentType}
              onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}
              options={EMPLOYMENT_TYPES.map((t) => ({ value: t, label: titleCase(t) }))}
            />
            <Input
              label="Expiry date"
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
            />
            <Input
              label="External ref (S. No.)"
              value={form.externalRef}
              onChange={(e) => setForm((f) => ({ ...f, externalRef: e.target.value }))}
            />
            <Input
              label="Salary"
              value={form.salary}
              onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
            />
            <Input
              label="Min experience (yrs)"
              type="number"
              min={0}
              value={form.minExperience}
              onChange={(e) => setForm((f) => ({ ...f, minExperience: e.target.value }))}
            />
            <Input
              label="Max experience (yrs)"
              type="number"
              min={0}
              value={form.maxExperience}
              onChange={(e) => setForm((f) => ({ ...f, maxExperience: e.target.value }))}
            />
            <Input
              label="Application URL"
              value={form.applicationUrl}
              onChange={(e) => setForm((f) => ({ ...f, applicationUrl: e.target.value }))}
            />
            <Input
              label="Application contact"
              value={form.applicationContact}
              onChange={(e) => setForm((f) => ({ ...f, applicationContact: e.target.value }))}
            />
          </div>
          <Textarea
            label="Experience (free text)"
            rows={2}
            value={form.experienceText}
            onChange={(e) => setForm((f) => ({ ...f, experienceText: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              options={OPPORTUNITY_CATEGORIES.map((c) => ({ value: c, label: titleCase(c) }))}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              options={OPPORTUNITY_STATUSES.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-content">Vaults (required)</label>
            <div className="grid grid-cols-2 gap-2">
              {allVaults.map((v) => (
                <label key={v.id} className="flex items-center gap-2 text-sm text-content-muted">
                  <input
                    type="checkbox"
                    checked={form.vaultIds.includes(v.id)}
                    onChange={() => toggle('vaultIds', v.id)}
                  />
                  {v.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-content">Experience levels</label>
            <div className="grid grid-cols-2 gap-2">
              {allLevels.map((el) => (
                <label key={el.id} className="flex items-center gap-2 text-sm text-content-muted">
                  <input
                    type="checkbox"
                    checked={form.experienceLevelIds.includes(el.id)}
                    onChange={() => toggle('experienceLevelIds', el.id)}
                  />
                  {el.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Archive opportunity"
        message={`Archive "${deleteTarget?.title}"? This cannot be undone.`}
        confirmText="Archive"
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={!!permTarget}
        onClose={() => setPermTarget(null)}
        onConfirm={confirmPermanentDelete}
        title="Delete permanently"
        message={`Are you sure you want to delete "${permTarget?.title}"? This will permanently remove it and cannot be undone.`}
        confirmText="Yes, delete"
        loading={permDeleting}
      />
    </div>
  );
}
