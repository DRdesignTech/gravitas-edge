'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  adminCreateRvaCoupon,
  adminDeleteRvaCoupon,
  adminDeleteRvaCouponPermanent,
  adminListRvaCouponUsages,
  adminListRvaCoupons,
  adminListRvaPlans,
  adminListUsers,
  adminRestoreRvaCoupon,
  adminUpdateRvaCoupon,
} from '@/lib/services';
import {
  CouponStatus,
  COUPON_DISCOUNT_TYPES,
  COUPON_STATUSES,
  PaginatedResult,
  RvaCoupon,
  RvaCouponUsageRow,
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
import { formatDateTime, formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

const STATUS_LABELS: Record<CouponStatus, string> = {
  ACTIVE: 'Active',
  SCHEDULED: 'Scheduled',
  EXPIRED: 'Expired',
  DISABLED: 'Disabled',
  USAGE_LIMIT_REACHED: 'Usage limit reached',
  ARCHIVED: 'Archived',
};

const STATUS_FILTERS = ['ALL', ...COUPON_STATUSES] as const;

interface FormState {
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  validFrom: string;
  validUntil: string;
  usageLimit: string;
  perUserUsageLimit: string;
  availability: 'ALL' | 'SPECIFIC';
  userEmails: string;
  planIds: string[];
  isActive: boolean;
}

const emptyForm: FormState = {
  code: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  validFrom: '',
  validUntil: '',
  usageLimit: '',
  perUserUsageLimit: '1',
  availability: 'ALL',
  userEmails: '',
  planIds: [],
  isActive: true,
};

function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

async function resolveUserEmails(emails: string[]): Promise<{ ids: string[]; missing: string[] }> {
  const results = await Promise.all(
    emails.map(async (email) => {
      try {
        const res = await adminListUsers({ search: email, limit: 10 });
        const hit = res.items.find((u) => u.email.toLowerCase() === email.toLowerCase());
        return hit ? hit.id : null;
      } catch {
        return null;
      }
    }),
  );
  return {
    ids: results.filter((id): id is string => Boolean(id)),
    missing: emails.filter((_, i) => !results[i]),
  };
}

export default function RvaCouponsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<PaginatedResult<RvaCoupon> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RvaCoupon | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [savingResolve, setSavingResolve] = useState(false);

  const [allPlans, setAllPlans] = useState<{ id: string; name: string }[]>([]);
  const [archiving, setArchiving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<RvaCoupon | null>(null);
  const [permDeleting, setPermDeleting] = useState(false);
  const [permTarget, setPermTarget] = useState<RvaCoupon | null>(null);
  const [togglePending, setTogglePending] = useState<string | null>(null);

  const [usagesOpen, setUsagesOpen] = useState(false);
  const [usagesTarget, setUsagesTarget] = useState<RvaCoupon | null>(null);
  const [usages, setUsages] = useState<PaginatedResult<RvaCouponUsageRow> | null>(null);
  const [usagesLoading, setUsagesLoading] = useState(false);
  const [usagesPage, setUsagesPage] = useState(1);

  const load = () => {
    setLoading(true);
    setError('');
    adminListRvaCoupons({
      page,
      limit: 15,
      search,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    })
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  useEffect(() => {
    adminListRvaPlans()
      .then((res) => setAllPlans(res.map((p) => ({ id: p.id, name: p.name }))))
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

  const openEdit = (coupon: RvaCoupon) => {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description ?? '',
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      validFrom: toLocalInput(coupon.validFrom),
      validUntil: toLocalInput(coupon.validUntil),
      usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : '',
      perUserUsageLimit: String(coupon.perUserUsageLimit),
      availability: coupon.appliesToAllUsers ? 'ALL' : 'SPECIFIC',
      userEmails: (coupon.users || []).map((u) => u.email).join('\n'),
      planIds: (coupon.plans || []).map((p) => p.id),
      isActive: coupon.isActive,
    });
    setFormOpen(true);
  };

  const discountPreview = useMemo(() => {
    const value = Number(form.discountValue);
    if (!Number.isFinite(value) || value <= 0) return null;
    return form.discountType === 'PERCENTAGE'
      ? `${Math.min(100, value)}% off`
      : `Flat ${formatMoney(Math.max(0, value), 'INR')} off`;
  }, [form.discountType, form.discountValue]);

  const save = async () => {
    const code = form.code.trim().toUpperCase().replace(/\s+/g, '');
    const discountValue = Number(form.discountValue);
    const perUserUsageLimit = Number(form.perUserUsageLimit) || 1;

    if (code.length < 3 || code.length > 40 || !/^[A-Z0-9_-]+$/.test(code)) {
      showToast('Code must be 3-40 characters using letters, numbers, dashes or underscores', 'error');
      return;
    }
    if (!(discountValue > 0)) {
      showToast('Discount must be greater than 0', 'error');
      return;
    }
    if (form.discountType === 'PERCENTAGE' && discountValue > 100) {
      showToast('Percentage discount cannot exceed 100', 'error');
      return;
    }
    if (!form.validFrom || !form.validUntil) {
      showToast('Set both the start and end date', 'error');
      return;
    }

    const validFrom = fromLocalInput(form.validFrom);
    const validUntil = fromLocalInput(form.validUntil);

    if (new Date(form.validUntil) <= new Date(form.validFrom)) {
      showToast('The end date must be after the start date', 'error');
      return;
    }

    setSaving(true);
    try {
      let userIds: string[] | undefined;
      if (form.availability === 'SPECIFIC') {
        setSavingResolve(true);
        const emails = form.userEmails
          .split('\n')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
        if (emails.length === 0) {
          showToast('Select at least one user for a specific-users coupon', 'error');
          setSavingResolve(false);
          return;
        }
        const { ids, missing } = await resolveUserEmails(emails);
        if (missing.length > 0) {
          showToast(`User(s) not found: ${missing.join(', ')}`, 'error');
          setSavingResolve(false);
          return;
        }
        userIds = ids;
      }

      const body: Record<string, unknown> = {
        code,
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue,
        validFrom,
        validUntil,
        usageLimit: form.usageLimit.trim() === '' ? null : Number(form.usageLimit),
        perUserUsageLimit,
        availability: form.availability,
        planIds: form.planIds,
        isActive: form.isActive,
        ...(userIds ? { userIds } : {}),
      };

      if (editing) {
        await adminUpdateRvaCoupon(editing.id, body);
        showToast('RVA coupon updated', 'success');
      } else {
        await adminCreateRvaCoupon(body);
        showToast('RVA coupon created', 'success');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSavingResolve(false);
      setSaving(false);
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await adminDeleteRvaCoupon(archiveTarget.id);
      showToast(`RVA coupon ${archiveTarget.code} archived`, 'success');
      setArchiveTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setArchiving(false);
    }
  };

  const confirmRestore = async (coupon: RvaCoupon) => {
    try {
      await adminRestoreRvaCoupon(coupon.id);
      showToast(`RVA coupon ${coupon.code} restored`, 'success');
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const confirmPermanentDelete = async () => {
    if (!permTarget) return;
    setPermDeleting(true);
    try {
      await adminDeleteRvaCouponPermanent(permTarget.id);
      showToast(`RVA coupon ${permTarget.code} deleted permanently`, 'success');
      setPermTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setPermDeleting(false);
    }
  };

  const toggleActive = async (coupon: RvaCoupon) => {
    setTogglePending(coupon.id);
    try {
      await adminUpdateRvaCoupon(coupon.id, { isActive: !coupon.isActive });
      showToast(
        coupon.isActive ? `RVA coupon ${coupon.code} disabled` : `RVA coupon ${coupon.code} enabled`,
        'success',
      );
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setTogglePending(null);
    }
  };

  const openUsages = async (coupon: RvaCoupon) => {
    setUsagesTarget(coupon);
    setUsagesOpen(true);
    setUsagesPage(1);
    setUsagesLoading(true);
    setUsages(null);
    try {
      setUsages(await adminListRvaCouponUsages(coupon.id, { page: 1, limit: 10 }));
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setUsagesLoading(false);
    }
  };

  const loadUsagesPage = async (next: number) => {
    if (!usagesTarget) return;
    setUsagesPage(next);
    setUsagesLoading(true);
    try {
      setUsages(await adminListRvaCouponUsages(usagesTarget.id, { page: next, limit: 10 }));
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setUsagesLoading(false);
    }
  };

  const columns: Column<RvaCoupon>[] = [
    {
      key: 'code',
      label: 'Code',
      render: (c) => (
        <div>
          <p className="font-mono font-semibold text-content">{c.code}</p>
          {c.description && <p className="text-sm text-content-muted line-clamp-1">{c.description}</p>}
        </div>
      ),
    },
    {
      key: 'discount',
      label: 'Discount',
      render: (c) => (
        <Badge variant={c.discountType === 'PERCENTAGE' ? 'info' : 'neutral'}>
          {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : formatMoney(c.discountValue, 'INR')}
        </Badge>
      ),
    },
    {
      key: 'window',
      label: 'Valid',
      render: (c) => (
        <div className="text-xs text-content-muted">
          <p>{formatDateTime(c.validFrom)}</p>
          <p>→ {formatDateTime(c.validUntil)}</p>
        </div>
      ),
    },
    {
      key: 'usage',
      label: 'Usage',
      render: (c) => (
        <div>
          <p className="text-sm font-medium text-content">
            {c.usageCount ?? 0}
            {c.remainingUsage != null && <span className="text-content-muted"> left</span>}
          </p>
          <p className="text-xs text-content-faint">
            {c.usageLimit == null ? 'Unlimited' : `Limit ${c.usageLimit}`} · {c.perUserUsageLimit} per user
          </p>
        </div>
      ),
    },
    {
      key: 'scope',
      label: 'Scope',
      render: (c) => (
        <div className="space-y-1">
          {c.appliesToAllUsers ? (
            <Badge variant="neutral">All users</Badge>
          ) : (
            <Badge variant="info">{c.users?.length ?? 0} user(s)</Badge>
          )}
          <div>
            {!c.plans || c.plans.length === 0 ? (
              <span className="text-xs text-content-faint">All RVA plans</span>
            ) : (
              <span className="text-xs text-content-muted">
                {c.plans.map((p) => p.name).join(', ')}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (c) => <StatusBadge status={c.status ? STATUS_LABELS[c.status] : c.status} />,
    },
    {
      key: 'actions',
      label: '',
      render: (c) =>
        c.status === 'ARCHIVED' ? (
          <>
            <div className="hidden items-center gap-2 sm:flex">
              <Button maxWidth="max-w-md" variant="secondary" onClick={() => confirmRestore(c)}>
                Restore
              </Button>
              <Button maxWidth="max-w-md" variant="danger" onClick={() => setPermTarget(c)}>
                Delete
              </Button>
            </div>
            <ActionMenu
              className="sm:hidden"
              label={`Actions for ${c.code}`}
              items={[
                { label: 'Restore', onClick: () => confirmRestore(c) },
                { label: 'Delete', danger: true, onClick: () => setPermTarget(c) },
              ]}
            />
          </>
        ) : (
          <>
            <div className="hidden items-center gap-2 sm:flex">
              <Button maxWidth="max-w-md" variant="secondary" onClick={() => openUsages(c)}>
                Usages
              </Button>
              <Button maxWidth="max-w-md" variant="secondary" onClick={() => openEdit(c)}>
                Edit
              </Button>
              <Button
                maxWidth="max-w-md"
                variant={c.isActive ? 'danger' : 'secondary'}
                loading={togglePending === c.id}
                onClick={() => toggleActive(c)}
                title={c.isActive ? 'Disable coupon' : 'Enable coupon'}
              >
                {c.isActive ? 'Disable' : 'Enable'}
              </Button>
              <Button maxWidth="max-w-md" variant="secondary" onClick={() => setArchiveTarget(c)}>
                Archive
              </Button>
            </div>
            <ActionMenu
              className="sm:hidden"
              label={`Actions for ${c.code}`}
              items={[
                { label: 'Usages', onClick: () => openUsages(c) },
                { label: 'Edit', onClick: () => openEdit(c) },
                { label: c.isActive ? 'Disable' : 'Enable', onClick: () => toggleActive(c) },
                { label: 'Archive', danger: true, onClick: () => setArchiveTarget(c) },
                { label: 'Delete permanently', danger: true, onClick: () => setPermTarget(c) },
              ]}
            />
          </>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="RVA Coupons"
        subtitle={
          data
            ? `${data.meta.totalItems.toLocaleString()} total RVA coupons`
            : 'Manage Recruitment Vendor Access discount coupons'
        }
        actions={
          <Button onClick={openCreate}>
            <span className="text-lg leading-none">+</span> New RVA Coupon
          </Button>
        }
      />

      <Card className="mb-6" padding={false}>
        <form onSubmit={handleSearch} className="grid gap-4 p-5 md:grid-cols-3">
          <Input
            label="Search"
            placeholder="Code, description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            options={STATUS_FILTERS.map((s) => ({
              value: s,
              label: s === 'ALL' ? 'All (non-archived)' : STATUS_LABELS[s],
            }))}
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
          <Pagination currentPage={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />
        </>
      ) : (
        <Card>
          <EmptyState title="No RVA coupons found" description="Try adjusting your search or filters." />
        </Card>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit RVA coupon — ${editing.code}` : 'New RVA coupon'}
        maxWidth="max-w-4xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving || savingResolve}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code"
              required
              placeholder="e.g. RVA20"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            />
            <Select
              label="Discount type"
              value={form.discountType}
              onChange={(e) =>
                setForm((f) => ({ ...f, discountType: e.target.value as 'PERCENTAGE' | 'FIXED' }))
              }
              options={COUPON_DISCOUNT_TYPES.map((t) => ({
                value: t,
                label: t === 'PERCENTAGE' ? 'Percentage (%)' : 'Fixed amount',
              }))}
            />
          </div>
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label={form.discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount amount (INR)'}
              type="number"
              min={0.01}
              step={form.discountType === 'PERCENTAGE' ? 1 : 0.01}
              required
              value={form.discountValue}
              onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
            />
            <Input
              label="Usage limit (blank = unlimited)"
              type="number"
              min={1}
              placeholder="Unlimited"
              value={form.usageLimit}
              onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
            />
            <Input
              label="Uses per user"
              type="number"
              min={1}
              required
              value={form.perUserUsageLimit}
              onChange={(e) => setForm((f) => ({ ...f, perUserUsageLimit: e.target.value }))}
            />
          </div>
          <div className="min-h-6 text-sm text-content-muted">
            {discountPreview ? (
              <span>
                Vendors will pay the RVA plan price minus <Badge variant="success">{discountPreview}</Badge>
              </span>
            ) : (
              <span>Enter a discount to preview the saving.</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start (local time)"
              type="datetime-local"
              required
              value={form.validFrom}
              onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
            />
            <Input
              label="End (local time)"
              type="datetime-local"
              required
              value={form.validUntil}
              onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
            />
          </div>

          <Select
            label="Who can use it"
            value={form.availability}
            onChange={(e) =>
              setForm((f) => ({ ...f, availability: e.target.value as 'ALL' | 'SPECIFIC' }))
            }
            options={[
              { value: 'ALL', label: 'All users' },
              { value: 'SPECIFIC', label: 'Only specific users' },
            ]}
          />
          {form.availability === 'SPECIFIC' && (
            <Textarea
              label="User emails (one per line)"
              required
              placeholder="user@example.com"
              value={form.userEmails}
              onChange={(e) => setForm((f) => ({ ...f, userEmails: e.target.value }))}
            />
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-content">Applicable RVA plans</p>
            <p className="mb-2 text-xs text-content-muted">
              Leave empty to apply to every RVA plan. Choose the RVA plans this coupon works on:
            </p>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
              {allPlans.length === 0 && (
                <p className="px-2 py-3 text-sm text-content-muted">No RVA plans defined.</p>
              )}
              {allPlans.map((p) => {
                const checked = form.planIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-content hover:bg-surface-muted"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-line-strong text-brand-600 focus:ring-brand-500"
                      checked={checked}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          planIds: checked ? f.planIds.filter((id) => id !== p.id) : [...f.planIds, p.id],
                        }))
                      }
                    />
                    {p.name}
                  </label>
                );
              })}
            </div>
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
        isOpen={usagesOpen}
        onClose={() => setUsagesOpen(false)}
        title={usagesTarget ? `RVA usages — ${usagesTarget.code}` : 'Redemptions'}
        maxWidth="max-w-4xl"
        footer={
          usages && usages.meta.totalPages > 1 ? (
            <div className="flex w-full justify-end">
              <Pagination
                currentPage={usages.meta.page}
                totalPages={usages.meta.totalPages}
                onPageChange={(next) => loadUsagesPage(next)}
              />
            </div>
          ) : undefined
        }
      >
        {usagesLoading ? (
          <Skeleton className="h-56 rounded-xl" />
        ) : usages && usages.items.length > 0 ? (
          <div className="space-y-2">
            {usages.items.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-content">
                    {u.user.name || u.user.email}
                    <span className="ml-2 text-xs font-normal text-content-faint">{u.user.email}</span>
                  </p>
                  <p className="text-xs text-content-muted">
                    {u.plan.name} · {formatDateTime(u.usedAt)}
                    {u.subscription ? ' · subscribed' : ' · not confirmed'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-content">
                    {formatMoney(u.finalAmount, u.currency)}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    −{formatMoney(u.discountAmount, u.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No redemptions yet"
            description="This RVA coupon has not been used with a non-failed payment."
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
        title="Archive RVA coupon"
        message={`Archive "${archiveTarget?.code}"? It will immediately stop validating at RVA checkout. Existing redemptions and history stay intact, and you can restore it later.`}
        confirmText="Archive"
        loading={archiving}
      />

      <ConfirmDialog
        isOpen={!!permTarget}
        onClose={() => setPermTarget(null)}
        onConfirm={confirmPermanentDelete}
        title="Delete permanently"
        message={`Delete "${permTarget?.code}" permanently? This cannot be undone and will be refused if any redemptions reference it.`}
        confirmText="Yes, delete"
        loading={permDeleting}
      />
    </div>
  );
}
