'use client';

import { useEffect, useState } from 'react';
import {
  adminListOpportunities,
  adminCreateOpportunity,
  adminUpdateOpportunity,
  adminDeleteOpportunity,
  adminImportOpportunities,
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

interface FormState {
  title: string;
  description: string;
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
  category: string;
  status: string;
  expiryDate: string;
  vaultIds: string[];
  experienceLevelIds: string[];
}

const emptyForm: FormState = {
  title: '',
  description: '',
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
  const [page, setPage] = useState(1);

  const [allVaults, setAllVaults] = useState<Vault[]>([]);
  const [allLevels, setAllLevels] = useState<ExperienceLevel[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Opportunity | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    failed: number;
    errors: Array<{ row: number; title?: string; error: string }>;
  } | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    adminListOpportunities({ page, limit: 15, search, status, category, employmentType })
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, category, employmentType]);

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

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormOpen(true);
  };

  const openEdit = (o: Opportunity) => {
    setEditing(o);
    setForm({
      title: o.title,
      description: o.description ?? '',
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

  const runImport = async () => {
    if (!importFile) return;
    setSaving(true);
    try {
      const res = await adminImportOpportunities(importFile);
      setImportResult(res);
      showToast(`Imported ${res.imported}, failed ${res.failed}`, 'success');
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
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
          {o.location && <p className="text-sm text-content-muted">{o.location}</p>}
        </div>
      ),
    },
    {
      key: 'company',
      label: 'Company',
      render: (o) => <span className="text-content">{o.company || '—'}</span>,
    },
    {
      key: 'category',
      label: 'Category',
      render: (o) => <Badge variant="info">{titleCase(o.category)}</Badge>,
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
            <Button size="sm" variant="danger" onClick={() => setDeleteTarget(o)}>
              Archive
            </Button>
          </div>
          <ActionMenu
            className="sm:hidden"
            label={`Actions for ${o.title}`}
            items={[
              { label: 'Edit', onClick: () => openEdit(o) },
              { label: 'Archive', danger: true, onClick: () => setDeleteTarget(o) },
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
            : 'Manage job opportunities'
        }
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setImportResult(null);
                setImportOpen(true);
              }}
            >
              Import
            </Button>
            <Button onClick={openCreate}>New Opportunity</Button>
          </>
        }
      />

      <Card className="mb-6" padding={false}>
        <form onSubmit={handleSearch} className="grid gap-4 p-5 md:grid-cols-5">
          <Input
            label="Search"
            placeholder="Title, company"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            <label className="mb-1 block text-sm font-medium text-content">Vaults</label>
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

      <Modal
        isOpen={importOpen}
        onClose={() => {
          setImportOpen(false);
          setImportResult(null);
          setImportFile(null);
        }}
        title="Import opportunities"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setImportOpen(false);
                setImportResult(null);
                setImportFile(null);
              }}
            >
              Close
            </Button>
            <Button onClick={runImport} loading={saving} disabled={!importFile}>
              Import
            </Button>
          </div>
        }
      >
        {!importResult ? (
          <div className="space-y-4">
            <p className="text-sm text-content-muted">
              Upload a CSV or Excel (.xlsx/.xls) file with columns: title, description, company,
              location, country, employment_type, industry, functional_area, min_experience,
              max_experience, application_url, application_contact, source, category, status,
              expiry_date.
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="block w-full text-sm text-content file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-950 dark:file:text-brand-300"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{importResult.imported}</p>
                <p className="text-sm text-emerald-700">Imported</p>
              </div>
              <div className="rounded-lg bg-red-50 p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{importResult.failed}</p>
                <p className="text-sm text-red-700">Failed</p>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-line p-3">
                {importResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-content-muted">
                    Row {e.row}: {e.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
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
    </div>
  );
}
