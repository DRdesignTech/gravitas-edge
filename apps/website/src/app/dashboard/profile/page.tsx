'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  HiAcademicCap,
  HiArrowDownTray,
  HiArrowRight,
  HiArrowUpTray,
  HiBolt,
  HiBriefcase,
  HiBuildingOffice2,
  HiCamera,
  HiCheck,
  HiChevronRight,
  HiClock,
  HiDocumentText,
  HiEnvelope,
  HiGift,
  HiGlobeAlt,
  HiLockClosed,
  HiMapPin,
  HiPencilSquare,
  HiPhone,
  HiPlus,
  HiShieldCheck,
  HiSparkles,
  HiTrash,
  HiXMark,
} from 'react-icons/hi2';
import { useAuth } from '@/lib/auth';
import {
  fetchMyProfile,
  updateMyProfile,
  uploadProfileImage,
  removeProfileImage,
  fetchMyResumes,
  uploadResume,
} from '@/lib/services';
import type { Resume, UserProfile } from '@/lib/types';
import {
  Button,
  Card,
  Input,
  Skeleton,
  ErrorState,
  Alert,
  useToast,
} from '@/components/ui';
import { formatDate } from '@/lib/format';
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

interface EducationState {
  degree: string;
  university: string;
  field: string;
  year: string;
}

interface PreferencesState {
  noticePeriod: string;
  workPreference: string;
  preferredRole: string;
  preferredLocation: string;
}

type DrawerSection = 'basic-details' | 'experience' | 'skills' | 'preferences' | 'education' | null;

const emptyForm: FormState = {
  fullName: '',
  phone: '',
  location: '',
  yearsExperience: '',
  monthsExperience: '',
  currentJobTitle: '',
  currentCompany: '',
};

const DEFAULT_SKILLS = [
  'Executive Leadership',
  'Strategic Planning',
  'P&L Management',
  'Talent Acquisition',
  'Digital Transformation',
  'Cross-functional Leadership',
  'Revenue Operations',
  'Stakeholder Management',
];

const DEFAULT_EDUCATION: EducationState = {
  degree: 'Master of Business Administration (MBA)',
  university: 'Premier Business School',
  field: 'Strategic Management & Finance',
  year: '2018',
};

const DEFAULT_PREFERENCES: PreferencesState = {
  noticePeriod: '30 Days',
  workPreference: 'Hybrid (Preferred)',
  preferredRole: 'Director / VP / CXO',
  preferredLocation: 'India & GCC / UAE',
};

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return `${bytes} bytes`;
}

function getProfileImageUrl(img: string | null | undefined): string | null {
  if (!img) return null;
  if (img.startsWith('http')) return img;
  const base = process.env.NEXT_PUBLIC_API_URL || '';
  return `${base}/storage/${img}`;
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  // Profile image state
  const [profileImg, setProfileImg] = useState<string | null>(user?.profile?.profileImg ?? null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState('');

  // Resumes state
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [resumeUploading, setResumeUploading] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  // Active section for table of contents
  const [activeSection, setActiveSection] = useState('basic-details');

  // Executive Skills state
  const [skills, setSkills] = useState<string[]>(DEFAULT_SKILLS);

  // Career Preferences state
  const [preferences, setPreferences] = useState<PreferencesState>(DEFAULT_PREFERENCES);

  // Education state
  const [education, setEducation] = useState<EducationState>(DEFAULT_EDUCATION);

  // ─────────────────────────────────────────────────────────────────
  // RIGHT-SIDE DRAWER MODAL STATE FOR SECTION EDITING
  // ─────────────────────────────────────────────────────────────────
  const [activeDrawer, setActiveDrawer] = useState<DrawerSection>(null);
  const [draftForm, setDraftForm] = useState<FormState>(emptyForm);
  const [draftSkills, setDraftSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [draftPreferences, setDraftPreferences] = useState<PreferencesState>(DEFAULT_PREFERENCES);
  const [draftEducation, setDraftEducation] = useState<EducationState>(DEFAULT_EDUCATION);
  const [drawerErrors, setDrawerErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const loadProfileData = useCallback(() => {
    setLoading(true);
    setLoadError('');
    fetchMyProfile()
      .then((p) => {
        const data = p ?? ({} as UserProfile);
        const loadedForm: FormState = {
          fullName: data.fullName || '',
          phone: data.phone || '',
          location: data.location || '',
          yearsExperience: data.yearsExperience != null ? String(data.yearsExperience) : '',
          monthsExperience: data.monthsExperience != null ? String(data.monthsExperience) : '',
          currentJobTitle: data.currentJobTitle || '',
          currentCompany: data.currentCompany || '',
        };
        setForm(loadedForm);
        setProfileImg(data.profileImg ?? null);
      })
      .catch((e) => setLoadError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const loadResumesData = useCallback(() => {
    setResumeLoading(true);
    fetchMyResumes()
      .then((data) => setResumes(Array.isArray(data) ? data : []))
      .catch(() => setResumes([]))
      .finally(() => setResumeLoading(false));
  }, []);

  useEffect(() => {
    loadProfileData();
    loadResumesData();
  }, [loadProfileData, loadResumesData]);

  // Handle ESC key to close active drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeDrawer) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDrawer]);

  // Open right drawer with fresh draft copies
  const openDrawer = (section: DrawerSection) => {
    setDraftForm({ ...form });
    setDraftSkills([...skills]);
    setNewSkillInput('');
    setDraftPreferences({ ...preferences });
    setDraftEducation({ ...education });
    setDrawerErrors({});
    setActiveDrawer(section);
  };

  const closeDrawer = () => {
    setActiveDrawer(null);
    setDrawerErrors({});
  };

  const updateDraft = (field: keyof FormState, value: string) => {
    setDraftForm((f) => ({ ...f, [field]: value }));
    if (drawerErrors[field]) {
      setDrawerErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateDraft = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (activeDrawer === 'basic-details') {
      if (!draftForm.fullName.trim()) {
        errs.fullName = 'Full name is required.';
      }
    }
    if (activeDrawer === 'experience') {
      if (draftForm.yearsExperience && !/^\d{1,2}$/.test(draftForm.yearsExperience)) {
        errs.yearsExperience = 'Enter a valid number of years (0-99).';
      }
      if (draftForm.monthsExperience && !/^\d{1,2}$/.test(draftForm.monthsExperience)) {
        errs.monthsExperience = 'Enter a valid number of months (0-11).';
      }
    }
    setDrawerErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveDrawer = async () => {
    if (!validateDraft()) return;
    setSaving(true);
    try {
      if (activeDrawer === 'basic-details' || activeDrawer === 'experience') {
        const payload = {
          fullName: draftForm.fullName || undefined,
          phone: draftForm.phone || undefined,
          location: draftForm.location || undefined,
          yearsExperience: draftForm.yearsExperience ? Number(draftForm.yearsExperience) : undefined,
          monthsExperience: draftForm.monthsExperience ? Number(draftForm.monthsExperience) : undefined,
          currentJobTitle: draftForm.currentJobTitle || undefined,
          currentCompany: draftForm.currentCompany || undefined,
        };
        const updated = await updateMyProfile(payload);
        setForm({ ...draftForm });
        if (setUser && updated) {
          setUser(updated);
        }
        showToast('Profile information saved successfully', 'success');
      } else if (activeDrawer === 'skills') {
        setSkills([...draftSkills]);
        showToast('Skills updated successfully', 'success');
      } else if (activeDrawer === 'preferences') {
        setPreferences({ ...draftPreferences });
        showToast('Career preferences saved', 'success');
      } else if (activeDrawer === 'education') {
        setEducation({ ...draftEducation });
        showToast('Education details updated', 'success');
      }
      closeDrawer();
    } catch (e) {
      showToast(getErrorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDraftSkill = () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (draftSkills.includes(trimmed)) {
      showToast('Skill already in your list', 'info');
      return;
    }
    setDraftSkills([...draftSkills, trimmed]);
    setNewSkillInput('');
  };

  const handleRemoveDraftSkill = (skill: string) => {
    setDraftSkills(draftSkills.filter((s) => s !== skill));
  };

  // Profile image upload handlers
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
      if (setUser) setUser(updatedUser);
      showToast('Profile photo updated successfully', 'success');
      loadProfileData();
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
      loadProfileData();
    } catch (e) {
      setImgError(getErrorMessage(e));
    } finally {
      setImgLoading(false);
    }
  };

  // Direct resume upload handler
  const handleResumeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const hasValidExt = allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      showToast('Only PDF, DOC, and DOCX files are supported.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Resume file must be under 5 MB.', 'error');
      return;
    }

    setResumeUploading(true);
    try {
      await uploadResume(file);
      showToast('Resume uploaded and attached to profile', 'success');
      loadResumesData();
    } catch (e: any) {
      showToast(e?.message || 'Failed to upload resume', 'error');
    } finally {
      setResumeUploading(false);
      if (resumeInputRef.current) resumeInputRef.current.value = '';
    }
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Completeness score logic
  const displayName = form.fullName || user?.profile?.fullName || user?.email || 'Executive Candidate';
  const displayInitial = (displayName.trim()[0] || '?').toUpperCase();
  const latestResume = resumes[0];

  let completeness = 25; // base account
  if (form.fullName) completeness += 15;
  if (form.phone) completeness += 10;
  if (form.location) completeness += 10;
  if (form.currentJobTitle) completeness += 15;
  if (form.currentCompany) completeness += 10;
  if (form.yearsExperience) completeness += 5;
  if (latestResume) completeness += 10;

  const experienceText =
    form.yearsExperience || form.monthsExperience
      ? `${form.yearsExperience || '0'} Years ${
          form.monthsExperience ? `${form.monthsExperience} Months` : ''
        }`
      : 'Experienced Executive';

  return (
    <div className="space-y-6">
      {/* ═════════════════════════════════════════════════════════════════
          3-PANEL RESPONSIVE NAUKRI-STYLE CANDIDATE PROFILE UI
          Left Panel (3 cols) | Middle Panel (6 cols) | Right Panel (3 cols)
          ═════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─────────────────────────────────────────────────────────────
            LEFT PANEL: CANDIDATE SNAPSHOT & QUICK TOC NAVIGATOR
            ───────────────────────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-3 space-y-5 lg:sticky lg:top-24 self-start">
          {/* Candidate Profile Quick Snapshot Card */}
          <div className="rounded-2xl border border-[#E9E5DC] bg-white p-5 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                {profileImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getProfileImageUrl(profileImg) ?? undefined}
                    alt={displayName}
                    className="h-20 w-20 rounded-full border-2 border-[#D6952F] object-cover shadow-sm"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-[#061B36] to-[#13325B] text-white flex items-center justify-center font-bold text-2xl border-2 border-[#D6952F] shadow-sm">
                    {displayInitial}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => document.getElementById('profile-img-input')?.click()}
                  title="Upload profile photo"
                  className="absolute bottom-0 right-0 rounded-full bg-white p-1.5 text-[#061B36] shadow-md border border-[#E9E5DC] hover:bg-slate-50 transition cursor-pointer dark:bg-[#081B33] dark:border-[#1E3557] dark:text-white"
                >
                  <HiCamera className="h-3.5 w-3.5" />
                </button>
              </div>

              <h2 className="mt-3 font-bold text-base text-[#061B36] dark:text-white line-clamp-1">
                {displayName}
              </h2>

              <p className="text-xs font-semibold text-[#5B6479] dark:text-slate-300 mt-0.5 line-clamp-1">
                {form.currentJobTitle || 'Executive Candidate'}
              </p>

              {form.currentCompany && (
                <p className="text-[11px] text-[#8C9AC0] dark:text-slate-400 mt-0.5">
                  at {form.currentCompany}
                </p>
              )}

              <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full dark:bg-emerald-950/60 dark:text-emerald-300">
                <HiShieldCheck className="h-3.5 w-3.5" />
                <span>Verified Candidate</span>
              </div>

              {/* Direct Details List */}
              <div className="mt-4 pt-3.5 border-t border-[#F0EBE1] dark:border-[#1E3557] w-full text-left space-y-2 text-xs text-[#5B6479] dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <HiMapPin className="h-3.5 w-3.5 text-[#D6952F] shrink-0" />
                  <span className="truncate">{form.location || 'India'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <HiClock className="h-3.5 w-3.5 text-[#8C9AC0] shrink-0" />
                  <span>{experienceText}</span>
                </div>
                {form.phone && (
                  <div className="flex items-center gap-2">
                    <HiPhone className="h-3.5 w-3.5 text-[#8C9AC0] shrink-0" />
                    <span className="truncate">{form.phone}</span>
                  </div>
                )}
                {user?.email && (
                  <div className="flex items-center gap-2">
                    <HiEnvelope className="h-3.5 w-3.5 text-[#8C9AC0] shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-[#F0EBE1] dark:border-[#1E3557] w-full flex items-center justify-between text-[11px] text-[#8C9AC0]">
                <span>Updated recently</span>
                <Link
                  href="/dashboard"
                  className="font-semibold text-[#D6952F] hover:text-[#B87A22] dark:text-[#F0C27B] inline-flex items-center gap-0.5"
                >
                  <span>Dashboard</span>
                  <HiChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Section Anchor Navigator (Naukri Quick Links) */}
          <div className="rounded-2xl border border-[#E9E5DC] bg-white p-4 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
            <h3 className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#8C9AC0]">
              Quick Section Links
            </h3>
            <nav className="space-y-1">
              {[
                { id: 'basic-details', label: 'Basic Information', icon: HiPencilSquare },
                { id: 'resume-section', label: 'Resume / CV', icon: HiDocumentText },
                { id: 'experience-section', label: 'Employment Details', icon: HiBriefcase },
                { id: 'skills-section', label: 'Key Skills', icon: HiBolt },
                { id: 'preferences-section', label: 'Career Preferences', icon: HiGlobeAlt },
                { id: 'education-section', label: 'Education & Credentials', icon: HiAcademicCap },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                    activeSection === id
                      ? 'bg-[#FAF8F5] text-[#D6952F] border-l-2 border-[#D6952F] dark:bg-[#152943] dark:text-[#F0C27B]'
                      : 'text-[#5B6479] hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-[#152943]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{label}</span>
                  </span>
                  <HiChevronRight className="h-3 w-3 text-[#8C9AC0]" />
                </button>
              ))}
            </nav>
          </div>

          {/* Recruiter Visibility & Reach */}
          <div className="rounded-2xl border border-[#E9E5DC] bg-white p-5 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#061B36] dark:text-white uppercase tracking-wider">
                Recruiter Reach
              </span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-950/60 dark:text-emerald-400">
                High Activity
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center divide-x divide-[#F0EBE1] dark:divide-[#1E3557]">
              <div>
                <p className="text-lg font-bold text-[#061B36] dark:text-white">48</p>
                <p className="text-[10px] text-[#5B6479] dark:text-slate-400 mt-0.5 leading-tight">
                  Search Views
                </p>
              </div>
              <div className="pl-2">
                <p className="text-lg font-bold text-[#D6952F] dark:text-[#F0C27B]">14</p>
                <p className="text-[10px] text-[#5B6479] dark:text-slate-400 mt-0.5 leading-tight">
                  CV Downloads
                </p>
              </div>
              <div className="pl-2">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">6</p>
                <p className="text-[10px] text-[#5B6479] dark:text-slate-400 mt-0.5 leading-tight">
                  Direct Mandates
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            MIDDLE PANEL: READ-ONLY DISPLAY MODULES WITH EDIT DRAWERS
            ───────────────────────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-6 space-y-6 min-w-0">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-60 rounded-2xl" />
              <Skeleton className="h-60 rounded-2xl" />
            </div>
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={loadProfileData} />
          ) : (
            <>
              {/* Photo Preview & Confirmation Bar (if new image selected) */}
              {imgPreview && (
                <div className="rounded-2xl border-2 border-[#D6952F] bg-[#FAF8F5] p-5 shadow-sm dark:bg-[#081B33] dark:border-[#D6952F]">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgPreview}
                      alt="Preview"
                      className="h-20 w-20 rounded-full object-cover border-2 border-[#D6952F] shadow"
                    />
                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-sm font-bold text-[#061B36] dark:text-white">
                        Confirm new profile picture
                      </p>
                      <p className="text-xs text-[#5B6479] dark:text-slate-400 mt-0.5">
                        Selected: {imgFile?.name} ({formatFileSize(imgFile?.size || 0)})
                      </p>
                      {imgError && (
                        <p className="text-xs text-rose-600 mt-1 font-semibold">{imgError}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearImagePreview}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        loading={imgLoading}
                        onClick={handleImageUpload}
                        disabled={imgLoading}
                        className="bg-[#D6952F] hover:bg-[#C8842D] text-[#061B36] font-bold text-xs"
                      >
                        {imgLoading ? 'Uploading…' : 'Save Picture'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 1: RESUME / CV SECTION (Naukri Top Feature) */}
              <div
                id="resume-section"
                className="rounded-2xl border border-[#E9E5DC] bg-white p-6 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <HiDocumentText className="h-5 w-5 text-[#D6952F]" />
                      <h3 className="font-sans text-base font-bold text-[#061B36] dark:text-white">
                        Resume / Executive CV
                      </h3>
                    </div>
                    <p className="text-xs text-[#5B6479] dark:text-slate-400 mt-0.5">
                      Recruiters evaluate candidate profiles with attached resumes 5x faster.
                    </p>
                  </div>

                  <div>
                    <input
                      ref={resumeInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeFileSelect}
                      className="hidden"
                      id="resume-upload-input"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => resumeInputRef.current?.click()}
                      loading={resumeUploading}
                      disabled={resumeUploading}
                      className="bg-[#061B36] hover:bg-[#132B4F] text-white text-xs inline-flex items-center gap-1.5"
                    >
                      <HiArrowUpTray className="h-3.5 w-3.5" />
                      <span>{latestResume ? 'Update Resume' : 'Upload Resume'}</span>
                    </Button>
                  </div>
                </div>

                {resumeLoading ? (
                  <Skeleton className="h-20 rounded-xl" />
                ) : latestResume ? (
                  <div className="rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] p-4 dark:border-[#1E3557] dark:bg-[#081B33]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shrink-0">
                          <HiDocumentText className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-xs sm:text-sm text-[#061B36] dark:text-white truncate">
                              {latestResume.originalName}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full dark:bg-emerald-950 dark:text-emerald-300">
                              <HiCheck className="h-3 w-3" />
                              Active CV
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8C9AC0] mt-0.5">
                            Uploaded on {formatDate(latestResume.uploadedAt)} ·{' '}
                            {formatFileSize(latestResume.fileSize)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <Link href="/dashboard/resumes">
                          <Button size="sm" variant="outline" className="text-xs">
                            Manage All
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => resumeInputRef.current?.click()}
                    className="border-2 border-dashed border-[#E9E5DC] rounded-xl p-6 text-center cursor-pointer hover:border-[#D6952F] hover:bg-[#FAF8F5] transition dark:border-[#1E3557] dark:hover:bg-[#081B33]"
                  >
                    <HiArrowUpTray className="h-8 w-8 text-[#8C9AC0] mx-auto mb-2" />
                    <p className="text-xs font-bold text-[#061B36] dark:text-white">
                      Click to upload your resume
                    </p>
                    <p className="text-[11px] text-[#5B6479] dark:text-slate-400 mt-0.5">
                      Supported formats: PDF, DOC, DOCX (Max 5 MB)
                    </p>
                  </div>
                )}
              </div>

              {/* SECTION 2: BASIC INFORMATION (READ VIEW WITH EDIT BUTTON) */}
              <div
                id="basic-details"
                className="rounded-2xl border border-[#E9E5DC] bg-white p-6 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <HiPencilSquare className="h-5 w-5 text-[#D6952F]" />
                      <h3 className="font-sans text-base font-bold text-[#061B36] dark:text-white">
                        Basic Information
                      </h3>
                    </div>
                    <p className="text-xs text-[#5B6479] dark:text-slate-400 mt-0.5">
                      Your identity and contact details visible to verified recruiters
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openDrawer('basic-details')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E9E5DC] px-3.5 py-1.5 text-xs font-bold text-[#061B36] hover:bg-[#FAF8F5] hover:border-[#D6952F] transition cursor-pointer dark:border-[#1E3557] dark:text-white dark:hover:bg-[#152943]"
                  >
                    <HiPencilSquare className="h-3.5 w-3.5 text-[#D6952F]" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-[#FAF8F5] p-4 border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557]">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                      Full Name
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-white mt-0.5">
                      {form.fullName || 'Not specified'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                      Mobile Phone
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-white mt-0.5">
                      {form.phone || 'Not added'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                      Email Address
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-white truncate">
                        {user?.email || 'Not available'}
                      </p>
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-100/70 px-1.5 py-0.5 rounded-full dark:bg-emerald-950 dark:text-emerald-400">
                        <HiCheck className="h-2.5 w-2.5" />
                        Verified
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                      Current Location
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-white mt-0.5">
                      {form.location || 'India'}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: EMPLOYMENT & EXPERIENCE (READ VIEW WITH EDIT BUTTON) */}
              <div
                id="experience-section"
                className="rounded-2xl border border-[#E9E5DC] bg-white p-6 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <HiBriefcase className="h-5 w-5 text-[#D6952F]" />
                      <h3 className="font-sans text-base font-bold text-[#061B36] dark:text-white">
                        Employment &amp; Experience
                      </h3>
                    </div>
                    <p className="text-xs text-[#5B6479] dark:text-slate-400 mt-0.5">
                      Your current executive title, organization, and professional tenure
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openDrawer('experience')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E9E5DC] px-3.5 py-1.5 text-xs font-bold text-[#061B36] hover:bg-[#FAF8F5] hover:border-[#D6952F] transition cursor-pointer dark:border-[#1E3557] dark:text-white dark:hover:bg-[#152943]"
                  >
                    <HiPencilSquare className="h-3.5 w-3.5 text-[#D6952F]" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-[#FAF8F5] p-4 border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557]">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                      Current Job Title
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-white mt-0.5">
                      {form.currentJobTitle || 'Executive Candidate'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                      Current Organization
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-white mt-0.5">
                      {form.currentCompany || 'Not specified'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                      Total Experience
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-white mt-0.5">
                      {experienceText}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                      Notice Period
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-white mt-0.5">
                      {preferences.noticePeriod}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 4: KEY SKILLS & COMPETENCIES (READ VIEW WITH EDIT BUTTON) */}
              <div
                id="skills-section"
                className="rounded-2xl border border-[#E9E5DC] bg-white p-6 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <HiBolt className="h-5 w-5 text-[#D6952F]" />
                      <h3 className="font-sans text-base font-bold text-[#061B36] dark:text-white">
                        Key Skills &amp; Competencies
                      </h3>
                    </div>
                    <p className="text-xs text-[#5B6479] dark:text-slate-400 mt-0.5">
                      Recruiters search for these key terms when matching candidates with vault opportunities
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openDrawer('skills')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E9E5DC] px-3.5 py-1.5 text-xs font-bold text-[#061B36] hover:bg-[#FAF8F5] hover:border-[#D6952F] transition cursor-pointer dark:border-[#1E3557] dark:text-white dark:hover:bg-[#152943]"
                  >
                    <HiPencilSquare className="h-3.5 w-3.5 text-[#D6952F]" />
                    <span>Edit Skills</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full border border-[#E9E5DC] bg-[#FAF8F5] px-3.5 py-1 text-xs font-semibold text-[#061B36] dark:border-[#1E3557] dark:bg-[#081B33] dark:text-slate-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* SECTION 5: CAREER PREFERENCES (READ VIEW WITH EDIT BUTTON) */}
              <div
                id="preferences-section"
                className="rounded-2xl border border-[#E9E5DC] bg-white p-6 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <HiGlobeAlt className="h-5 w-5 text-[#D6952F]" />
                    <div>
                      <h3 className="font-sans text-base font-bold text-[#061B36] dark:text-white">
                        Career Preferences &amp; Target Roles
                      </h3>
                      <p className="text-xs text-[#5B6479] dark:text-slate-400 mt-0.5">
                        Specifies your availability and target mandate tiers for headhunters
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openDrawer('preferences')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E9E5DC] px-3.5 py-1.5 text-xs font-bold text-[#061B36] hover:bg-[#FAF8F5] hover:border-[#D6952F] transition cursor-pointer dark:border-[#1E3557] dark:text-white dark:hover:bg-[#152943]"
                  >
                    <HiPencilSquare className="h-3.5 w-3.5 text-[#D6952F]" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-[#FAF8F5] p-4 border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557]">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                      Notice Period / Availability
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-white mt-0.5">
                      {preferences.noticePeriod}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                      Preferred Work Mode
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-white mt-0.5">
                      {preferences.workPreference}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                      Target Executive Level
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-white mt-0.5">
                      {preferences.preferredRole}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C9AC0]">
                      Target Geographies
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-white mt-0.5">
                      {preferences.preferredLocation}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 6: EDUCATION & CERTIFICATIONS (READ VIEW WITH EDIT BUTTON) */}
              <div
                id="education-section"
                className="rounded-2xl border border-[#E9E5DC] bg-white p-6 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <HiAcademicCap className="h-5 w-5 text-[#D6952F]" />
                    <div>
                      <h3 className="font-sans text-base font-bold text-[#061B36] dark:text-white">
                        Education &amp; Credentials
                      </h3>
                      <p className="text-xs text-[#5B6479] dark:text-slate-400 mt-0.5">
                        Degrees, academic institutions, and senior executive certifications
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openDrawer('education')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#E9E5DC] px-3.5 py-1.5 text-xs font-bold text-[#061B36] hover:bg-[#FAF8F5] hover:border-[#D6952F] transition cursor-pointer dark:border-[#1E3557] dark:text-white dark:hover:bg-[#152943]"
                  >
                    <HiPencilSquare className="h-3.5 w-3.5 text-[#D6952F]" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] dark:border-[#1E3557] dark:bg-[#081B33]">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-[#061B36] dark:text-white">
                          {education.degree}
                        </p>
                        <p className="text-xs text-[#5B6479] dark:text-slate-400 mt-1">
                          {education.university} · {education.field}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-[#8C9AC0] bg-white dark:bg-[#0E2340] px-2 py-0.5 rounded border border-[#E9E5DC] dark:border-[#1E3557]">
                        {education.year}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Hidden Profile Image File Input */}
          <input
            id="profile-img-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT PANEL: PROFILE COMPLETENESS & FASTFORWARD SERVICES
            ───────────────────────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-3 space-y-5 lg:sticky lg:top-24 self-start">
          {/* Profile Completeness Card (Naukri.com Signature Meter) */}
          <div className="rounded-2xl border border-[#E9E5DC] bg-white p-5 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#061B36] dark:text-white">
                Profile Completeness
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {completeness}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mt-2.5 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  completeness >= 80
                    ? 'bg-emerald-500'
                    : completeness >= 50
                      ? 'bg-[#D6952F]'
                      : 'bg-rose-500'
                }`}
                style={{ width: `${completeness}%` }}
              />
            </div>

            <p className="mt-2.5 text-[11px] text-[#5B6479] dark:text-slate-400 leading-relaxed">
              {completeness < 100
                ? 'Profiles with full details & active resumes receive 3x more direct recruiter reachouts.'
                : 'Your profile is 100% complete and optimized for priority mandate matching.'}
            </p>

            {/* Checklist */}
            <div className="mt-3.5 space-y-2 border-t border-[#F0EBE1] dark:border-[#1E3557] pt-3 text-[11px]">
              <div className="flex items-center justify-between text-[#061B36] dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <HiCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Personal information</span>
                </span>
                <span className="text-emerald-600 font-bold">Done</span>
              </div>

              <div className="flex items-center justify-between text-[#061B36] dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  {latestResume ? (
                    <HiCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                  <span>Resume uploaded</span>
                </span>
                {latestResume ? (
                  <span className="text-emerald-600 font-bold">Done</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => scrollToSection('resume-section')}
                    className="text-[#D6952F] font-bold underline cursor-pointer"
                  >
                    +10%
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[#061B36] dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  {form.currentJobTitle ? (
                    <HiCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                  <span>Current designation</span>
                </span>
                {form.currentJobTitle ? (
                  <span className="text-emerald-600 font-bold">Done</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openDrawer('experience')}
                    className="text-[#D6952F] font-bold underline cursor-pointer"
                  >
                    +15%
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[#061B36] dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  {form.yearsExperience ? (
                    <HiCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                  <span>Years of experience</span>
                </span>
                {form.yearsExperience ? (
                  <span className="text-emerald-600 font-bold">Done</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openDrawer('experience')}
                    className="text-[#D6952F] font-bold underline cursor-pointer"
                  >
                    +10%
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Gravitas FastForward Advisory (Naukri FastForward Equivalent) */}
          <div className="rounded-2xl border border-[#D4AF37]/50 bg-gradient-to-br from-[#070C1B] to-[#122244] p-5 text-white shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#F0C27B] bg-white/10 px-2.5 py-1 rounded-full">
                <HiBolt className="h-3 w-3 text-[#F0C27B] shrink-0" />
                <span>FastForward Advisory</span>
              </span>
              <span className="text-[10px] text-slate-400">CXO Retained</span>
            </div>

            <h3 className="font-serif text-lg font-bold text-white leading-snug">
              Executive Career Representation
            </h3>
            <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
              Get confidential representation by senior executive search partners for director, VP
              &amp; CXO mandates in India &amp; GCC.
            </p>

            <ul className="mt-3 space-y-2 text-xs text-slate-200">
              <li className="flex items-center gap-2">
                <HiSparkles className="h-3.5 w-3.5 text-[#F0C27B] shrink-0" />
                <span>Direct hiring manager introduction</span>
              </li>
              <li className="flex items-center gap-2">
                <HiSparkles className="h-3.5 w-3.5 text-[#F0C27B] shrink-0" />
                <span>Unadvertised pre-market requisitions</span>
              </li>
              <li className="flex items-center gap-2">
                <HiSparkles className="h-3.5 w-3.5 text-[#F0C27B] shrink-0" />
                <span>1-on-1 confidential executive advisory</span>
              </li>
            </ul>

            <Link href="/contact" className="mt-4 block">
              <Button
                size="sm"
                className="w-full bg-[#D6952F] hover:bg-[#C8842D] text-[#061B36] font-bold text-xs inline-flex items-center justify-center gap-1.5"
              >
                <span>Consult Search Partner</span>
                <HiArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* Referral Partner Rewards Card */}
          <div className="rounded-2xl border border-[#E9E5DC] bg-white p-5 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#061B36] dark:text-white">
                <HiGift className="h-4 w-4 text-[#D6952F] shrink-0" />
                <span>Referral Partner</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                ₹5,000 / Ref
              </span>
            </div>

            <p className="text-[11px] text-[#5B6479] dark:text-slate-400">
              Invite senior colleagues to join Gravitas Edge and unlock direct wallet rewards.
            </p>

            <Link href="/refer-and-earn" className="mt-3 block">
              <Button size="sm" variant="outline" className="w-full text-xs font-semibold">
                View Partner Program →
              </Button>
            </Link>
          </div>

          {/* Vault Plans Quick Link */}
          <div className="rounded-2xl border border-[#E9E5DC] bg-white p-4 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340] text-center">
            <p className="text-xs font-bold text-[#061B36] dark:text-white">
              Executive Opportunity Vaults
            </p>
            <p className="text-[11px] text-[#5B6479] dark:text-slate-400 mt-1">
              Apply directly to exclusive unadvertised mandates.
            </p>
            <Link href="/plans" className="mt-2.5 block">
              <Button size="sm" variant="ghost" className="text-xs font-semibold text-[#D6952F] hover:text-[#B87A22]">
                Explore Vault Subscriptions →
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          RIGHT-SIDE SLIDE-OVER DRAWER FOR EDITING PROFILE SECTIONS
          ═════════════════════════════════════════════════════════════════ */}
      {activeDrawer !== null && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={closeDrawer}
            aria-hidden="true"
          />

          {/* Slide-Over Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-[#E9E5DC] dark:bg-[#0E2340] dark:border-[#1E3557] animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="p-5 border-b border-[#E9E5DC] dark:border-[#1E3557] flex items-center justify-between bg-white dark:bg-[#0E2340]">
                <div>
                  <h3 className="font-sans text-base sm:text-lg font-bold text-[#061B36] dark:text-white">
                    {activeDrawer === 'basic-details' && 'Edit Basic Information'}
                    {activeDrawer === 'experience' && 'Edit Employment & Experience'}
                    {activeDrawer === 'skills' && 'Manage Key Skills'}
                    {activeDrawer === 'preferences' && 'Edit Career Preferences'}
                    {activeDrawer === 'education' && 'Edit Education & Credentials'}
                  </h3>
                  <p className="text-xs text-[#5B6479] dark:text-slate-400 mt-0.5">
                    {activeDrawer === 'basic-details' && 'Update your name, contact phone, and location.'}
                    {activeDrawer === 'experience' && 'Update your current designation, company, and tenure.'}
                    {activeDrawer === 'skills' && 'Add or remove executive skill competencies.'}
                    {activeDrawer === 'preferences' && 'Specify notice period, work mode, and target roles.'}
                    {activeDrawer === 'education' && 'Update your highest degree and institution.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="p-2 rounded-xl text-slate-400 hover:text-[#061B36] hover:bg-slate-100 transition cursor-pointer dark:hover:bg-[#152943] dark:hover:text-white"
                  title="Close panel"
                >
                  <HiXMark className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body with Input Controls */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* 1. BASIC DETAILS FORM */}
                {activeDrawer === 'basic-details' && (
                  <div className="space-y-4">
                    <Input
                      label="Full Name *"
                      value={draftForm.fullName}
                      onChange={(e) => updateDraft('fullName', e.target.value)}
                      placeholder="e.g. Sudhanshu Sharma"
                      error={drawerErrors.fullName}
                      required
                    />

                    <Input
                      label="Mobile Phone Number"
                      value={draftForm.phone}
                      onChange={(e) => updateDraft('phone', e.target.value)}
                      placeholder="+91 98765 43210"
                      inputMode="tel"
                    />

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-[#061B36] dark:text-slate-300">
                        Email Address (Verified Account)
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full rounded-xl border border-[#E9E5DC] bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#5B6479] cursor-not-allowed dark:border-[#1E3557] dark:bg-[#081B33] dark:text-slate-400"
                      />
                      <p className="text-[11px] text-[#8C9AC0]">Email address cannot be changed directly.</p>
                    </div>

                    <Input
                      label="Current Location / City"
                      value={draftForm.location}
                      onChange={(e) => updateDraft('location', e.target.value)}
                      placeholder="e.g. Bengaluru, India"
                    />
                  </div>
                )}

                {/* 2. EMPLOYMENT DETAILS FORM */}
                {activeDrawer === 'experience' && (
                  <div className="space-y-4">
                    <Input
                      label="Current Job Title"
                      value={draftForm.currentJobTitle}
                      onChange={(e) => updateDraft('currentJobTitle', e.target.value)}
                      placeholder="e.g. Vice President - Technology"
                    />

                    <Input
                      label="Current Organization / Company"
                      value={draftForm.currentCompany}
                      onChange={(e) => updateDraft('currentCompany', e.target.value)}
                      placeholder="e.g. Gravitas Enterprises"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Years of Experience"
                        value={draftForm.yearsExperience}
                        onChange={(e) => updateDraft('yearsExperience', e.target.value)}
                        placeholder="e.g. 10"
                        inputMode="numeric"
                        error={drawerErrors.yearsExperience}
                      />

                      <Input
                        label="Months of Experience"
                        value={draftForm.monthsExperience}
                        onChange={(e) => updateDraft('monthsExperience', e.target.value)}
                        placeholder="e.g. 6"
                        inputMode="numeric"
                        error={drawerErrors.monthsExperience}
                      />
                    </div>
                  </div>
                )}

                {/* 3. SKILLS MANAGEMENT FORM */}
                {activeDrawer === 'skills' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#061B36] dark:text-slate-300 mb-1.5">
                        Add New Competency
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newSkillInput}
                          onChange={(e) => setNewSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddDraftSkill();
                            }
                          }}
                          placeholder="e.g. Cloud Architecture, Risk Management..."
                          className="flex-1 rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#061B36] dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white focus:outline-none focus:border-[#D6952F]"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddDraftSkill}
                          className="bg-[#061B36] text-white text-xs whitespace-nowrap"
                        >
                          Add Skill
                        </Button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-[#8C9AC0] mb-2 uppercase tracking-wider">
                        Current Skills ({draftSkills.length})
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {draftSkills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#E9E5DC] bg-[#FAF8F5] px-3 py-1 text-xs font-semibold text-[#061B36] dark:border-[#1E3557] dark:bg-[#081B33] dark:text-slate-200"
                          >
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDraftSkill(skill)}
                              className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                              title="Remove skill"
                            >
                              <HiXMark className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. CAREER PREFERENCES FORM */}
                {activeDrawer === 'preferences' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#061B36] dark:text-slate-300 mb-1.5">
                        Notice Period / Availability
                      </label>
                      <select
                        value={draftPreferences.noticePeriod}
                        onChange={(e) =>
                          setDraftPreferences({ ...draftPreferences, noticePeriod: e.target.value })
                        }
                        className="w-full rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#061B36] dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white"
                      >
                        <option value="Immediate">Immediate Joiner</option>
                        <option value="15 Days">15 Days</option>
                        <option value="30 Days">30 Days</option>
                        <option value="60 Days">60 Days</option>
                        <option value="Serving Notice">Currently Serving Notice</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#061B36] dark:text-slate-300 mb-1.5">
                        Preferred Work Mode
                      </label>
                      <select
                        value={draftPreferences.workPreference}
                        onChange={(e) =>
                          setDraftPreferences({
                            ...draftPreferences,
                            workPreference: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#061B36] dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white"
                      >
                        <option value="Hybrid (Preferred)">Hybrid (Preferred)</option>
                        <option value="In-Office / On-Site">In-Office / On-Site</option>
                        <option value="Remote Only">Remote Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#061B36] dark:text-slate-300 mb-1.5">
                        Target Executive Level
                      </label>
                      <input
                        type="text"
                        value={draftPreferences.preferredRole}
                        onChange={(e) =>
                          setDraftPreferences({
                            ...draftPreferences,
                            preferredRole: e.target.value,
                          })
                        }
                        placeholder="e.g. Director / VP / CXO"
                        className="w-full rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#061B36] dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#061B36] dark:text-slate-300 mb-1.5">
                        Target Geographies
                      </label>
                      <input
                        type="text"
                        value={draftPreferences.preferredLocation}
                        onChange={(e) =>
                          setDraftPreferences({
                            ...draftPreferences,
                            preferredLocation: e.target.value,
                          })
                        }
                        placeholder="e.g. India & GCC / UAE"
                        className="w-full rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#061B36] dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* 5. EDUCATION FORM */}
                {activeDrawer === 'education' && (
                  <div className="space-y-4">
                    <Input
                      label="Highest Degree / Qualification"
                      value={draftEducation.degree}
                      onChange={(e) =>
                        setDraftEducation({ ...draftEducation, degree: e.target.value })
                      }
                      placeholder="e.g. Master of Business Administration (MBA)"
                    />

                    <Input
                      label="University / Institution"
                      value={draftEducation.university}
                      onChange={(e) =>
                        setDraftEducation({ ...draftEducation, university: e.target.value })
                      }
                      placeholder="e.g. Premier Business School"
                    />

                    <Input
                      label="Field of Specialization"
                      value={draftEducation.field}
                      onChange={(e) =>
                        setDraftEducation({ ...draftEducation, field: e.target.value })
                      }
                      placeholder="e.g. Strategic Management & Finance"
                    />

                    <Input
                      label="Graduation Year"
                      value={draftEducation.year}
                      onChange={(e) =>
                        setDraftEducation({ ...draftEducation, year: e.target.value })
                      }
                      placeholder="e.g. 2018"
                    />
                  </div>
                )}
              </div>

              {/* Drawer Footer with Actions */}
              <div className="p-4 border-t border-[#E9E5DC] dark:border-[#1E3557] bg-[#FAF8F5] dark:bg-[#081B33] flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeDrawer}
                  disabled={saving}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  loading={saving}
                  disabled={saving}
                  onClick={handleSaveDrawer}
                  className="bg-[#D6952F] hover:bg-[#C8842D] text-[#061B36] font-bold text-xs"
                >
                  {saving ? 'Saving Changes…' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
