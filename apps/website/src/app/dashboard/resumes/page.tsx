'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  HiArrowDownTray,
  HiArrowRight,
  HiArrowUpTray,
  HiCheck,
  HiClock,
  HiDocumentText,
  HiExclamationCircle,
  HiLockClosed,
  HiShieldCheck,
  HiSparkles,
  HiTrash,
  HiXMark,
} from 'react-icons/hi2';
import { useAuth } from '@/lib/auth';
import { fetchMyResumes, processMyResume } from '@/lib/services';
import { Resume } from '@/lib/types';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Skeleton,
  useToast,
} from '@/components/ui';
import { formatDate } from '@/lib/format';
import { uploadFile } from '@/lib/api';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return `${bytes} bytes`;
}

function getFileExtension(filename?: string): string {
  if (!filename) return 'PDF';
  const parts = filename.split('.');
  return (parts[parts.length - 1] || 'PDF').toUpperCase();
}

export default function ResumesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [resumeConsent, setResumeConsent] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [listError, setListError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadResumes = async () => {
    setListError('');
    try {
      const data = await fetchMyResumes();
      const resumesData = Array.isArray(data) ? data : [];
      setResumes(resumesData);
    } catch (e: any) {
      setListError(e?.message || 'Failed to load resumes');
      showToast(e?.message || 'Failed to load resumes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    processSelectedFile(selected);
  };

  const processSelectedFile = (selected: File) => {
    const validation = isValidFile(selected);
    if (!validation.valid) {
      showToast(validation.message || 'Invalid file', 'error');
      setFile(null);
      return;
    }
    setFile(selected);
    showToast(`Selected: ${selected.name} (${formatFileSize(selected.size)})`, 'info');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processSelectedFile(droppedFile);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || uploading) return;

    if (!resumeConsent) {
      showToast(
        'Please read and accept the Candidate Resume & Recruitment Consulting Notice before uploading.',
        'error',
      );
      return;
    }

    const validation = isValidFile(file);
    if (!validation.valid) {
      showToast(validation.message || 'Invalid file', 'error');
      setFile(null);
      return;
    }

    setUploading(true);
    try {
      await uploadFile('/resumes', file, 'resume');
      showToast('Resume uploaded & profile details synced from your CV', 'success');
      setFile(null);
      setResumeConsent(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadResumes();
    } catch (e: any) {
      showToast(e?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  };

  const handleDownload = async (item: Resume) => {
    try {
      const token = getToken();
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || '/api') + `/resumes/${item.id}/download`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) {
        // Fallback: direct window open
        window.open((process.env.NEXT_PUBLIC_API_URL || '/api') + `/resumes/${item.id}`, '_blank');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.originalName || 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Download started', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Download failed', 'error');
    }
  };

  const doDelete = async (resumeId: string) => {
    try {
      const token = getToken();
      await fetch((process.env.NEXT_PUBLIC_API_URL || '/api') + `/resumes/${resumeId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      showToast('Resume deleted successfully', 'success');
      await loadResumes();
    } catch (e: any) {
      showToast(e?.message || 'Deletion failed', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const handleProcessResume = async (resumeId: string) => {
    setProcessingId(resumeId);
    try {
      await processMyResume(resumeId);
      showToast('AI extracted details and synced them to your profile.', 'success');
      await loadResumes();
    } catch (e: any) {
      showToast(e?.message || 'Unable to process resume right now', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  return (
    <div className="space-y-8">
      {/* ─────────────────────────────────────────────────────────────
          PAGE HEADER
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E9E5DC] pb-6 dark:border-[#1E3557]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#D6952F] dark:text-[#F0C27B]">
              Executive Credentials
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs text-[#8C9AC0]">{user?.email}</span>
          </div>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#061B36] dark:text-white">
            Resume Management
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#5B6479] dark:text-slate-400 max-w-2xl">
            Upload and manage your executive CV to enable automatic candidate matching with unadvertised
            Opportunity Vault mandates.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/dashboard/profile">
            <Button size="sm" variant="outline" className="text-xs font-semibold inline-flex items-center gap-1.5">
              <span>View Profile</span>
              <HiArrowRight className="h-3 w-3" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" className="bg-[#061B36] hover:bg-[#132B4F] text-white text-xs font-semibold">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {listError ? (
        <ErrorState message={listError} onRetry={loadResumes} />
      ) : (
        /* ─────────────────────────────────────────────────────────────
            MAIN 2-COLUMN LAYOUT: UPLOAD & ACTIVE REPOSITORY (7/5 grid)
            ───────────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN (7 cols): Upload Form & Active Resumes */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            {/* Upload Resume Card */}
            <div className="rounded-2xl border border-[#E9E5DC] bg-white p-6 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#FAF8F5] text-[#D6952F] dark:bg-[#152943]">
                    <HiArrowUpTray className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-sans text-base font-bold text-[#061B36] dark:text-white">
                      Upload New Resume
                    </h2>
                    <p className="text-xs text-[#5B6479] dark:text-slate-400">
                      Supported formats: PDF, DOC, DOCX (Max 5 MB)
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition ${
                    isDragging
                      ? 'border-[#D6952F] bg-[#FAF8F5] dark:bg-[#152943]'
                      : 'border-[#E9E5DC] hover:border-[#D6952F] hover:bg-[#FAF8F5] dark:border-[#1E3557] dark:hover:bg-[#081B33]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="hidden"
                    aria-label="Upload resume file"
                  />

                  <div className="flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-[#FAF8F5] flex items-center justify-center text-[#D6952F] mb-3 dark:bg-[#152943]">
                      <HiArrowUpTray className="h-6 w-6" />
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-white">
                      Drag &amp; drop your resume here, or{' '}
                      <span className="text-[#D6952F] underline underline-offset-2">browse file</span>
                    </p>
                    <p className="text-[11px] text-[#8C9AC0] mt-1">
                      PDF, DOC, or DOCX • Up to 5 MB
                    </p>
                  </div>
                </div>

                {/* Selected File Card */}
                {file && (
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#D6952F]/40 bg-[#FAF8F5] dark:bg-[#081B33] dark:border-[#D6952F]/40 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-white dark:bg-[#0E2340] text-[#D6952F] border border-[#E9E5DC] dark:border-[#1E3557] shrink-0">
                        <HiDocumentText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#061B36] dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-[#8C9AC0] mt-0.5">
                          {formatFileSize(file.size)} • Ready to upload
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-[#152943] transition cursor-pointer"
                      title="Remove selected file"
                    >
                      <HiXMark className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Consent Checkbox */}
                <div className="rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] p-3.5 dark:border-[#1E3557] dark:bg-[#081B33]">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resumeConsent}
                      onChange={(e) => setResumeConsent(e.target.checked)}
                      disabled={uploading}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#061B36] accent-[#061B36] shrink-0 cursor-pointer"
                    />
                    <span className="text-xs text-[#5B6479] dark:text-slate-300 leading-relaxed">
                      I have read and accept the{' '}
                      <Link
                        href="/candidate-resume-notice"
                        target="_blank"
                        className="font-semibold text-[#D6952F] hover:text-[#B87A22] underline underline-offset-2 dark:text-[#F0C27B]"
                      >
                        Candidate Resume &amp; Recruitment Notice
                      </Link>
                      , and agree to confidential matching for unadvertised executive mandates.
                    </span>
                  </label>
                </div>

                {/* Submit Action */}
                <Button
                  type="submit"
                  loading={uploading}
                  disabled={uploading || !file || !resumeConsent}
                  className="w-full bg-[#061B36] hover:bg-[#132B4F] text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition"
                >
                  {uploading ? 'Uploading Resume…' : 'Upload & Set as Active CV'}
                </Button>
              </form>
            </div>

            {/* Active Resumes Repository Card */}
            <div className="rounded-2xl border border-[#E9E5DC] bg-white p-6 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#FAF8F5] text-[#D6952F] dark:bg-[#152943]">
                    <HiDocumentText className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-sans text-base font-bold text-[#061B36] dark:text-white">
                      Your Uploaded Resumes
                    </h2>
                    <p className="text-xs text-[#5B6479] dark:text-slate-400">
                      Files currently attached to your executive profile
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FAF8F5] text-[#061B36] border border-[#E9E5DC] dark:bg-[#152943] dark:border-[#1E3557] dark:text-white">
                  {resumes.length} {resumes.length === 1 ? 'File' : 'Files'}
                </span>
              </div>

              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-20 rounded-xl" />
                </div>
              ) : resumes.length === 0 ? (
                <EmptyState
                  title="No resumes on file"
                  description="Upload your executive CV above so verified hiring managers can review your credentials."
                  icon={<HiDocumentText className="h-8 w-8 text-[#8C9AC0]" />}
                />
              ) : (
                <div className="space-y-3">
                  {resumes.map((item, idx) => {
                    const ext = getFileExtension(item.originalName);
                    const isPrimary = idx === 0;

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] p-4 transition hover:shadow-sm dark:border-[#1E3557] dark:bg-[#081B33]"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* File Extension Badge */}
                            <div
                              className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                ext === 'PDF'
                                  ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/60 dark:border-rose-900 dark:text-rose-300'
                                  : 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/60 dark:border-blue-900 dark:text-blue-300'
                              }`}
                            >
                              {ext}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-white truncate">
                                  {item.originalName}
                                </h3>
                                {isPrimary && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full dark:bg-emerald-950 dark:text-emerald-300">
                                    <HiCheck className="h-3 w-3" />
                                    Active CV
                                  </span>
                                )}
                                {(item.processing?.status === 'COMPLETED' ||
                                  item.uploadStatus === 'COMPLETED') && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#9B641B] bg-[#FFF3D9] px-2 py-0.5 rounded-full dark:bg-brand-950 dark:text-[#F0C27B]">
                                    <HiSparkles className="h-3 w-3" />
                                    AI Extracted
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex items-center gap-3 text-[11px] text-[#8C9AC0]">
                                <span>{formatFileSize(item.fileSize)}</span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1">
                                  <HiClock className="h-3 w-3" />
                                  <span>Uploaded {formatDate(item.uploadedAt)}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={processingId === item.id}
                              onClick={() => handleProcessResume(item.id)}
                              className="text-xs font-semibold inline-flex items-center gap-1.5"
                              title="Extract experience and skills into your profile"
                            >
                              <HiSparkles className="h-3.5 w-3.5 text-[#D6952F]" />
                              <span>
                                {item.processing?.status === 'COMPLETED'
                                  ? 'Re-extract AI'
                                  : 'AI Extract'}
                              </span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(item)}
                              className="text-xs font-semibold inline-flex items-center gap-1.5"
                              title="Download resume file"
                            >
                              <HiArrowDownTray className="h-3.5 w-3.5" />
                              <span>Download</span>
                            </Button>

                            <button
                              type="button"
                              onClick={() => setDeleteId(item.id)}
                              className="p-2 rounded-lg border border-[#E9E5DC] text-slate-400 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition cursor-pointer dark:border-[#1E3557] dark:hover:bg-rose-950/40"
                              title="Delete resume"
                            >
                              <HiTrash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN (5 cols): Confidentiality, Guidelines & FastForward */}
          <div className="col-span-12 lg:col-span-5 space-y-6 lg:sticky lg:top-24 self-start">
            {/* Candidate Privacy & Security Guarantee */}
            <div className="rounded-2xl border border-[#D4AF37]/50 bg-gradient-to-br from-[#070C1B] to-[#122244] p-6 text-white shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#F0C27B] bg-white/10 px-2.5 py-1 rounded-full">
                  <HiShieldCheck className="h-3.5 w-3.5 text-[#F0C27B] shrink-0" />
                  <span>100% Confidential Representation</span>
                </span>
              </div>

              <h3 className="font-serif text-lg font-bold text-white leading-snug">
                How Your Resume Is Handled
              </h3>
              <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                Gravitas Edge operates strictly as a confidential executive search platform. Your resume is
                never indexed on public search engines or broadcasted to open job boards.
              </p>

              <ul className="mt-4 space-y-2.5 text-xs text-slate-200">
                <li className="flex items-start gap-2.5">
                  <HiCheck className="h-4 w-4 text-[#F0C27B] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Direct to Verified Hiring Teams:</strong> Presented only to
                    vetted organizations with active retained mandates.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <HiCheck className="h-4 w-4 text-[#F0C27B] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Personal Contact Protection:</strong> Your personal contact details
                    remain masked until a mutual interview interest is confirmed.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <HiCheck className="h-4 w-4 text-[#F0C27B] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">One-Click Revocation:</strong> You can delete or replace your
                    stored CV at any time with immediate effect.
                  </span>
                </li>
              </ul>
            </div>

            {/* Executive CV Best Practices */}
            <div className="rounded-2xl border border-[#E9E5DC] bg-white p-6 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
              <div className="flex items-center gap-2 mb-3">
                <HiSparkles className="h-5 w-5 text-[#D6952F]" />
                <h3 className="font-sans text-sm font-bold text-[#061B36] dark:text-white uppercase tracking-wider">
                  CV Optimization Tips
                </h3>
              </div>

              <p className="text-xs text-[#5B6479] dark:text-slate-400 mb-3 leading-relaxed">
                Maximize matching accuracy with executive search consultants by following these guidelines:
              </p>

              <div className="space-y-3 text-xs text-[#5B6479] dark:text-slate-300">
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557]">
                  <p className="font-bold text-[#061B36] dark:text-white">Quantify P&amp;L &amp; Growth</p>
                  <p className="text-[11px] text-[#8C9AC0] mt-0.5">
                    Include concrete figures: revenue managed, percentage growth, team headcount, and budget ownership.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557]">
                  <p className="font-bold text-[#061B36] dark:text-white">Prefer Clean PDF Format</p>
                  <p className="text-[11px] text-[#8C9AC0] mt-0.5">
                    PDF format ensures consistent typography and avoids formatting shifts across different viewer systems.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557]">
                  <p className="font-bold text-[#061B36] dark:text-white">Keep Profile Details in Sync</p>
                  <p className="text-[11px] text-[#8C9AC0] mt-0.5">
                    Ensure your location, current title, and years of experience match the details on your profile page.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Links Card */}
            <div className="rounded-2xl border border-[#E9E5DC] bg-white p-5 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
              <h4 className="text-xs font-bold text-[#061B36] dark:text-white uppercase tracking-wider mb-2">
                Related Actions
              </h4>
              <div className="space-y-2">
                <Link
                  href="/dashboard/profile"
                  className="flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-[#061B36] hover:bg-[#FAF8F5] transition dark:text-white dark:hover:bg-[#152943]"
                >
                  <span>Edit Candidate Profile</span>
                  <HiArrowRight className="h-3.5 w-3.5 text-[#8C9AC0]" />
                </Link>
                <Link
                  href="/opportunities"
                  className="flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-[#061B36] hover:bg-[#FAF8F5] transition dark:text-white dark:hover:bg-[#152943]"
                >
                  <span>Browse Opportunity Vaults</span>
                  <HiArrowRight className="h-3.5 w-3.5 text-[#8C9AC0]" />
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-[#061B36] hover:bg-[#FAF8F5] transition dark:text-white dark:hover:bg-[#152943]"
                >
                  <span>Speak with Search Advisor</span>
                  <HiArrowRight className="h-3.5 w-3.5 text-[#8C9AC0]" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteId(null)}
          onConfirm={() => doDelete(deleteId)}
          title="Delete Resume"
          message="Are you sure you want to permanently delete this resume from your executive profile?"
          confirmText="Delete Resume"
          variant="danger"
        />
      )}
    </div>
  );
}
