'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  HiAcademicCap,
  HiArrowDownTray,
  HiArrowRight,
  HiBolt,
  HiBriefcase,
  HiBuildingOffice2,
  HiCamera,
  HiCheck,
  HiChevronRight,
  HiClock,
  HiDocumentText,
  HiGift,
  HiGlobeAlt,
  HiLockClosed,
  HiMagnifyingGlass,
  HiMapPin,
  HiSparkles,
} from 'react-icons/hi2';
import { useAuth } from '@/lib/auth';
import RvaSubscriptionCard from './RvaSubscriptionCard';
import {
  fetchMyActiveSubscriptions,
  fetchMyProfile,
  fetchMyResumes,
  fetchOpportunities,
  fetchReferralSummary,
  fetchRvaAccess,
  fetchVaults,
} from '@/lib/services';
import {
  Opportunity,
  PaginatedResult,
  ReferralSummary,
  Resume,
  RvaAccessInfo,
  RvaSubscriptionSummary,
  Subscription,
  UserProfile,
  Vault,
} from '@/lib/types';
import { Badge, Button, EmptyState, ErrorState, Skeleton, StatusBadge } from '@/components/ui';
import { VaultIcon, BriefcaseIcon } from '@/components/cards';
import {
  formatDate,
  formatMoney,
  titleCase,
  displayExperience,
  hasExperience,
  isMeaningful,
} from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { LockNotice } from '@/components/LockNotice';
import {
  canRevealCompanyExperience,
  companyExperienceLockMessage,
  isCompanyWithheld,
  isExperienceWithheld,
} from '@/lib/opportunity-access';

const RECENT_LIMIT = 6;

function profileImageUrl(img?: string | null): string {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  const base = process.env.NEXT_PUBLIC_API_URL || '';
  return `${base}/storage/${img}`;
}

function daysRemaining(endDate?: string | null): number {
  if (!endDate) return 0;
  const end = new Date(endDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / 86400000));
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return `${bytes} bytes`;
}

function formatJobId(id: string): string {
  if (!id) return '#OPP-0000';
  const clean = id
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-4)
    .toUpperCase();
  return `#OPP-${clean || '0000'}`;
}

function extractEmail(contact?: string | null, url?: string | null): string | null {
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
  if (contact) {
    const m = contact.match(emailRegex);
    if (m && m[0]) return m[0];
  }
  if (url && url.startsWith('mailto:')) {
    const m = url
      .replace(/^mailto:/i, '')
      .split('?')[0]
      .trim();
    if (m) return m;
  }
  return null;
}

function buildApplyMailto(
  email: string,
  opportunity: { title: string; company?: string | null },
): string {
  const subject = encodeURIComponent(`Application: ${opportunity.title}`);
  const body = encodeURIComponent(
    `Dear Hiring Team,\n\nI am writing to express my strong interest in the ${opportunity.title} opportunity${
      opportunity.company ? ` at ${opportunity.company}` : ''
    }.\n\nPlease find my resume and profile details attached.\n\nBest regards,`,
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export default function Dashboard() {
  const { user, hasVaultAccess } = useAuth();

  // Profile
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Subscriptions & Vaults
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [rvaAccess, setRvaAccess] = useState<RvaAccessInfo | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState('');

  // Opportunities
  const [recent, setRecent] = useState<PaginatedResult<Opportunity> | null>(null);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState('');

  // Resumes
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [resumeError, setResumeError] = useState('');

  // Referral
  const [referral, setReferral] = useState<ReferralSummary | null>(null);
  const [referralLoading, setReferralLoading] = useState(true);
  const [referralError, setReferralError] = useState('');

  // Search filter inside dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [copiedCode, setCopiedCode] = useState(false);

  const loadProfile = useCallback(() => {
    fetchMyProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  const loadAccess = useCallback(() => {
    setAccessLoading(true);
    setAccessError('');
    Promise.all([fetchMyActiveSubscriptions(), fetchVaults(), fetchRvaAccess()])
      .then(([s, v, rva]) => {
        setSubs(s || []);
        setVaults(v || []);
        setRvaAccess(rva ?? null);
      })
      .catch((e) => setAccessError(getErrorMessage(e)))
      .finally(() => setAccessLoading(false));
  }, []);

  const loadRecent = useCallback(() => {
    setRecentLoading(true);
    setRecentError('');
    fetchOpportunities({ sortBy: 'createdAt', sortOrder: 'desc', limit: RECENT_LIMIT })
      .then(setRecent)
      .catch((e) => setRecentError(getErrorMessage(e)))
      .finally(() => setRecentLoading(false));
  }, []);

  const loadResumes = useCallback(() => {
    setResumeLoading(true);
    setResumeError('');
    fetchMyResumes()
      .then((data) => setResumes(Array.isArray(data) ? data : []))
      .catch((e) => setResumeError(getErrorMessage(e)))
      .finally(() => setResumeLoading(false));
  }, []);

  const loadReferral = useCallback(() => {
    setReferralLoading(true);
    setReferralError('');
    fetchReferralSummary()
      .then(setReferral)
      .catch((e) => setReferralError(getErrorMessage(e)))
      .finally(() => setReferralLoading(false));
  }, []);

  useEffect(() => {
    loadProfile();
    loadAccess();
    loadRecent();
    loadResumes();
    loadReferral();
  }, [loadProfile, loadAccess, loadRecent, loadResumes, loadReferral]);

  const fullName = profile?.fullName || user?.profile?.fullName;
  const roleLine =
    profile?.currentJobTitle || user?.profile?.currentJobTitle || 'Executive Candidate';
  const company = profile?.currentCompany || user?.profile?.currentCompany;
  const location = profile?.location || user?.profile?.location || 'India';
  const profileImg = profile?.profileImg || user?.profile?.profileImg;
  const displayName = fullName || user?.email || 'Candidate';
  const initials = (displayName.trim()[0] || '?').toUpperCase();

  const unlockedVaults = vaults.filter((v) => !v.locked);
  const lockedVaults = vaults.filter((v) => v.locked);
  const hasVaultSubs = subs.length > 0;
  const rvaSub: RvaSubscriptionSummary | null = rvaAccess?.subscription ?? null;
  const hasRvaSub = rvaAccess?.hasAccess === true && rvaSub !== null;
  const activePlanCount = subs.length + (hasRvaSub ? 1 : 0);
  const hasAccess = activePlanCount > 0;
  const latestResume = resumes[0];

  // Dynamic Profile Completeness calculation (Naukri style)
  let completeness = 35; // base account
  if (fullName) completeness += 20;
  if (roleLine && roleLine !== 'Executive Candidate') completeness += 15;
  if (location) completeness += 10;
  if (latestResume) completeness += 20;

  const handleCopyCode = () => {
    if (!referral?.referralCode) return;
    navigator.clipboard.writeText(referral.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filtered opportunities based on quick search chip
  const displayedOpportunities = (recent?.items || []).filter((o) => {
    const matchesCountry =
      selectedCountry === 'All' ||
      (selectedCountry === 'India' && o.country === 'India') ||
      (selectedCountry === 'UAE' &&
        (o.country === 'United Arab Emirates' || o.country === 'UAE')) ||
      (selectedCountry === 'Global' && o.country !== 'India' && o.country !== 'UAE');
    const matchesQuery =
      !searchQuery ||
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.industry && o.industry.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.company && o.company.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCountry && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* ═════════════════════════════════════════════════════════════════
          3-PANEL RESPONSIVE NAUKRI-STYLE CANDIDATE DASHBOARD
          Left Panel (3 cols) | Middle Panel (6 cols) | Right Panel (3 cols)
          ═════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─────────────────────────────────────────────────────────────
            LEFT PANEL: CANDIDATE PROFILE, COMPLETION & RESUME
            ───────────────────────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-3 space-y-5 lg:sticky lg:top-24 self-start">
          {/* Candidate Profile Snapshot Card */}
          <div className="rounded-2xl border border-[#E9E5DC] bg-white p-5 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                {profileImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileImageUrl(profileImg)}
                    alt={displayName}
                    className="h-20 w-20 rounded-full border-2 border-[#D6952F] object-cover shadow-sm"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-[#061B36] to-[#13325B] text-white flex items-center justify-center font-bold text-2xl border-2 border-[#D6952F] shadow-sm">
                    {initials}
                  </div>
                )}
                <Link
                  href="/dashboard/profile"
                  title="Edit profile photo"
                  className="absolute bottom-0 right-0 rounded-full bg-white p-1 text-[#061B36] shadow border border-[#E9E5DC] hover:bg-slate-50 dark:bg-[#081B33] dark:border-[#1E3557] dark:text-white"
                >
                  <HiCamera className="h-3.5 w-3.5" />
                </Link>
              </div>

              <h2 className="mt-3 font-bold text-base text-[#061B36] dark:text-white line-clamp-1">
                {displayName}
              </h2>
              <p className="text-xs font-medium text-[#5B6479] dark:text-slate-400 mt-0.5 line-clamp-1">
                {roleLine}
              </p>
              {company && (
                <p className="text-[11px] text-[#8C9AC0] dark:text-slate-400 mt-0.5">
                  at {company}
                </p>
              )}
              <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#5B6479] dark:text-slate-400">
                <HiMapPin className="h-3.5 w-3.5 text-[#D6952F] shrink-0" />
                <span>{location}</span>
              </div>

              <div className="mt-3 pt-3 border-t border-[#F0EBE1] dark:border-[#1E3557] w-full flex items-center justify-end text-xs">
                <Link
                  href="/dashboard/profile"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#D6952F] hover:text-[#B87A22] dark:text-[#F0C27B] underline underline-offset-2"
                >
                  <span>Edit Profile</span>
                  <HiArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Profile Completeness Card (Naukri.com Signature Progress Meter) */}
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
                ? 'Add your target salary, skills & resume to reach 100% and increase recruiter direct reachouts by 3x.'
                : 'Your profile is fully verified and active for priority opportunity matching.'}
            </p>

            {completeness < 100 && (
              <Link href="/dashboard/profile" className="mt-3 block">
                <Button size="sm" variant="outline" className="w-full text-xs font-semibold">
                  Add Missing Details (+{100 - completeness}%)
                </Button>
              </Link>
            )}
          </div>

          {/* Candidate Resume Quick Card */}
          <div className="rounded-2xl border border-[#E9E5DC] bg-white p-5 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HiDocumentText className="h-4 w-4 text-[#D6952F]" />
                <span className="text-xs font-bold text-[#061B36] dark:text-white">My Resume</span>
              </div>
              {latestResume && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-950/60 dark:text-emerald-300">
                  <HiCheck className="h-3 w-3" />
                  <span>Active</span>
                </span>
              )}
            </div>

            {resumeLoading ? (
              <Skeleton className="h-16" />
            ) : resumeError ? (
              <ErrorState message={resumeError} onRetry={loadResumes} />
            ) : latestResume ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-[#FAF8F5] p-3 border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557]">
                  <p className="text-xs font-bold text-[#061B36] dark:text-white truncate">
                    {latestResume.originalName}
                  </p>
                  <p className="text-[10px] text-[#8C9AC0] mt-0.5">
                    {formatFileSize(latestResume.fileSize)} · uploaded{' '}
                    {formatDate(latestResume.uploadedAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link href="/dashboard/resumes" className="flex-1">
                    <Button size="sm" variant="outline" className="w-full text-xs font-semibold">
                      Manage Resume
                    </Button>
                  </Link>
                  <Link
                    href="/dashboard/resumes"
                    className="inline-flex items-center justify-center p-2 rounded-lg border border-[#E9E5DC] hover:bg-slate-50 dark:border-[#1E3557] dark:hover:bg-[#152943]"
                    title="View and update resume"
                  >
                    <HiArrowDownTray className="h-4 w-4 text-[#061B36] dark:text-white" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs text-[#5B6479] dark:text-slate-400">
                  No resume on file. Upload now to enable auto-matching.
                </p>
                <Link href="/dashboard/resumes" className="mt-3 block">
                  <Button size="sm" className="w-full text-xs">
                    Upload Resume
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Quick Shortlinks */}
          <div className="rounded-2xl border border-[#E9E5DC] bg-white p-4 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340] space-y-1">
            <Link
              href="/opportunities"
              className="flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-[#061B36] hover:bg-[#FAF8F5] dark:text-white dark:hover:bg-[#152943] transition"
            >
              <span>Explore All Opportunities</span>
              <HiChevronRight className="h-4 w-4 text-[#8C9AC0]" />
            </Link>
            <Link
              href="/dashboard/subscriptions"
              className="flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-[#061B36] hover:bg-[#FAF8F5] dark:text-white dark:hover:bg-[#152943] transition"
            >
              <span>Manage Subscriptions</span>
              <HiChevronRight className="h-4 w-4 text-[#8C9AC0]" />
            </Link>
            <Link
              href="/dashboard/referrals"
              className="flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-[#061B36] hover:bg-[#FAF8F5] dark:text-white dark:hover:bg-[#152943] transition"
            >
              <span>Referral Earnings &amp; Wallet</span>
              <HiChevronRight className="h-4 w-4 text-[#8C9AC0]" />
            </Link>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            MIDDLE PANEL: VAULT STATUS, QUICK FILTERS & JOB FEED
            ───────────────────────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-6 space-y-5 min-w-0">
          {/* Opportunity Vault Access & Entitlement Banner */}
          <div className="rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-r from-[#061B36] via-[#092347] to-[#061B36] p-5 text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-[#D4AF37]/10 blur-xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#F0C27B]">
                    {hasAccess ? 'Active Vault Subscriber' : 'Opportunity Vault Access'}
                  </span>
                </div>

                <h3 className="mt-1 font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {hasAccess
                    ? subs[0]?.plan?.name || 'Executive Opportunity Vault'
                    : 'Unlock Direct Recruiter Contacts'}
                </h3>

                <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-md">
                  {hasAccess
                    ? `Your subscription gives you unmasked direct phone numbers and emails for verified hiring managers.`
                    : 'Subscribe to an Opportunity Vault matching your experience to apply directly without third-party filters.'}
                </p>
              </div>

              <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-2">
                {hasAccess ? (
                  <Link href="/opportunities">
                    <Button
                      size="sm"
                      className="bg-[#D6952F] hover:bg-[#C8842D] text-[#061B36] font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <span>Open Vault Jobs</span>
                      <HiArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/plans">
                    <Button
                      size="sm"
                      className="bg-[#D6952F] hover:bg-[#C8842D] text-[#061B36] font-bold text-xs whitespace-nowrap inline-flex items-center gap-1.5"
                    >
                      <span>View Vault Plans</span>
                      <HiArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Unlocked Vault Badges */}
            {hasVaultSubs && unlockedVaults.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-[#F0C27B] font-semibold">Unlocked:</span>
                {unlockedVaults.map((v) => (
                  <span
                    key={v.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white"
                  >
                    <HiCheck className="h-3 w-3 text-[#F0C27B]" />
                    <span>{v.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick Search & Location Filter Chips */}
          <div className="rounded-2xl border border-[#E9E5DC] bg-white p-4 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <HiMagnifyingGlass className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs by title, function, or keyword..."
                className="w-full rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-[#061B36] placeholder-[#8C9AC0] focus:border-[#D6952F] focus:outline-none dark:border-[#1E3557] dark:bg-[#081B33] dark:text-white"
              />
            </div>

            {/* Filter Pills */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-[#8C9AC0]">Location:</span>
              {[
                { id: 'All', label: 'All Roles', icon: null },
                { id: 'India', label: 'India', icon: HiMapPin },
                { id: 'UAE', label: 'UAE / GCC', icon: HiMapPin },
                { id: 'Global', label: 'Global', icon: HiGlobeAlt },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedCountry(id)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                    selectedCountry === id
                      ? 'bg-[#061B36] text-white dark:bg-[#D6952F] dark:text-[#061B36]'
                      : 'bg-[#FAF8F5] text-[#5B6479] hover:bg-slate-100 border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557] dark:text-slate-300'
                  }`}
                >
                  {Icon && <Icon className="h-3 w-3 shrink-0" />}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recommended Opportunities Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="font-sans text-base sm:text-lg font-bold text-[#061B36] dark:text-white">
                  Recommended Opportunities
                </h3>
                <p className="text-xs text-[#5B6479] dark:text-slate-400">
                  Pre-market mandates matching your professional profile
                </p>
              </div>
              <Link
                href="/opportunities"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#D6952F] hover:text-[#B87A22] dark:text-[#F0C27B] underline underline-offset-2"
              >
                <span>View all</span>
                <HiArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
              </div>
            ) : recentError ? (
              <ErrorState message={recentError} onRetry={loadRecent} />
            ) : displayedOpportunities.length === 0 ? (
              <EmptyState
                icon={<BriefcaseIcon className="h-6 w-6" />}
                title="No opportunities match your filter"
                description="Try clearing search query or selecting a different country filter."
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCountry('All');
                    }}
                  >
                    Reset Filters
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {displayedOpportunities.map((o) => {
                  const canReveal = canRevealCompanyExperience(o, hasVaultAccess);
                  const isFull = o.isFullAccess;
                  const email = extractEmail(o.applicationContact, o.applicationUrl);

                  return (
                    <article
                      key={o.id}
                      className={`group rounded-2xl border border-[#E9E5DC] border-l-4 ${
                        isFull
                          ? 'border-l-[#22C55E] dark:border-l-[#22C55E]'
                          : 'border-l-[#D6952F] dark:border-l-[#F0C27B]'
                      } bg-white p-5 shadow-sm transition hover:shadow-md dark:border-[#1E3557] dark:bg-[#0E2340]`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/dashboard/opportunities/${o.id}`}
                          className="min-w-0 flex-1 block no-underline"
                        >
                          {/* Top Row: Location */}
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF8F5] px-2.5 py-0.5 text-[10px] font-semibold text-[#061B36] border border-[#E9E5DC] dark:bg-[#152943] dark:border-[#1E3557] dark:text-slate-200">
                              {o.country?.toLowerCase() === 'global' ? (
                                <HiGlobeAlt className="h-3 w-3 text-[#D6952F] shrink-0" />
                              ) : (
                                <HiMapPin className="h-3 w-3 text-[#D6952F] shrink-0" />
                              )}
                              <span>{o.country || 'Global'}</span>
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="mt-2 font-sans text-sm sm:text-base font-bold text-[#061B36] group-hover:text-[#D6952F] dark:text-white dark:group-hover:text-[#F0C27B] transition line-clamp-1">
                            {o.title}
                          </h4>

                          {/* Metadata with Vector Icons */}
                          <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-[#5B6479] dark:text-slate-400">
                            {o.industry && (
                              <span className="inline-flex items-center gap-1.5">
                                <HiBriefcase className="h-3.5 w-3.5 text-[#8C9AC0] shrink-0" />
                                <span>{o.industry}</span>
                              </span>
                            )}
                            {hasExperience(o.experienceText, o.minExperience, o.maxExperience) && (
                              <span className="inline-flex items-center gap-1.5">
                                <HiClock className="h-3.5 w-3.5 text-[#8C9AC0] shrink-0" />
                                <span>
                                  {displayExperience(
                                    o.experienceText,
                                    o.minExperience,
                                    o.maxExperience,
                                  )}
                                </span>
                              </span>
                            )}
                            {o.employmentType && (
                              <span className="inline-flex items-center gap-1.5">
                                <HiBuildingOffice2 className="h-3.5 w-3.5 text-[#8C9AC0] shrink-0" />
                                <span>{titleCase(o.employmentType)}</span>
                              </span>
                            )}
                            {isMeaningful(o.salary) && (
                              <span className="font-bold text-[#061B36] dark:text-emerald-400">
                                {o.salary}
                              </span>
                            )}
                          </div>
                        </Link>

                        {/* Action CTA */}
                        <div className="shrink-0 pt-1">
                          {isFull ? (
                            email ? (
                              <a
                                href={buildApplyMailto(email, {
                                  title: o.title,
                                  company: canReveal ? o.company : undefined,
                                })}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#22C55E] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 transition shadow-sm"
                              >
                                <span>Apply</span>
                                <HiArrowRight className="h-3 w-3" />
                              </a>
                            ) : (
                              <Link href={`/dashboard/opportunities/${o.id}`}>
                                <Button size="sm" variant="outline" className="text-xs">
                                  View Details
                                </Button>
                              </Link>
                            )
                          ) : (
                            <Link
                              href="/plans"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F0C27B] px-3.5 py-1.5 text-xs font-bold text-[#061B36] hover:bg-[#D6952F] transition shadow-sm"
                            >
                              <HiLockClosed className="h-3.5 w-3.5 shrink-0" />
                              <span>Unlock</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT PANEL: FASTFORWARD ADVISORY, COURSERA & REFERRAL REWARDS
            ───────────────────────────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-3 space-y-5 lg:sticky lg:top-24 self-start">
          {/* Gravitas FastForward / Executive Advisory (Naukri FastForward Equivalent) */}
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
                <span>Speak with Search Partner</span>
                <HiArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* Executive Learning Recommendations (Coursera / LMS Integration from Proposal) */}
          <div className="rounded-2xl border border-[#E9E5DC] bg-white p-5 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HiAcademicCap className="h-4 w-4 text-[#D6952F] shrink-0" />
                <h4 className="text-xs font-bold text-[#061B36] dark:text-white uppercase tracking-wider">
                  Recommended Upskilling
                </h4>
              </div>
            </div>

            <p className="text-[11px] text-[#5B6479] dark:text-slate-400 mb-3">
              Executive credentials to strengthen profile match for upcoming vault mandates.
            </p>

            <div className="space-y-2.5">
              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557]">
                <p className="text-xs font-bold text-[#061B36] dark:text-white">
                  Strategic Leadership &amp; Mandates
                </p>
                <p className="text-[10px] text-[#8C9AC0] mt-0.5">
                  Yale / Coursera · Executive Track
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557]">
                <p className="text-xs font-bold text-[#061B36] dark:text-white">
                  Executive Financial Management
                </p>
                <p className="text-[10px] text-[#8C9AC0] mt-0.5">Wharton / Coursera · 6 Weeks</p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557]">
                <p className="text-xs font-bold text-[#061B36] dark:text-white">
                  AI in Enterprise Leadership
                </p>
                <p className="text-[10px] text-[#8C9AC0] mt-0.5">Google Cloud · 4 Modules</p>
              </div>
            </div>
          </div>

          {/* Referral Rewards Partner Card */}
          <div className="rounded-2xl border border-[#E9E5DC] bg-white p-5 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#061B36] dark:text-white">
                <HiGift className="h-4 w-4 text-[#D6952F] shrink-0" />
                <span>Referral Earnings</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                Earn ₹5,000 / ref
              </span>
            </div>

            <p className="text-[11px] text-[#5B6479] dark:text-slate-400">
              Refer professional peers to Gravitas Edge and earn direct wallet payouts.
            </p>

            <div className="mt-3 rounded-xl bg-[#FAF8F5] p-3 border border-[#E9E5DC] dark:bg-[#081B33] dark:border-[#1E3557]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[#8C9AC0] uppercase tracking-wider font-semibold">
                    Wallet Balance
                  </p>
                  <p className="text-lg font-bold text-[#061B36] dark:text-white mt-0.5">
                    {formatMoney(
                      referral?.commissionTotalAmount ? Number(referral.commissionTotalAmount) : 0,
                      'INR',
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#8C9AC0] uppercase tracking-wider font-semibold">
                    Total Referrals
                  </p>
                  <p className="text-lg font-bold text-[#D6952F] dark:text-[#F0C27B] mt-0.5">
                    {referral?.counts.totalReferrals ?? 0}
                  </p>
                </div>
              </div>

              {referral?.referralCode && (
                <div className="mt-3 pt-2.5 border-t border-[#E9E5DC] dark:border-[#1E3557] flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[#061B36] dark:text-white truncate">
                    {referral.referralCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="shrink-0 px-2.5 py-1 rounded-md bg-[#061B36] hover:bg-[#132B4F] text-white text-[11px] font-semibold transition cursor-pointer"
                  >
                    {copiedCode ? (
                      <span className="inline-flex items-center gap-1">
                        <HiCheck className="h-3 w-3 text-emerald-400" />
                        <span>Copied</span>
                      </span>
                    ) : (
                      'Copy Link'
                    )}
                  </button>
                </div>
              )}
            </div>

            <Link href="/refer-and-earn" className="mt-3 block">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <span>Explore Partner Program</span>
                <HiArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* Need Help / Direct Advisor Card */}
          <div className="rounded-2xl border border-[#E9E5DC] bg-white p-4 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340] text-center">
            <p className="text-xs font-bold text-[#061B36] dark:text-white">
              Questions about Vault Access?
            </p>
            <p className="text-[11px] text-[#5B6479] dark:text-slate-400 mt-1">
              Our candidate relations desk is available Monday–Friday.
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Link href="/contact">
                <Button size="sm" variant="ghost" className="text-xs font-semibold">
                  Contact Support
                </Button>
              </Link>
              <Link href="/#faq">
                <Button size="sm" variant="ghost" className="text-xs font-semibold">
                  Read FAQs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
