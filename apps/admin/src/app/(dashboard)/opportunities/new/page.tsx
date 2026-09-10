'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminCreateOpportunity, adminListVaults, adminListExperienceLevels } from '@/lib/services';
import {
  Vault,
  ExperienceLevel,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_CATEGORIES,
  EMPLOYMENT_TYPES,
} from '@/lib/types';
import {
  Alert,
  Button,
  Card,
  Input,
  PageHeader,
  Select,
  Textarea,
  useToast,
} from '@/components/ui';
import { titleCase } from '@/lib/format';
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
  salary: string;
  experienceText: string;
  externalRef: string;
  category: string;
  status: string;
  expiryDate: string;
  vaultIds: string[];
  experienceLevelIds: string[];
}

export default function NewOpportunityPage() {
  const { showToast } = useToast();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [levels, setLevels] = useState<ExperienceLevel[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>({
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
    salary: '',
    experienceText: '',
    externalRef: '',
    category: 'INDIA',
    status: 'DRAFT',
    expiryDate: '',
    vaultIds: [],
    experienceLevelIds: [],
  });

  useEffect(() => {
    adminListVaults({ page: 1, limit: 100 })
      .then((v) => setVaults(v.items.filter((x) => x.status !== 'ARCHIVED')))
      .catch(() => {});
    adminListExperienceLevels()
      .then(setLevels)
      .catch(() => {});
  }, []);

  const toggle = (field: 'vaultIds' | 'experienceLevelIds', value: string) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((x) => x !== value)
        : [...f[field], value],
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.vaultIds.length === 0) {
      setError('At least one vault must be selected.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await adminCreateOpportunity({
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
        salary: form.salary || undefined,
        experienceText: form.experienceText || undefined,
        externalRef: form.externalRef || undefined,
        category: form.category,
        status: form.status || undefined,
        expiryDate: form.expiryDate || undefined,
        vaultIds: form.vaultIds,
        experienceLevelIds: form.experienceLevelIds,
      });
      showToast('Opportunity created', 'success');
      setForm((f) => ({
        ...f,
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
        salary: '',
        experienceText: '',
        externalRef: '',
        expiryDate: '',
        vaultIds: [],
        experienceLevelIds: [],
      }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Link href="/opportunities" className="mb-4 inline-block text-sm text-brand-600">
        ← Back to opportunities
      </Link>
      <PageHeader
        title="Add Job"
        subtitle="Create a new opportunity and assign it to at least one vault."
      />

      <div className="max-w-3xl">
        <Card title="Job details">
          <form onSubmit={submit} className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            {form.vaultIds.length === 0 && vaults.length > 0 && (
              <Alert variant="warning">
                A job must belong to at least one vault to be published. Select a vault below.
              </Alert>
            )}
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
              <Input
                label="Salary"
                value={form.salary}
                onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
              />
              <Input
                label="External ref (S. No.)"
                value={form.externalRef}
                onChange={(e) => setForm((f) => ({ ...f, externalRef: e.target.value }))}
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
              <label className="mb-1 block text-sm font-medium text-content">
                Vaults <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {vaults.map((v) => (
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
              <label className="mb-1 block text-sm font-medium text-content">
                Experience levels
              </label>
              <div className="grid grid-cols-2 gap-2">
                {levels.map((el) => (
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
            <div className="flex justify-end gap-3">
              <Link href="/opportunities">
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" loading={saving}>
                Save
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
