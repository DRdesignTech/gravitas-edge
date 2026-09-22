'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import {
  fetchMyProfile,
  updateMyProfile,
  uploadProfileImage,
  removeProfileImage,
} from '@/lib/services';
import type { UserProfile } from '@/lib/types';
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
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const [profileImg, setProfileImg] = useState<string | null>(user?.profile?.profileImg ?? null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setLoadError('');
    fetchMyProfile()
      .then((p) => {
        const data = p ?? ({} as UserProfile);
        setForm({
          fullName: data.fullName || '',
          phone: data.phone || '',
          location: data.location || '',
          yearsExperience: data.yearsExperience != null ? String(data.yearsExperience) : '',
          monthsExperience: data.monthsExperience != null ? String(data.monthsExperience) : '',
          currentJobTitle: data.currentJobTitle || '',
          currentCompany: data.currentCompany || '',
        });
        setProfileImg(data.profileImg ?? null);
      })
      .catch((e) => setLoadError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setImgError('Only JPG, PNG, and WebP images are allowed.');
      setImgFile(null);
      setImgPreview(null);
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setImgError('File too large. Maximum size is 5MB.');
      setImgFile(null);
      setImgPreview(null);
      return;
    }

    setImgError('');
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
  };

  const clearImagePreview = () => {
    setImgFile(null);
    setImgPreview(null);
    setImgError('');
    if (imgPreview) URL.revokeObjectURL(imgPreview);
  };

  const handleImageUpload = async () => {
    if (!imgFile) return;
    setImgLoading(true);
    setImgError('');
    try {
      const updatedUser = await uploadProfileImage(imgFile);
      clearImagePreview();
      if (updatedUser?.profile?.profileImg) {
        setProfileImg(updatedUser.profile.profileImg);
      }
      // Refresh user in auth context
      if (setUser) setUser(updatedUser);
      showToast('Profile picture updated', 'success');
      load(); // Reload profile
    } catch (e) {
      setImgError(getErrorMessage(e));
      clearImagePreview();
    } finally {
      setImgLoading(false);
    }
  };

  const handleImageRemove = async () => {
    setImgLoading(true);
    setImgError('');
    try {
      const updatedUser = await removeProfileImage();
      setProfileImg(null);
      if (setUser) setUser(updatedUser);
      showToast('Profile picture removed', 'success');
      load();
    } catch (e) {
      setImgError(getErrorMessage(e));
    } finally {
      setImgLoading(false);
    }
  };

  const getProfileImageUrl = (img: string | null | undefined) => {
    if (!img) return null;
    // If it's already a full URL, use it; otherwise prepend API base + /storage
    if (img.startsWith('http')) return img;
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    // Profile images are served from /api/storage/
    return `${base}/storage/${img}`;
  };

  const displayName = user?.profile?.fullName || user?.email || 'User';
  const displayInitial = displayName.trim()[0]?.toUpperCase() || '?';

  return (
    <div>
      <PageHeader title="My Profile" subtitle={user?.email} />

      {loading ? (
        <Card className="mt-6">
          <Skeleton className="h-80" />
        </Card>
      ) : loadError ? (
        <Card className="mt-6">
          <ErrorState message={loadError} onRetry={load} />
        </Card>
      ) : (
        <>
          {/* Profile Picture Section */}
          <Card className="mt-6" title="Profile Picture">
            <div className="flex flex-col items-center gap-5 py-2">
              <div className="relative">
                {profileImg ? (
                  <img
                    src={getProfileImageUrl(profileImg) ?? undefined}
                    alt="Profile"
                    className="h-24 w-24 rounded-full object-cover border-2 border-brand-200 dark:border-brand-800"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-3xl font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {displayInitial}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => document.getElementById('profile-img-input')?.click()}
                  className="absolute bottom-0 right-0 rounded-full bg-brand-600 p-2 text-white shadow-lg hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  aria-label="Change profile picture"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 3.75v13.5m9-9h.75m-.75 3h.75M3.75 15.75a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0zm6.75 0a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0zm6.75 0a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0z"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-content-muted">JPG, PNG, or WebP • Max 5MB</p>

              {imgPreview && (
                <div className="relative w-full max-w-xs">
                  <img
                    src={imgPreview}
                    alt="Preview"
                    className="h-24 w-24 rounded-full object-cover mx-auto"
                  />
                  <div className="mt-2 flex justify-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={clearImagePreview}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      loading={imgLoading}
                      onClick={handleImageUpload}
                      disabled={imgLoading}
                    >
                      {imgLoading ? 'Uploading…' : 'Save'}
                    </Button>
                  </div>
                  {imgError && (
                    <p className="mt-2 text-center text-sm text-red-600 dark:text-red-400">
                      {imgError}
                    </p>
                  )}
                </div>
              )}

              {profileImg && !imgPreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleImageRemove}
                  disabled={imgLoading}
                >
                  Remove Photo
                </Button>
              )}
            </div>
            <input
              id="profile-img-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />
          </Card>

          {/* Personal Details Section */}
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
                <Alert variant="warning">
                  Please correct the highlighted fields and try again.
                </Alert>
              )}

              <div className="flex justify-end">
                <Button type="submit" loading={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
