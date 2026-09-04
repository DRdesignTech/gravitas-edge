'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchMyProfile, updateMyProfile } from '@/lib/services';
import {
  Button,
  Card,
  Input,
  Skeleton,
  ErrorState,
  PageHeader,
  Alert,
  useToast,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/errors';

interface FormState {
  fullName: string;
  phone: string;
  location: string;
  yearsExperience: string;
  monthsExperience: string;
  currentJobTitle: string;
  currentCompany: string;
}

const emptyForm: FormState = {
  fullName: '',
  phone: '',
  location: '',
  yearsExperience: '',
  monthsExperience: '',
  currentJobTitle: '',
  currentCompany: '',
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const load = () => {
    setLoading(true);
    setLoadError('');
    fetchMyProfile()
      .then((p) => {
        setForm({
          fullName: p.fullName || '',
          phone: p.phone || '',
          location: p.location || '',
          yearsExperience: p.yearsExperience != null ? String(p.yearsExperience) : '',
          monthsExperience: p.monthsExperience != null ? String(p.monthsExperience) : '',
          currentJobTitle: p.currentJobTitle || '',
          currentCompany: p.currentCompany || '',
        });
      })
      .catch((e) => setLoadError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (field: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (form.yearsExperience && !/^\d{1,2}$/.test(form.yearsExperience)) {
      next.yearsExperience = 'Enter a whole number (max 99).';
    }
    if (form.monthsExperience && !/^\d{1,2}$/.test(form.monthsExperience)) {
      next.monthsExperience = 'Enter a whole number (max 99).';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await updateMyProfile({
        fullName: form.fullName || undefined,
        phone: form.phone || undefined,
        location: form.location || undefined,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
        monthsExperience: form.monthsExperience ? Number(form.monthsExperience) : undefined,
        currentJobTitle: form.currentJobTitle || undefined,
        currentCompany: form.currentCompany || undefined,
      });
      showToast('Profile updated successfully', 'success');
    } catch (e) {
      showToast(getErrorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="My Profile" subtitle={user?.email} />

      {loading ? (
        <Card className="mt-6">
          <Skeleton className="h-64" />
        </Card>
      ) : loadError ? (
        <Card className="mt-6">
          <ErrorState message={loadError} onRetry={load} />
        </Card>
      ) : (
        <Card className="mt-6" title="Personal details">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Input
                label="Full name"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                placeholder="Your full name"
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+91 …"
                inputMode="tel"
              />
              <Input
                label="Location"
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
                placeholder="City, Country"
              />
              <Input
                label="Current job title"
                value={form.currentJobTitle}
                onChange={(e) => update('currentJobTitle', e.target.value)}
                placeholder="e.g. Senior Software Engineer"
              />
              <Input
                label="Current company"
                value={form.currentCompany}
                onChange={(e) => update('currentCompany', e.target.value)}
                placeholder="Company name"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Years experience"
                  value={form.yearsExperience}
                  onChange={(e) => update('yearsExperience', e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                  error={errors.yearsExperience}
                />
                <Input
                  label="Months experience"
                  value={form.monthsExperience}
                  onChange={(e) => update('monthsExperience', e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                  error={errors.monthsExperience}
                />
              </div>
            </div>

            {Object.values(errors).some(Boolean) && (
              <Alert variant="warning">Please correct the highlighted fields and try again.</Alert>
            )}

            <div className="flex justify-end">
              <Button type="submit" loading={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
