'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { uploadGuestResume, uploadResume } from '@/lib/services';
import { Alert, Button, Card, Input, LoadingSpinner, useToast } from '@/components/ui';
import Eyebrow from '@/components/marketing/Eyebrow';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function isValidFile(file: File) {
  const acceptedExtensions = ['.pdf', '.doc', '.docx'];
  const hasAcceptedExtension = acceptedExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext),
  );
  if (!hasAcceptedExtension) {
    return {
      valid: false,
      message: 'Unsupported file type. Only PDF, DOC, and DOCX are allowed.',
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, message: 'File size must be less than 5 MB.' };
  }
  return { valid: true };
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' bytes';
}

function UploadIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

export default function UploadResumePage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [notice, setNotice] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const validation = isValidFile(selected);
    if (!validation.valid) {
      showToast(validation.message || 'Invalid file', 'error');
      setFile(null);
      return;
    }
    setFile(selected);
    setNotice('');
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || submitting) return;

    const validation = isValidFile(file);
    if (!validation.valid) {
      showToast(validation.message || 'Invalid file', 'error');
      setFile(null);
      return;
    }

    setSubmitting(true);
    setNotice('');
    setSuccess(false);

    try {
      if (user) {
        await uploadResume(file);
        setSuccess(true);
        showToast('Resume uploaded successfully', 'success');
      } else {
        try {
          await uploadGuestResume(file, { fullName, email, phone: phone || undefined });
          setSuccess(true);
          showToast('Resume received successfully', 'success');
        } catch {
          setNotice(
            'Resume saving for visitors is not available yet. Create a free account to save your resume and keep it linked to your profile.',
          );
        }
      }
    } catch (e: any) {
      showToast(e?.message || 'Upload failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="overflow-hidden">
      <section className="bg-[#0A1730]">
        <div className="mx-auto max-w-4xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <Eyebrow invert>RESUMES</Eyebrow>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl">
            Upload your resume.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Keep a copy of your resume with Gravitas Edge so the right opportunities can reach you.
            You can start the upload without an account.
          </p>
        </div>
      </section>

      <section className="bg-surface-muted">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <Card className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-content">Resume upload</h2>
                <p className="mt-1 text-sm text-content-muted">
                  {user
                    ? `Uploading as ${user.email}`
                    : 'No account is needed to begin. Add your details below.'}
                </p>
              </div>
              {user && (
                <Link
                  href="/dashboard/resumes"
                  className="whitespace-nowrap text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Manage resumes →
                </Link>
              )}
            </div>

            {success ? (
              <div className="mt-6">
                <Alert variant="success" title="Upload complete">
                  {user ? (
                    <p>
                      Your resume has been saved to your account. You can review or remove it from{' '}
                      <Link
                        href="/dashboard/resumes"
                        className="font-semibold underline underline-offset-2"
                      >
                        your dashboard
                      </Link>
                      .
                    </p>
                  ) : (
                    <p>Your resume has been received. Thank you.</p>
                  )}
                </Alert>
                <div className="mt-6">
                  <label
                    htmlFor="again"
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-content hover:bg-surface-muted"
                  >
                    <UploadIcon className="h-4 w-4" />
                    Upload another
                    <input
                      id="again"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>
            ) : submitting ? (
              <div className="mt-6">
                <LoadingSpinner size="md" label="Uploading resume..." />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {notice && (
                  <Alert variant="info" title="Guest upload is coming soon">
                    {notice}
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Link
                        href="/register"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
                      >
                        Create a free account
                      </Link>
                      <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium text-content transition-colors hover:bg-surface-muted"
                      >
                        Sign in instead
                      </Link>
                    </div>
                  </Alert>
                )}

                <div className="rounded-2xl border border-dashed border-line bg-surface-muted p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    disabled={submitting}
                    className="w-full cursor-pointer text-sm text-content-muted file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white file:transition-colors hover:file:bg-brand-700"
                    aria-label="Choose resume file (PDF, DOC, DOCX, max 5MB)"
                  />
                  <p className="mt-3 text-xs text-content-faint">PDF, DOC or DOCX · up to 5 MB</p>
                  {file && (
                    <p className="mt-2 text-sm font-medium text-content">
                      {file.name} · {formatFileSize(file.size)}
                    </p>
                  )}
                </div>

                {!user && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input
                      label="Full name"
                      required
                      placeholder="Jane Smith"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={submitting}
                    />
                    <Input
                      label="Email"
                      required
                      type="email"
                      placeholder="jane@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={submitting}
                    />
                    <div className="sm:col-span-2">
                      <Input
                        label="Phone (optional)"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Button type="submit" size="lg" loading={submitting}>
                    <UploadIcon className="h-4 w-4" />
                    {submitting ? 'Uploading…' : 'Submit Resume'}
                  </Button>
                </div>

                {!user && (
                  <p className="text-xs leading-relaxed text-content-faint">
                    Already have an account?{' '}
                    <Link
                      href="/login"
                      className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
                    >
                      Sign in
                    </Link>{' '}
                    to skip re-entering your details.
                  </p>
                )}
              </form>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
