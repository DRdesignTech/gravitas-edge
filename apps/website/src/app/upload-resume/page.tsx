'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useGuestResume } from '@/lib/guest-resume';
import {
  replaceGuestResume,
  uploadResume,
  extractResumeContact,
  GuestResumeResult,
} from '@/lib/services';
import { ApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { Alert, Button, useToast } from '@/components/ui';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

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

function BenefitCheckIcon() {
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F5EBDC] text-[#C8842D] dark:bg-[#1E3557] dark:text-[#F0C27B]">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </span>
  );
}

function ShieldCheckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function DocumentOutlineIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5-3h7.5m-7.5-3h2.25m-6-6.75H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}

function UploadIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

const BENEFITS = [
  {
    title: 'Better Relevance',
    description: 'Make your profile ready for the right opportunities.',
  },
  {
    title: 'Upcoming Opportunities',
    description: 'Keep your resume ready for future opportunity matching.',
  },
  {
    title: 'For recruiter',
    description: 'Let your experience speak for itself.',
  },
  {
    title: 'Always Optional',
    description: 'Your resume is never shared without your consent.',
  },
];

export default function UploadResumePage() {
  const { user } = useAuth();
  const { guestToken, guestResume, setGuestResume, clearGuestResume, hydrated } = useGuestResume();
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [resumeConsent, setResumeConsent] = useState(false);
  const [guestFullName, setGuestFullName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [extractingContact, setExtractingContact] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const resetForm = () => {
    setFile(null);
    setError('');
    setSuccessMessage('');
    setReplacing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const autoFillFromResume = async (f: File) => {
    setExtractingContact(true);
    setAutoFilled(false);
    try {
      const contact = await extractResumeContact(f);
      let filled = false;
      if (contact.fullName) {
        setGuestFullName(contact.fullName);
        filled = true;
      }
      if (contact.email) {
        setGuestEmail(contact.email);
        filled = true;
      }
      if (contact.phone) {
        setGuestPhone(contact.phone);
        filled = true;
      }
      setAutoFilled(filled);
    } catch {
      // Extraction is best-effort — visitor can still type details manually.
    } finally {
      setExtractingContact(false);
    }
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
    void autoFillFromResume(f);
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
        const { token, resume } = (await uploadResume(f, {
          fullName: guestFullName.trim(),
          email: guestEmail.trim(),
          phone: guestPhone.trim() || undefined,
        })) as GuestResumeResult;
        setGuestResume(token, resume);
        setSuccessMessage(
          'Resume uploaded successfully. Your resume has been saved. You can continue browsing Gravitas Edge.',
        );
        showToast('Resume uploaded', 'success');
      }
      setFile(null);
      setReplacing(false);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : undefined;
      if (tokenOverride && (status === 404 || status === 410)) {
        clearGuestResume();
        setReplacing(false);
        setError(
          'Your earlier upload session is no longer available. Please upload your resume again — no account needed.',
        );
      } else {
        setError(friendlyError(e));
      }
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
        'Please read and accept the Candidate Resume Notice before uploading.',
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

    if (!(replacing && guestToken)) {
      if (!guestFullName.trim() || !guestEmail.trim()) {
        setError('Please enter your full name and email so we can save your resume.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
        setError('Please enter a valid email address.');
        return;
      }
    }

    if (replacing && guestToken) {
      await submitGuestUpload(file, guestToken);
    } else {
      await submitGuestUpload(file);
    }
  };

  const canUseExisting = hydrated && Boolean(guestToken && guestResume);

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#06142A] text-[#1A2236] dark:text-[#EAEFFB]">
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
        
        {/* 2-Column Main Layout Matching Screenshot 1:1 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* ═════════════════════════════════════════════════════════
              LEFT COLUMN: HERO COPY & BENEFIT BULLETS
              ═════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 space-y-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#C8842D] dark:text-[#F0C27B]">
                RESUMES
              </span>
              <h1 className="mt-3 font-sans text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-tight text-[#061B36] dark:text-white leading-[1.08]">
                Upload your<br />resume.
              </h1>
              <p className="mt-5 text-sm sm:text-base leading-relaxed text-[#5B6479] dark:text-slate-400 max-w-md">
                Keep your resume with Gravitas Edge so the right opportunities can reach you. No account is needed to start.
              </p>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#061B36] dark:text-white">
                The right opportunities. A better fit.
              </h2>
              
              <div className="mt-6 space-y-5">
                {BENEFITS.map((benefit) => (
                  <div key={benefit.title} className="flex items-start gap-3.5">
                    <BenefitCheckIcon />
                    <div>
                      <h3 className="text-sm font-bold text-[#061B36] dark:text-white leading-tight">
                        {benefit.title}
                      </h3>
                      <p className="mt-0.5 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400 leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Shield Highlight Notice */}
            <div className="rounded-2xl bg-[#EEF0EA] dark:bg-[#0E2340] p-4 flex items-center gap-3.5">
              <span className="text-[#5B6479] dark:text-[#F0C27B] shrink-0">
                <ShieldCheckIcon className="h-5 w-5" />
              </span>
              <p className="text-xs sm:text-[13px] text-[#4B5565] dark:text-slate-300 font-medium leading-relaxed">
                Your resume is used only for future opportunity matching and is never shared without your consent.
              </p>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════
              RIGHT COLUMN: ADD YOUR DETAILS & UPLOAD CARD
              ═════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6">
            <div className="rounded-[2rem] border border-[#EAE6DE]/80 bg-white p-7 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:border-[#1E3557] dark:bg-[#0E2340]">
              
              <div className="mb-6">
                <h2 className="text-2xl sm:text-[28px] font-bold text-[#061B36] dark:text-white tracking-tight">
                  Add your details
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400">
                  {user ? `Uploading as ${user.email}` : 'No account is needed to begin.'}
                </p>
              </div>

              {!hydrated && (
                <div className="space-y-4 animate-pulse">
                  <div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
                  <div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
                  <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                </div>
              )}

              {hydrated && successMessage && (
                <div className="space-y-5 py-4">
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                      ✓
                    </span>
                    <div>
                      <p className="font-bold text-emerald-800 dark:text-emerald-200">
                        Resume uploaded successfully!
                      </p>
                      <p className="mt-1 text-xs sm:text-sm text-emerald-700 dark:text-emerald-300">
                        {successMessage}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" size="sm" variant="outline" onClick={resetForm}>
                      <UploadIcon className="h-3.5 w-3.5 mr-1" />
                      Upload another resume
                    </Button>
                    <Link href="/opportunities">
                      <Button size="sm">Browse Opportunities →</Button>
                    </Link>
                  </div>
                </div>
              )}

              {hydrated && !successMessage && canUseExisting && !replacing && (
                <div className="space-y-4 py-2">
                  <Alert variant="success" title={user ? '' : 'Existing resume found ✓'}>
                    {!user && guestResume && (
                      <div className="mt-1 space-y-1">
                        <p className="text-sm font-semibold text-[#061B36] dark:text-white">
                          {guestResume.originalName} · {formatFileSize(guestResume.fileSize)}
                        </p>
                        <p className="text-xs text-[#5B6479] dark:text-slate-400">
                          Your resume is saved and ready for matching. You can keep this resume or upload a new one.
                        </p>
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setSuccessMessage('You’re all set — your existing resume is saved.');
                          showToast('Using existing resume', 'success');
                        }}
                      >
                        Keep Existing Resume
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
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Guest User Contact Inputs */}
                  {!user && !(replacing && guestToken) && (
                    <div className="space-y-4">
                      {(extractingContact || autoFilled) && (
                        <p className="text-xs text-[#D6952F] font-medium">
                          {extractingContact
                            ? 'Reading your resume to fill details…'
                            : 'Details auto-filled from your resume. You can edit them if needed.'}
                        </p>
                      )}

                      {/* Name & Email 2-Column Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label
                            htmlFor="fullName"
                            className="block text-xs font-semibold text-[#334155] dark:text-slate-300 mb-1.5"
                          >
                            Full name *
                          </label>
                          <input
                            id="fullName"
                            type="text"
                            autoComplete="name"
                            value={guestFullName}
                            onChange={(e) => setGuestFullName(e.target.value)}
                            placeholder="Jane Doe"
                            required
                            disabled={submitting}
                            className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#061B36] placeholder-[#94A3B8] focus:border-[#061B36] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="email"
                            className="block text-xs font-semibold text-[#334155] dark:text-slate-300 mb-1.5"
                          >
                            Email *
                          </label>
                          <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            disabled={submitting}
                            className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#061B36] placeholder-[#94A3B8] focus:border-[#061B36] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Phone Full Width Row */}
                      <div>
                        <label
                          htmlFor="phone"
                          className="block text-xs font-semibold text-[#334155] dark:text-slate-300 mb-1.5"
                        >
                          Phone (optional)
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          autoComplete="tel"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          disabled={submitting}
                          className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#061B36] placeholder-[#94A3B8] focus:border-[#061B36] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Upload Resume Box (Matching Dashed Screenshot Style) */}
                  <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#FAF9F6] p-6 sm:p-7 text-center dark:border-[#1E3557] dark:bg-[#081B33]/60">
                    <span className="mx-auto flex h-10 w-10 items-center justify-center text-[#5B6479] dark:text-slate-400">
                      <DocumentOutlineIcon className="h-8 w-8" />
                    </span>
                    <p className="mt-2 text-sm sm:text-base font-bold text-[#061B36] dark:text-white">
                      Upload Resume
                    </p>
                    <p className="mt-0.5 text-xs text-[#8C9AC0]">
                      PDF, DOC, DOCX - up to 5 MB
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      disabled={submitting}
                      className="sr-only"
                      id="resume-file-input"
                      aria-label="Choose resume file (PDF, DOC, DOCX, max 5MB)"
                    />

                    <div className="mt-3.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-4 py-1.5 text-xs font-semibold text-[#061B36] shadow-2xs hover:bg-slate-50 dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-white transition-colors cursor-pointer"
                      >
                        <UploadIcon className="h-3.5 w-3.5" />
                        Choose File
                      </button>
                    </div>

                    {file && (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-[#0E2340] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                        <span>✓ {file.name}</span>
                        <span className="text-[#8C9AC0]">({formatFileSize(file.size)})</span>
                      </div>
                    )}
                  </div>

                  {error && (
                    <Alert variant="error" title="Upload notice">
                      {error}
                    </Alert>
                  )}

                  {/* Consent Checkbox */}
                  <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={resumeConsent}
                      onChange={(e) => {
                        setResumeConsent(e.target.checked);
                        if (e.target.checked) setError('');
                      }}
                      required
                      className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#061B36] cursor-pointer"
                    />
                    <span className="text-xs text-[#5B6479] dark:text-slate-400 leading-relaxed">
                      I agree to the{' '}
                      <Link
                        href="/candidate-resume-notice"
                        className="font-medium text-[#061B36] dark:text-white underline underline-offset-2 hover:text-[#D6952F]"
                      >
                        Candidate Resume Notice
                      </Link>{' '}
                      and understand how my resume and candidate information may be used.
                    </span>
                  </label>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#061B36] py-3.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-[#10243E] dark:bg-[#1D3B66] dark:hover:bg-[#254A7F] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <UploadIcon className="h-4 w-4" />
                    {submitting ? 'Uploading…' : replacing ? 'Replace Resume' : 'Upload Resume'}
                  </button>

                  {/* Already have an account */}
                  {!user && !replacing && (
                    <p className="text-center text-xs text-[#5B6479] dark:text-slate-400 pt-2">
                      Already have an account?{' '}
                      <Link
                        href="/login"
                        className="font-semibold text-[#061B36] dark:text-white underline underline-offset-2 hover:text-[#D6952F]"
                      >
                        Sign in
                      </Link>{' '}
                      to save directly to your profile.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
