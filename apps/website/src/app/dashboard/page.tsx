'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  fetchMyActiveSubscriptions,
  fetchMyProfile,
  fetchMyResumes,
  fetchOpportunities,
  fetchReferralSummary,
  fetchVaults,
} from '@/lib/services';
import {
  Opportunity,
  PaginatedResult,
  ReferralSummary,
  Resume,
  Subscription,
  UserProfile,
  Vault,
} from '@/lib/types';
import { Badge, Button, EmptyState, ErrorState, Skeleton, StatusBadge } from '@/components/ui';
import { BriefcaseIcon, LayersIcon, VaultIcon } from '@/components/cards';
import {
  formatDate,
  formatMoney,
  titleCase,
  displayExperience,
  hasExperience,
  isMeaningful,
} from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

const RECENT_LIMIT = 5;

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

export default function Dashboard() {
  const { user } = useAuth();

  // Profile (hydrates name/location right after login, before /auth/me refresh)
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Core access data (subscriptions + vaults)
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState('');

  // Recent opportunities
  const [recent, setRecent] = useState<PaginatedResult<Opportunity> | null>(null);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState('');

  // Resume
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [resumeError, setResumeError] = useState('');

  // Referral
  const [referral, setReferral] = useState<ReferralSummary | null>(null);
  const [referralLoading, setReferralLoading] = useState(true);
  const [referralError, setReferralError] = useState('');

  const loadProfile = useCallback(() => {
    fetchMyProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  const loadAccess = useCallback(() => {
    setAccessLoading(true);
    setAccessError('');
    Promise.all([fetchMyActiveSubscriptions(), fetchVaults()])
      .then(([s, v]) => {
        setSubs(s || []);
        setVaults(v || []);
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
  const firstName = fullName ? fullName.trim().split(' ')[0] : '';
  const roleLine = [
    profile?.currentJobTitle || user?.profile?.currentJobTitle,
    profile?.currentCompany || user?.profile?.currentCompany,
  ]
    .filter(Boolean)
    .join(' at ');
  const location = profile?.location || user?.profile?.location;
  const profileImg = profile?.profileImg || user?.profile?.profileImg;
  const memberSince = profile?.createdAt || user?.createdAt;
  const displayName = fullName || user?.email || 'there';

  const unlockedVaults = vaults.filter((v) => !v.locked);
  const lockedVaults = vaults.filter((v) => v.locked);
  const hasAccess = subs.length > 0;
  const publishedCount = recent?.meta.totalItems ?? 0;
  const nearestExpiryEnd = subs.length
    ? subs.reduce((nearest, s) => (s.endDate < nearest ? s.endDate : nearest), subs[0].endDate)
    : null;
  const referralBalance = referral?.commissionTotalAmount
    ? Number(referral.commissionTotalAmount)
    : 0;
  const latestResume = resumes[0];

  return (
    <div>
      {/* ── Welcome banner ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 card-static dark:bg-surface-elevated sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {profileImg ? (
            <img
              src={profileImageUrl(profileImg)}
              alt="Profile"
              className="h-14 w-14 shrink-0 rounded-2xl border border-brand-200 object-cover dark:border-brand-800"
            />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-xl font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {(displayName.trim()[0] || '?').toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-content sm:text-2xl">
              Welcome back{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-0.5 truncate text-sm text-content-muted">{roleLine || user?.email}</p>
            <p className="mt-0.5 truncate text-xs text-content-faint">
              Member since {formatDate(memberSince)}
              {location ? ` · ${location}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={user?.status} />
          {hasAccess && <Badge variant="success">Active member</Badge>}
          <Link href="/opportunities">
            <Button size="sm">Browse opportunities</Button>
          </Link>
        </div>
      </div>

      {/* ── Stat row ───────────────────────────────────────────────── */}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Active subscriptions"
          value={accessLoading ? '…' : subs.length}
          sub={
            hasAccess && nearestExpiryEnd
              ? `Next renewal ${formatDate(nearestExpiryEnd)}`
              : 'No active plans'
          }
          icon={<LayersIcon className="h-5 w-5" />}
        />
        <Stat
          label="Vaults unlocked"
          value={accessLoading ? '…' : `${unlockedVaults.length}/${vaults.length}`}
          sub={
            accessLoading
              ? 'Loading…'
              : lockedVaults.length > 0
                ? `${lockedVaults.length} locked`
                : 'All vaults unlocked'
          }
          icon={<VaultIcon className="h-5 w-5" />}
          tone="emerald"
        />
        <Stat
          label="Opportunities to explore"
          value={recentLoading ? '…' : publishedCount}
          sub={recentLoading ? 'Loading…' : 'Published roles you can browse'}
          icon={<BriefcaseIcon className="h-5 w-5" />}
          tone="blue"
        />
        <Stat
          label="Referral balance"
          value={referralLoading ? '…' : formatMoney(referralBalance, 'INR')}
          sub={
            referralLoading
              ? 'Loading…'
              : `${referral?.counts.totalReferrals ?? 0} referral${referral?.counts.totalReferrals === 1 ? '' : 's'}`
          }
          icon={<GiftIcon className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      {/* ── Main grid ─────────────────────────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* My Vaults & Active Access */}
          <SectionCard
            title="My Vaults & Active Access"
            action={
              hasAccess && lockedVaults.length > 0 ? (
                <Link href="/plans">
                  <Button variant="ghost" size="sm">
                    Unlock more
                  </Button>
                </Link>
              ) : undefined
            }
          >
            {accessLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : accessError ? (
              <ErrorState message={accessError} onRetry={loadAccess} />
            ) : hasAccess ? (
              <>
                <div className="space-y-4">
                  {subs.map((s) => (
                    <SubscriptionCard key={s.id} sub={s} />
                  ))}
                </div>

                <div className="mt-5 border-t border-line pt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-content-faint">
                      Your active vaults
                    </h4>
                    <Link
                      href="/dashboard/vaults"
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      View all →
                    </Link>
                  </div>
                  {unlockedVaults.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {unlockedVaults.map((v) => (
                        <Link
                          key={v.id}
                          href={`/opportunities?vaultId=${encodeURIComponent(v.id)}`}
                          className="group flex items-start justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/40 p-4 transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-brand-500/30 dark:bg-brand-950/20 dark:hover:border-brand-500/60"
                        >
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 font-semibold text-content">
                              <VaultIcon className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
                              <span className="truncate">{v.name}</span>
                            </p>
                            <p className="mt-1 text-xs text-content-muted">
                              {titleCase(v.type)} vault · unlocked
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-300">
                            Open jobs
                            <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-content-muted">
                      Vaults you unlock will appear here.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-line p-6 text-center sm:p-8">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-content-faint dark:bg-surface-muted">
                  <VaultIcon className="h-6 w-6" />
                </span>
                <h4 className="mt-4 text-base font-semibold text-content">
                  You don&apos;t have an active subscription yet
                </h4>
                <p className="mx-auto mt-1.5 max-w-md text-sm text-content-muted">
                  Subscribe to unlock premium vaults with full role details, direct contacts and
                  application links.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Link href="/vaults">
                    <Button>Explore vaults</Button>
                  </Link>
                  <Link href="/opportunities">
                    <Button variant="outline">Browse free preview</Button>
                  </Link>
                </div>
                <p className="mt-4 text-xs text-content-faint">
                  Comparing options?{' '}
                  <Link
                    href="/plans"
                    className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >
                    View plans
                  </Link>
                </p>
              </div>
            )}
          </SectionCard>

          {/* Recently added opportunities */}
          <SectionCard
            title="Recently added opportunities"
            action={
              <Link
                href="/opportunities"
                className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                View all →
              </Link>
            }
          >
            {recentLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : recentError ? (
              <ErrorState message={recentError} onRetry={loadRecent} />
            ) : !recent || recent.items.length === 0 ? (
              <EmptyState
                icon={<BriefcaseIcon className="h-6 w-6" />}
                title="No opportunities published yet"
                description="New roles will appear here as soon as they’re posted."
                action={
                  <Link href="/opportunities">
                    <Button>Browse opportunities</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {recent.items.map((o) => (
                  <OpportunityMiniRow key={o.id} opportunity={o} />
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="min-w-0 space-y-6">
          {/* Quick actions */}
          <SectionCard title="Quick actions">
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
              <QuickLink href="/opportunities" icon={<BriefcaseIcon className="h-4 w-4" />}>
                Browse opportunities
              </QuickLink>
              <QuickLink href="/dashboard/vaults" icon={<VaultIcon className="h-4 w-4" />}>
                My vaults & access
              </QuickLink>
              <QuickLink href="/dashboard/subscriptions" icon={<LayersIcon className="h-4 w-4" />}>
                My subscriptions
              </QuickLink>
              <QuickLink href="/dashboard/resumes" icon={<FileIcon className="h-4 w-4" />}>
                Update resume
              </QuickLink>
              <QuickLink href="/dashboard/referrals" icon={<GiftIcon className="h-4 w-4" />}>
                Referral rewards
              </QuickLink>
              <QuickLink href="/dashboard/profile" icon={<UserIcon className="h-4 w-4" />}>
                Edit profile
              </QuickLink>
            </div>
          </SectionCard>

          {/* Resume */}
          <SectionCard
            title="Resume"
            action={
              latestResume ? (
                <Link
                  href="/dashboard/resumes"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Update →
                </Link>
              ) : undefined
            }
          >
            {resumeLoading ? (
              <Skeleton className="h-20" />
            ) : resumeError ? (
              <ErrorState message={resumeError} onRetry={loadResumes} />
            ) : latestResume ? (
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                  <FileIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-content">
                    {latestResume.originalName}
                  </p>
                  <p className="mt-0.5 text-xs text-content-muted">
                    {formatFileSize(latestResume.fileSize)} · uploaded{' '}
                    {formatDate(latestResume.uploadedAt)}
                  </p>
                  <div className="mt-2">
                    {latestResume.uploadStatus ? (
                      <StatusBadge status={latestResume.uploadStatus} />
                    ) : (
                      <Badge variant="success">Ready</Badge>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-content-faint">
                  <FileIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-content">No resume uploaded yet</p>
                  <p className="mt-0.5 text-xs text-content-muted">
                    Upload a resume so recruiters and roles match on you.
                  </p>
                  <Link href="/dashboard/resumes">
                    <Button variant="outline" size="sm" className="mt-3">
                      Upload resume
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Referral rewards */}
          <SectionCard
            title="Referral rewards"
            action={
              <Link
                href="/dashboard/referrals"
                className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                Manage →
              </Link>
            }
          >
            {referralLoading ? (
              <Skeleton className="h-24" />
            ) : referralError ? (
              <ErrorState message={referralError} onRetry={loadReferral} />
            ) : (
              <>
                <p className="text-xs font-medium uppercase tracking-wider text-content-faint">
                  Rewards balance
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-content">
                  {formatMoney(referralBalance, 'INR')}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <MiniStat label="Total" value={referral?.counts.totalReferrals ?? 0} />
                  <MiniStat
                    label="Successful"
                    value={referral?.counts.successfulReferrals ?? 0}
                    tone="emerald"
                  />
                  <MiniStat
                    label="Pending"
                    value={referral?.counts.pendingReferrals ?? 0}
                    tone="amber"
                  />
                </div>
                {referral?.referralCode && (
                  <div className="mt-4 rounded-xl bg-surface-muted px-4 py-3 dark:bg-surface-muted">
                    <p className="text-xs font-medium uppercase tracking-wider text-content-faint">
                      Your referral code
                    </p>
                    <p className="mt-1 break-all font-mono text-base font-semibold tracking-tight text-content">
                      {referral.referralCode}
                    </p>
                  </div>
                )}
                <Link href="/dashboard/referrals">
                  <Button variant="secondary" size="sm" className="mt-4 w-full">
                    Referral rewards
                  </Button>
                </Link>
              </>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

/* ── Section shell ─────────────────────────────────────────────────── */

function SectionCard({
  title,
  action,
  children,
  className = '',
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface card-static dark:bg-surface-elevated ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <h3 className="text-base font-semibold text-content">{title}</h3>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

/* ── Stat card ─────────────────────────────────────────────────────── */

function Stat({
  label,
  value,
  sub,
  icon,
  tone = 'brand',
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone?: 'brand' | 'emerald' | 'blue' | 'amber';
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    blue: 'bg-[#FFF3D9] text-[#8a6524] dark:bg-brand-950 dark:text-brand-200',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  };
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 card-static dark:bg-surface-elevated">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          {icon}
        </span>
        <p className="text-sm font-medium text-content-muted">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-content">{value}</p>
      {sub && <p className="mt-1 text-xs text-content-faint">{sub}</p>}
    </div>
  );
}

/* ── Subscription summary ──────────────────────────────────────────── */

function SubscriptionCard({ sub }: { sub: Subscription }) {
  const status = sub.effectiveStatus || sub.status;
  const remaining = daysRemaining(sub.endDate);
  return (
    <div className="rounded-xl border border-line bg-surface p-4 dark:bg-surface-elevated">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-content">{sub.plan?.name || 'Subscription'}</p>
          <p className="mt-0.5 text-xs text-content-muted">
            {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
            {sub.plan?.price !== undefined && (
              <span className="ml-2 font-medium text-content">
                {(sub.plan.discountPercentage ?? 0) > 0 && sub.plan.regularPrice && (
                  <span className="mr-1 text-xs font-normal text-content-faint line-through">
                    {formatMoney(sub.plan.regularPrice, sub.plan.currency || 'INR')}
                  </span>
                )}
                {formatMoney(sub.plan.price, sub.plan.currency || 'INR')}
                {(sub.plan.discountPercentage ?? 0) > 0 && (
                  <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                    {sub.plan.discountPercentage}% off
                  </span>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {remaining > 0 && (
            <Badge variant={remaining <= 7 ? 'warning' : 'success'}>
              {remaining} day{remaining === 1 ? '' : 's'} left
            </Badge>
          )}
          <StatusBadge status={status} />
        </div>
      </div>
      {sub.vaultAccess && sub.vaultAccess.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
          {sub.vaultAccess.map((va) => (
            <Badge key={va.vaultId} variant="info">
              {va.vaultName || 'Vault'}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Opportunity mini row ──────────────────────────────────────────── */

function OpportunityMiniRow({ opportunity: o }: { opportunity: Opportunity }) {
  const limited = o.isPremium && !o.isFullAccess;
  return (
    <li>
      <Link
        href={`/opportunities/${o.id}`}
        className="group flex flex-col gap-2 rounded-xl px-2 py-3.5 transition-colors hover:bg-surface-muted -mx-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-content group-hover:text-brand-700 dark:group-hover:text-brand-300">
              {o.title}
            </p>
            <p className="mt-0.5 truncate text-xs text-content-muted">{o.company ?? '—'}</p>
          </div>
          <span className="shrink-0">
            {limited ? (
              <Badge variant="premium">Premium</Badge>
            ) : (
              <Badge variant="success">Full access</Badge>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-content-muted">
          {o.location && (
            <span className="inline-flex items-center gap-1">
              <PinIcon className="h-3.5 w-3.5" /> {o.location}
            </span>
          )}
          {hasExperience(o.experienceText, o.minExperience, o.maxExperience) && (
            <span className="inline-flex items-center gap-1">
              <BarsIcon className="h-3.5 w-3.5" />{' '}
              {displayExperience(o.experienceText, o.minExperience, o.maxExperience)}
            </span>
          )}
          {isMeaningful(o.salary) && (
            <span className="font-semibold text-brand-700 dark:text-brand-300">{o.salary}</span>
          )}
        </div>

        {(o.vaults && o.vaults.length > 0) || o.publishedDate ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {o.vaults?.map((v) => (
              <span
                key={v.id}
                className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-content-muted dark:bg-surface"
              >
                <VaultIcon className="h-3 w-3" /> {v.name}
              </span>
            ))}
            {o.publishedDate && (
              <span className="text-[11px] text-content-faint">
                Added {formatDate(o.publishedDate)}
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-content-faint">Published on Gravitas Edge</span>
        )}
      </Link>
    </li>
  );
}

/* ── Quick link ────────────────────────────────────────────────────── */

function QuickLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-content transition-colors hover:border-brand-300 hover:bg-surface-muted dark:bg-surface-elevated"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
          {icon}
        </span>
        <span className="truncate">{children}</span>
      </span>
      <ArrowRightIcon className="h-4 w-4 shrink-0 text-content-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
    </Link>
  );
}

/* ── Mini stat pill ────────────────────────────────────────────────── */

function MiniStat({
  label,
  value,
  tone = 'brand',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'brand' | 'emerald' | 'amber';
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {label}: <strong>{value}</strong>
    </span>
  );
}

/* ── Local icons ───────────────────────────────────────────────────── */

function ArrowRightIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function PinIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
      />
    </svg>
  );
}

function BarsIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    </svg>
  );
}

function FileIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function GiftIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}

function UserIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}
