'use client';

import { useEffect, useState } from 'react';
import {
  adminListVaults,
  adminCreateVault,
  adminUpdateVault,
  adminDeleteVault,
  adminRestoreVault,
  adminListExperienceLevels,
  adminLinkVaultExperienceLevel,
  adminUnlinkVaultExperienceLevel,
} from '@/lib/services';
import { Vault, ExperienceLevel, PaginatedResult, VAULT_TYPES, VAULT_STATUSES } from '@/lib/types';
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
  Textarea,
  StatusBadge,
  EmptyState,
  ErrorState,
  PageHeader,
  useToast,
  Column,
  Table,
} from '@/components/ui';
import { titleCase } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

interface FormState {
  name: string;
  description: string;
  type: string;
  status: string;
  sortOrder: string;
}

const emptyForm: FormState = {
  name: '',
  description: '',
  type: 'INDIA',
  status: 'ACTIVE',
  sortOrder: '0',
};

export default function VaultsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<PaginatedResult<Vault> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [levels, setLevels] = useState<ExperienceLevel[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vault | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vault | null>(null);
  const [manageTarget, setManageTarget] = useState<Vault | null>(null);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    setError('');
    adminListVaults({ page, limit: 15, search, status })
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  useEffect(() => {
    adminListExperienceLevels()
      .then(setLevels)
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

  const openEdit = (v: Vault) => {
    setEditing(v);
    setForm({
      name: v.name,
      description: v.description ?? '',
      type: v.type,
      status: v.status,
      sortOrder: String(v.sortOrder ?? 0),
    });
    setFormOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        name: form.name,
        description: form.description || undefined,
        type: form.type || undefined,
        status: form.status || undefined,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
      };
      if (editing) {
        await adminUpdateVault(editing.id, body);
        showToast('Vault updated', 'success');
      } else {
        await adminCreateVault(body);
        showToast('Vault created', 'success');
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
      await adminDeleteVault(deleteTarget.id);
      showToast('Vault archived', 'success');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const confirmRestore = async (v: Vault) => {
    try {
      await adminRestoreVault(v.id);
      showToast('Vault restored to active', 'success');
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const openManage = async (v: Vault) => {
    setManageTarget(v);
    setLinkedIds(Array.isArray(v.experienceLevels) ? v.experienceLevels.map((el) => el.id) : []);
  };

  const toggleLink = async (el: ExperienceLevel) => {
    if (!manageTarget) return;
    try {
      if (linkedIds.includes(el.id)) {
        await adminUnlinkVaultExperienceLevel(manageTarget.id, el.id);
        setLinkedIds((prev) => prev.filter((x) => x !== el.id));
        showToast('Removed experience level', 'success');
      } else {
        await adminLinkVaultExperienceLevel(manageTarget.id, el.id);
        setLinkedIds((prev) => [...prev, el.id]);
        showToast('Linked experience level', 'success');
      }
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const columns: Column<Vault>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (v) => (
        <div>
          <p className="font-medium text-content">{v.name}</p>
          {v.description && (
            <p className="text-sm text-content-muted line-clamp-1">{v.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (v) => <Badge variant="info">{titleCase(v.type)}</Badge>,
    },
    {
      key: 'levels',
      label: 'Experience levels',
      render: (v) =>
        (v.experienceLevels || []).length === 0 ? (
          <span className="text-content-faint">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {(v.experienceLevels || []).map((el) => (
              <Badge key={el.id} variant="neutral">
                {el.name}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => <StatusBadge value={v.status} />,
    },
    {
      key: 'actions',
      label: '',
      render: (v) =>
        v.status === 'ARCHIVED' ? (
          <>
            <div className="hidden items-center gap-2 sm:flex">
              <Button size="sm" variant="secondary" onClick={() => confirmRestore(v)}>
                Restore
              </Button>
            </div>
            <ActionMenu
              className="sm:hidden"
              label={`Actions for ${v.name}`}
              items={[{ label: 'Restore', onClick: () => confirmRestore(v) }]}
            />
          </>
        ) : (
          <>
            <div className="hidden items-center gap-2 sm:flex">
              <Button size="sm" variant="secondary" onClick={() => openManage(v)}>
                Link levels
              </Button>
              <Button size="sm" variant="secondary" onClick={() => openEdit(v)}>
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => setDeleteTarget(v)}>
                Archive
              </Button>
            </div>
            <ActionMenu
              className="sm:hidden"
              label={`Actions for ${v.name}`}
              items={[
                { label: 'Link levels', onClick: () => openManage(v) },
                { label: 'Edit', onClick: () => openEdit(v) },
                { label: 'Archive', danger: true, onClick: () => setDeleteTarget(v) },
              ]}
            />
          </>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Vaults"
        subtitle={
          data ? `${data.meta.totalItems.toLocaleString()} total vaults` : 'Manage content vaults'
        }
        actions={
          <Button onClick={openCreate}>
            <span className="text-lg leading-none">+</span> New Vault
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
            placeholder="All statuses"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            options={VAULT_STATUSES.map((s) => ({ value: s, label: s }))}
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
          <EmptyState title="No vaults found" description="Try adjusting your search or filters." />
        </Card>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit vault' : 'New vault'}
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
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            options={VAULT_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            options={VAULT_STATUSES.map((s) => ({ value: s, label: s }))}
          />
          <Input
            label="Sort order"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
          />
        </div>
      </Modal>

      <Modal
        isOpen={!!manageTarget}
        onClose={() => setManageTarget(null)}
        title={`Link experience levels — ${manageTarget?.name || ''}`}
      >
        <div className="space-y-2">
          {levels.length === 0 && (
            <p className="text-sm text-content-muted">No experience levels defined.</p>
          )}
          {levels.map((el) => {
            const linked = linkedIds.includes(el.id);
            return (
              <div
                key={el.id}
                className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 dark:bg-surface"
              >
                <div>
                  <p className="text-sm font-medium text-content">{el.name}</p>
                  <p className="text-xs text-content-muted">
                    {el.minYears}+{el.maxYears != null ? `–${el.maxYears}` : ''} yrs
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={linked ? 'secondary' : 'primary'}
                  onClick={() => toggleLink(el)}
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
        title="Archive vault"
        message={`Archive "${deleteTarget?.name}"? Existing subscription entitlements and opportunities remain intact. You can restore it later.`}
        confirmText="Archive"
        loading={deleting}
      />
    </div>
  );
}
