'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useGuestResume } from '@/lib/guest-resume';
import { uploadGuestResume, replaceGuestResume, uploadResume } from '@/lib/services';
import { ApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { Alert, Button, Input, useToast } from '@/components/ui';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

const ACCEPTED_LABEL = `${ALLOWED_EXTENSIONS.map((ext) => ext.replace('.', '').toUpperCase()).join(
  ', ',
)} · up to ${MAX_FILE_SIZE / (1024 * 1024)} MB`;

const BENEFITS = ['Better Relevance', 'Upcoming Opportunities', 'For recruiter', 'Always Optional'];

function isValidFile(file: File) {
  const name = file.name.toLowerCase();
  const hasExtension = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!hasExtension) return { valid: false as const, message: 'Only PDF, DOC, DOCX are allowed.' };
  if (file.size > MAX_FILE_SIZE)
    return { valid: false as const, message: 'File size must be 5 MB or less.' };
  return { valid: true as const };
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' bytes';
}

function friendlyError(e: unknown): string {
  const status = e instanceof ApiError ? e.status : undefined;
  return getErrorMessage(e, status);
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

function DocumentIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.25 3.75H6.75A1.5 1.5 0 005.25 5.25v13.5a1.5 1.5 0 001.5 1.5h10.5a1.5 1.5 0 001.5-1.5V7.5l-3.75-3.75z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3.75V7.5h3.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12.75h7.5M8.25 16.5h4.5" />
    </svg>
  );
}

function CheckBadge() {
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.2}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </span>
  );
}

function BenefitCheck() {
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[#8a6524] dark:bg-brand-950 dark:text-brand-300">
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.4}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </span>
  );
}

interface ResumeUploadCardProps {
  heading?: string;
  description?: string;
  compact?: boolean;
}

export default function ResumeUploadCard({
  heading = 'Upload Resume',
  description = 'Make your profile ready for the right opportunities.',
}: ResumeUploadCardProps) {
  const { user } = useAuth();
  const { guestToken, guestResume, setGuestResume, hydrated } = useGuestResume();
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [resumeConsent, setResumeConsent] = useState(false);

  const resetForm = () => {
    setFile(null);
    setError('');
    setSuccessMessage('');
    setReplacing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const v = isValidFile(f);
    if (!v.valid) {
      showToast(v.message, 'error');
      setFile(null);
      return;
    }
    setFile(f);
    setError('');
    setSuccessMessage('');
  };

  const validateGuestDetails = () => {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Please enter a valid email address.';
    }
    return '';
  };

  const submitGuestUpload = async (f: File, tokenOverride?: string) => {
    setSubmitting(true);
    setError('');
    try {
      if (tokenOverride) {
        const { resume } = await replaceGuestResume(tokenOverride, f);
        const updated = { ...guestResume, ...resume };
        setGuestResume(tokenOverride, updated);
        setSuccessMessage('Resume replaced successfully. Your updated resume has been saved.');
        showToast('Resume replaced', 'success');
      } else {
        const { token, resume } = await uploadGuestResume(f, {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
        });
        setGuestResume(token, resume);
        setSuccessMessage(
          'Resume uploaded successfully. Your resume has been saved. You can continue browsing Gravitas Edge.',
        );
        showToast('Resume uploaded', 'success');
      }
      setFile(null);
      setReplacing(false);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || submitting) return;

    const v = isValidFile(file);
    if (!v.valid) {
      showToast(v.message, 'error');
      setFile(null);
      return;
    }

    if (!resumeConsent) {
      setError(
        'Please read and accept the Candidate Resume & Recruitment Consulting Notice before uploading.',
      );
      return;
    }

    if (user) {
      setSubmitting(true);
      setError('');
      try {
        await uploadResume(file);
        setFile(null);
        setSuccessMessage('Resume uploaded successfully. Your resume has been saved.');
        showToast('Resume uploaded', 'success');
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const detailError = validateGuestDetails();
    if (detailError) {
      setError(detailError);
      return;
    }

    if (replacing && guestToken) {
      await submitGuestUpload(file, guestToken);
    } else {
      await submitGuestUpload(file);
    }
  };

  const canUseExisting = hydrated && Boolean(guestToken && guestResume);

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 dark:bg-surface-elevated">
      {!hydrated && (
        <div className="space-y-3">
          <div className="h-40 w-full rounded-2xl bg-surface-muted" />
          <div className="h-9 w-full rounded-lg bg-surface-muted" />
        </div>
      )}

      {hydrated && successMessage && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <CheckBadge />
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                Resume uploaded successfully.
              </p>
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                {successMessage}
              </p>
            </div>
          </div>
          {canUseExisting && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={resetForm}>
                <UploadIcon className="h-4 w-4" />
                Upload another resume
              </Button>
            </div>
          )}
        </div>
      )}

      {hydrated && !successMessage && canUseExisting && !replacing && (
        <div className="space-y-4">
          <Alert variant="success" title={user ? '' : 'Resume uploaded ✓'}>
            {!user && guestResume && (
              <div className="mt-1 space-y-1">
                <p className="text-sm font-medium text-content">
                  {guestResume.originalName} · {formatFileSize(guestResume.fileSize)}
                </p>
                <p className="text-sm text-content-muted">
                  Your resume is saved and will be available when you continue to checkout or create
                  an account — no need to upload it again.
                </p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setSuccessMessage('You’re all set — your existing resume will be used.');
                  showToast('Using your existing resume', 'success');
                }}
              >
                Use Existing Resume
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setReplacing(true);
                  setFile(null);
                }}
              >
                Replace Resume
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {hydrated && !successMessage && (!canUseExisting || replacing) && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Clean bordered upload panel */}
          <div className="rounded-2xl border border-dashed border-line bg-surface-muted/60 p-6 text-center dark:bg-surface">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-[#061B36] shadow-sm dark:bg-brand-950 dark:text-brand-300">
              <DocumentIcon className="h-7 w-7" />
            </span>
            <p className="mt-4 text-base font-bold text-content">{heading}</p>
            <p className="mt-1 text-sm leading-relaxed text-content-muted">{description}</p>
            <p className="mt-2 text-xs text-content-faint">{ACCEPTED_LABEL}</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              disabled={submitting}
              className="sr-only"
              aria-label="Choose resume file (PDF, DOC, DOCX, max 5MB)"
            />
            <Button
              type="button"
              variant="primary"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
            >
              <UploadIcon className="h-4 w-4" />
              Choose File
            </Button>

            {file && (
              <p className="mt-3 text-sm font-medium text-content">
                {file.name} · {formatFileSize(file.size)}
              </p>
            )}
          </div>

          {error && (
            <Alert variant="error" title="Upload unsuccessful">
              {error}
            </Alert>
          )}

          {!user && !replacing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Full name"
                required
                placeholder="Jane Smith"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={submitting}
              />
              <Input
                label="Email"
                required
                type="email"
                autoComplete="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Phone (optional)"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 transition-colors">
            <input
              type="checkbox"
              checked={resumeConsent}
              onChange={(e) => {
                setResumeConsent(e.target.checked);
                if (e.target.checked) setError('');
              }}
              required
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
            />
            <span className="text-sm leading-relaxed text-content-muted">
              I have read the{' '}
              <Link
                href="/candidate-resume-notice"
                className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
              >
                Candidate Resume & Recruitment Consulting Notice
              </Link>{' '}
              and understand how my resume and candidate information may be used.
            </span>
          </label>

          <Button type="submit" loading={submitting} className="w-full sm:w-auto">
            <UploadIcon className="h-4 w-4" />
            {submitting ? 'Uploading…' : replacing ? 'Replace Resume' : 'Upload Resume'}
          </Button>

          {!user && !replacing && (
            <p className="text-xs text-content-faint">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
              >
                Sign in
              </Link>{' '}
              to save directly to your profile.
            </p>
          )}
        </form>
      )}

      {/* Benefit items */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BENEFITS.map((benefit) => (
          <div
            key={benefit}
            className="flex min-w-0 items-center gap-2.5 rounded-xl border border-line bg-surface-muted/50 px-3 py-2.5 dark:bg-surface"
          >
            <BenefitCheck />
            <span className="min-w-0 break-words text-sm font-semibold leading-tight text-content">
              {benefit}
            </span>
          </div>
        ))}
      </div>

      {/* Supporting text */}
      <p className="mt-4 text-xs leading-relaxed text-content-faint">
        Your resume is used only for future opportunity matching and is never shared without your
        consent.
      </p>
    </div>
  );
}
