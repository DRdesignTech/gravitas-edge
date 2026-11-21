'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchOpportunity } from '@/lib/services';
import { Opportunity } from '@/lib/types';
import { Button, Card, Skeleton, EmptyState, LockIcon, UnlockIcon } from '@/components/ui';
import {
  PinIcon,
  BriefcaseIcon,
  LayersIcon,
  GlobeIcon,
  BarsIcon,
  SparkleIcon,
} from '@/components/cards';
import {
  formatDate,
  titleCase,
  displayExperience,
  hasExperience,
  isMeaningful,
} from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { previousInternalRoute } from '@/lib/navigation';
import { useAuth } from '@/lib/auth';
import {
  canRevealCompanyExperience,
  companyExperienceLockMessage,
  isCompanyWithheld,
  isExperienceWithheld,
} from '@/lib/opportunity-access';
import { LockNotice } from '@/components/LockNotice';
import { OPPORTUNITY_FIELD_LABELS, extractEmail, buildApplyMailto } from '@job-portal/shared';

/* ------------------------------------------------------------------ */
/*  Country flags & helper mappings                                   */
/* ------------------------------------------------------------------ */

const COUNTRY_FLAGS: Record<string, string> = {
  'United Arab Emirates': '🇦🇪',
  UAE: '🇦🇪',
  'Saudi Arabia': '🇸🇦',
  Singapore: '🇸🇬',
  'United Kingdom': '🇬🇧',
  UK: '🇬🇧',
  Germany: '🇩🇪',
  Qatar: '🇶🇦',
  Kenya: '🇰🇪',
  Canada: '🇨🇦',
  'United States': '🇺🇸',
  USA: '🇺🇸',
  US: '🇺🇸',
  India: '🇮🇳',
  Australia: '🇦🇺',
  Oman: '🇴🇲',
  Nigeria: '🇳🇬',
};

function formatJobId(id: string): string {
  if (!id) return '';
  if (id.startsWith('GE-')) return id;
  if (id.length <= 10) return id.toUpperCase();
  return `GE-${id.slice(0, 7).toUpperCase()}`;
}

/* ------------------------------------------------------------------ */
/*  Inline icons                                                       */
/* ------------------------------------------------------------------ */

function ArrowLeftIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function ArrowRightIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function BuildingIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
      />
    </svg>
  );
}

function CurrencyIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function TagIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

function FileTextIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function AwardIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
      />
    </svg>
  );
}

function SendIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    </svg>
  );
}

function InfoIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
      />
    </svg>
  );
}

function CopyIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
      />
    </svg>
  );
}

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.4}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function ShieldCheckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Presentation components                                           */
/* ------------------------------------------------------------------ */

function HeroPill({
  tone,
  children,
}: {
  tone: 'gold' | 'glass' | 'emerald';
  children: React.ReactNode;
}) {
  const tones = {
    gold: 'border-[#F0C27B]/40 bg-gradient-to-r from-[#F0C27B]/20 to-[#D6952F]/10 text-[#F0C27B] shadow-2xs',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-2xs',
    glass: 'border-white/15 bg-white/[0.06] text-slate-200',
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function HeroFact({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#C9D3EA]">
      <span className="text-[#F0C27B]">{icon}</span>
      {children}
    </span>
  );
}

function ExecutiveSectionCard({
  icon,
  eyebrow,
  title,
  children,
  className = '',
}: {
  icon?: React.ReactNode;
  eyebrow?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-[#E9E5DC] bg-white p-6 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340] ${className}`}
    >
      {/* Top subtle highlight line */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#D6952F]/40 to-transparent" />

      {title && (
        <div className="flex items-center gap-3.5 border-b border-[#E9E5DC] pb-4 mb-5 dark:border-[#1E3557]">
          {icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#061B36] text-[#F0C27B] shadow-2xs dark:bg-[#1D3B66]">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#D6952F]">
                {eyebrow}
              </p>
            )}
            <h2 className="truncate text-base sm:text-lg font-bold text-[#061B36] dark:text-white">
              {title}
            </h2>
          </div>
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}

function FactTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start gap-3.5 rounded-xl border border-[#E9E5DC]/70 bg-[#FAF8F5] p-4 transition-colors hover:border-[#D6952F]/40 dark:border-[#1E3557] dark:bg-[#081B33]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#D6952F] shadow-2xs dark:bg-[#0E2340] dark:text-[#F0C27B]">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-wider text-[#5B6479] dark:text-slate-400">
          {label}
        </dt>
        <dd className="mt-1 break-words text-sm font-semibold leading-snug text-[#061B36] dark:text-[#EAEFFB]">
          {value}
        </dd>
      </div>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#E9E5DC]/70 py-2.5 text-xs sm:text-sm last:border-b-0 dark:border-[#1E3557]/70">
      <dt className="shrink-0 font-medium text-[#5B6479] dark:text-slate-400">{label}</dt>
      <dd className="break-words text-right font-bold text-[#061B36] dark:text-white">{value}</dd>
    </div>
  );
}

function MaskedBlock({
  label,
  value,
  className = '',
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={className}>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#5B6479] dark:text-slate-400">
        <LockIcon className="h-3.5 w-3.5 text-[#D6952F]" /> {label}
      </p>
      <div className="relative mt-2 overflow-hidden rounded-xl border border-dashed border-[#E9E5DC] bg-[#FAF8F5] px-4 py-4 dark:border-[#1E3557] dark:bg-[#081B33]">
        <div aria-hidden="true" className="select-none space-y-2.5 blur-[4px]">
          <div className="h-2.5 w-4/5 rounded-full bg-[#E9E5DC] dark:bg-[#1E3557]" />
          <div className="h-2.5 w-full rounded-full bg-[#E9E5DC] dark:bg-[#1E3557]" />
          <div className="h-2.5 w-3/5 rounded-full bg-[#E9E5DC] dark:bg-[#1E3557]" />
        </div>
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6952F]/40 bg-white px-3.5 py-1 text-xs font-bold text-[#061B36] shadow-2xs dark:bg-[#0E2340] dark:text-[#F0C27B]">
            <LockIcon className="h-3.5 w-3.5 text-[#D6952F]" />
            Subscriber Vault Access Required
          </span>
        </span>
      </div>
    </div>
  );
}

function CopyEmailButton({ email, className = '' }: { email: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#E9E5DC] bg-white px-4 py-2 text-xs font-bold text-[#061B36] hover:bg-slate-50 dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-white dark:hover:bg-[#152E50] transition-colors ${className}`}
    >
      {copied ? (
        <>
          <CheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-600 dark:text-emerald-400">Copied to Clipboard!</span>
        </>
      ) : (
        <>
          <CopyIcon className="h-4 w-4 text-[#D6952F]" />
          <span>Copy Recruiter Email</span>
        </>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Opportunity Detail Page                                      */
/* ------------------------------------------------------------------ */

export default function OpportunityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hasVaultAccess } = useAuth();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /**
   * Prefer a real browser Back when the visitor reached this page from an
   * internal route (exact previous page + scroll position preserved).
   */
  const handleBack = (e: React.MouseEvent) => {
    if (previousInternalRoute()) {
      e.preventDefault();
      router.back();
    }
  };

  const load = () => {
    setLoading(true);
    setError('');
    fetchOpportunity(params.id)
      .then(setOpportunity)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FEFDF9] dark:bg-[#06142A]">
        <section className="bg-gradient-to-b from-[#061B36] via-[#092244] to-[#0A2645] py-16 px-4">
          <div className="mx-auto max-w-[1240px]">
            <Skeleton className="h-4 w-36 bg-white/20 rounded-md" />
            <Skeleton className="mt-5 h-6 w-48 bg-white/20 rounded-full" />
            <Skeleton className="mt-4 h-12 w-3/4 bg-white/20 rounded-xl" />
            <Skeleton className="mt-4 h-6 w-1/3 bg-white/20 rounded-md" />
            <Skeleton className="mt-8 h-8 w-1/2 bg-white/20 rounded-lg" />
          </div>
        </section>
        <div className="mx-auto max-w-[1240px] px-4 py-12">
          <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <Skeleton className="h-72 rounded-2xl bg-[#E9E5DC]/40 dark:bg-[#1E3557]/40 animate-pulse" />
              <Skeleton className="h-56 rounded-2xl bg-[#E9E5DC]/40 dark:bg-[#1E3557]/40 animate-pulse" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-80 rounded-2xl bg-[#E9E5DC]/40 dark:bg-[#1E3557]/40 animate-pulse" />
              <Skeleton className="h-52 rounded-2xl bg-[#E9E5DC]/40 dark:bg-[#1E3557]/40 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="min-h-screen bg-[#FEFDF9] dark:bg-[#06142A] py-16 px-4">
        <div className="mx-auto max-w-2xl">
          <Card className="p-8 text-center border-[#E9E5DC] dark:border-[#1E3557] dark:bg-[#0E2340]">
            <EmptyState
              icon={<LockIcon className="h-8 w-8 text-[#D6952F]" />}
              title={opportunity ? 'In Preview' : 'Opportunity Not Found'}
              description={
                opportunity
                  ? 'This premium opportunity requires an active Vault subscription to inspect.'
                  : "We couldn't locate this opportunity listing in the live registry."
              }
              action={
                <div className="mt-4 flex items-center justify-center gap-3">
                  {error && (
                    <Button variant="outline" onClick={load}>
                      Try again
                    </Button>
                  )}
                  <Link href="/opportunities" onClick={handleBack}>
                    <Button variant="primary">Back to opportunities</Button>
                  </Link>
                </div>
              }
            />
          </Card>
        </div>
      </div>
    );
  }

  const o = opportunity;
  const L = OPPORTUNITY_FIELD_LABELS;
  const applyEmail = extractEmail(o.applicationContact, o.applicationUrl);
  const singleVault = o.vaults && o.vaults.length === 1 ? o.vaults[0] : null;
  const backHref = singleVault
    ? o.isFullAccess
      ? `/opportunities?vaultId=${encodeURIComponent(singleVault.id)}`
      : `/vaults/${singleVault.id}`
    : '/opportunities';
  const backLabel = singleVault ? `Back to ${singleVault.name}` : 'Back to opportunities';
  const source =
    o.source && o.source.trim() && o.source.trim().toLowerCase() !== 'not specified'
      ? o.source.trim()
      : null;
  const locked = o.isFullAccess === false;
  const revealCompanyExperience = canRevealCompanyExperience(o, hasVaultAccess);
  const lockMessage = companyExperienceLockMessage(o);
  const companyWithheld = isCompanyWithheld(o, revealCompanyExperience);
  const experienceWithheld = isExperienceWithheld(o, revealCompanyExperience);
  const experience = hasExperience(o.experienceText, o.minExperience, o.maxExperience)
    ? displayExperience(o.experienceText, o.minExperience, o.maxExperience)
    : null;
  const unlockHref = singleVault ? `/vaults/${singleVault.id}` : '/plans';
  const flag = o.country ? COUNTRY_FLAGS[o.country] || '🌐' : '🌐';
  const formattedId = formatJobId(o.jobId || o.id);

  return (
    <div className="min-h-screen bg-[#FEFDF9] dark:bg-[#06142A] text-[#1A2236] dark:text-[#EAEFFB]">
      {/* ─────────────────────────────────────────────────────────────
          1. EXECUTIVE HERO SECTION (MATCHING DESIGN ARCHITECTURE)
          ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#061B36] via-[#092244] to-[#0A2645] pb-12 pt-10 text-white isolate sm:pb-16 sm:pt-14">
        {/* Ambient atmospheric glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#15803D]/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-[#D6952F]/15 blur-3xl"
        />

        {/* Concentric subtle watermark rings */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-12 top-10 h-64 w-64 rounded-full border border-white/[0.04]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-24 top-20 h-40 w-40 rounded-full border border-[#D6952F]/10"
        />

        <div className="relative mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#AEB9D6]">
            <div className="flex items-center gap-1.5">
              <Link href="/" className="text-[#F0C27B] hover:text-white transition-colors">
                Home
              </Link>
              <span className="text-[#8C9AC0]">/</span>
              <Link href="/opportunities" className="text-[#F0C27B] hover:text-white transition-colors">
                Opportunities
              </Link>
              <span className="text-[#8C9AC0]">/</span>
              <span className="text-white truncate max-w-[200px] sm:max-w-md">{o.title}</span>
            </div>

            <Link
              href={backHref}
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 font-bold text-[#F0C27B] hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              {backLabel}
            </Link>
          </div>

          {/* Badges Strip */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {o.isPremium ? (
              <HeroPill tone="gold">
                <SparkleIcon className="h-3.5 w-3.5 text-[#F0C27B]" /> Premium Mandate
              </HeroPill>
            ) : (
              <HeroPill tone="emerald">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live Opportunity
              </HeroPill>
            )}

            {o.isPremium && o.isFullAccess && (
              <HeroPill tone="emerald">
                <UnlockIcon className="h-3.5 w-3.5" /> Full Access Unlocked
              </HeroPill>
            )}

            {formattedId && (
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 font-mono text-[11px] font-semibold text-white backdrop-blur-md">
                {formattedId}
              </span>
            )}

            {o.category && <HeroPill tone="glass">{titleCase(o.category)}</HeroPill>}
            {o.employmentType && <HeroPill tone="glass">{titleCase(o.employmentType)}</HeroPill>}
          </div>

          {/* Role Title */}
          <h1 className="mt-5 max-w-4xl font-sans text-3xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-5xl">
            {o.title}
          </h1>

          {/* Company & Compensation Bar */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            {companyWithheld ? (
              <LockNotice tone="gold" message={lockMessage} />
            ) : isMeaningful(o.company) ? (
              <span className="inline-flex items-center gap-2 text-base font-semibold text-slate-100 sm:text-lg">
                <BuildingIcon className="h-5 w-5 text-[#F0C27B]" />
                {o.company}
              </span>
            ) : (
              <span className="text-base italic text-slate-300 sm:text-lg">
                Company undisclosed in preview
              </span>
            )}

            {isMeaningful(o.salary) && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F0C27B]/40 bg-[#F0C27B]/15 px-3.5 py-1 text-xs sm:text-sm font-bold text-[#F0C27B] shadow-2xs">
                <CurrencyIcon className="h-4 w-4" />
                {o.salary}
              </span>
            )}
          </div>

          {/* Quick Facts Strip */}
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-xs sm:text-sm">
            {o.location && (
              <HeroFact icon={<PinIcon className="h-4 w-4" />}>
                <span>{o.location}</span>
              </HeroFact>
            )}
            {o.country && (
              <HeroFact icon={<GlobeIcon className="h-4 w-4" />}>
                <span>
                  {flag} {o.country}
                </span>
              </HeroFact>
            )}
            {experience && !experienceWithheld && (
              <HeroFact icon={<BarsIcon className="h-4 w-4" />}>
                <span>{experience}</span>
              </HeroFact>
            )}
            {isMeaningful(o.industry) && (
              <HeroFact icon={<LayersIcon className="h-4 w-4" />}>
                <span>{o.industry}</span>
              </HeroFact>
            )}
            {o.publishedDate && (
              <HeroFact icon={<FileTextIcon className="h-4 w-4" />}>
                <span>Posted {formatDate(o.publishedDate)}</span>
              </HeroFact>
            )}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN CONTENT (2-COLUMN GRID)
          ───────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
          {/* ═════════════════════════════════════════════════════════
              LEFT COLUMN: OVERVIEW, QUALIFICATIONS & ROLE DETAILS
              ═════════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            {/* Section 1: Job Overview Facts */}
            <ExecutiveSectionCard
              icon={<BriefcaseIcon className="h-5 w-5" />}
              eyebrow="Mandate Overview"
              title="Job Specifications & Parameters"
            >
              <dl className="grid gap-4 sm:grid-cols-2">
                <FactTile
                  icon={<LayersIcon className="h-5 w-5" />}
                  label={L.sector}
                  value={isMeaningful(o.industry) ? o.industry : undefined}
                />
                <FactTile
                  icon={<PinIcon className="h-5 w-5" />}
                  label={L.location}
                  value={isMeaningful(o.location) ? o.location : undefined}
                />
                <FactTile
                  icon={<GlobeIcon className="h-5 w-5" />}
                  label="Target Market / Country"
                  value={
                    isMeaningful(o.country) ? (
                      <span className="flex items-center gap-1.5">
                        <span>{flag}</span>
                        <span>{o.country}</span>
                      </span>
                    ) : undefined
                  }
                />
                <FactTile
                  icon={<TagIcon className="h-5 w-5" />}
                  label="Functional Area"
                  value={isMeaningful(o.functionalArea) ? o.functionalArea : undefined}
                />
                <FactTile
                  icon={<BriefcaseIcon className="h-5 w-5" />}
                  label="Work Model / Engagement"
                  value={o.employmentType ? titleCase(o.employmentType) : undefined}
                />
                <FactTile
                  icon={<BarsIcon className="h-5 w-5" />}
                  label={L.experience}
                  value={experienceWithheld ? <LockNotice message={lockMessage} /> : experience}
                />
              </dl>
            </ExecutiveSectionCard>

            {/* Section 2: Locked Preview OR Requirements */}
            {locked ? (
              <ExecutiveSectionCard
                icon={<LockIcon className="h-5 w-5" />}
                eyebrow="Subscriber Vault Access"
                title="Full Opportunity Requirements & Contacts Locked"
              >
                <div className="rounded-xl border border-[#F0C27B]/40 bg-[#FAF8F5] p-4.5 dark:bg-[#081B33]">
                  <p className="text-xs sm:text-sm leading-relaxed text-[#5B6479] dark:text-slate-300">
                    Direct hiring partner identity, complete candidate requirements, qualification criteria, and unmediated recruiter contact details are protected under Opportunity Vault subscriptions.
                  </p>
                </div>

                <div className="mt-6 grid gap-5 border-t border-[#E9E5DC] pt-6 sm:grid-cols-2 dark:border-[#1E3557]">
                  <MaskedBlock label={L.qualification} value={o.lockedPreview?.qualification} />
                  <MaskedBlock label={L.otherDetails} value={o.lockedPreview?.otherDetails} />
                  <MaskedBlock
                    className="sm:col-span-2"
                    label={L.howToApply}
                    value={o.lockedPreview?.howToApply}
                  />
                </div>
              </ExecutiveSectionCard>
            ) : (
              <>
                {isMeaningful(o.qualification) && (
                  <ExecutiveSectionCard
                    icon={<AwardIcon className="h-5 w-5" />}
                    eyebrow="Requirements & Criteria"
                    title={L.qualification}
                  >
                    <p className="whitespace-pre-line break-words text-sm sm:text-base leading-relaxed text-[#1A2236] dark:text-slate-200">
                      {o.qualification}
                    </p>
                  </ExecutiveSectionCard>
                )}

                {isMeaningful(o.description) && (
                  <ExecutiveSectionCard
                    icon={<FileTextIcon className="h-5 w-5" />}
                    eyebrow="Role Context & Mandate Scope"
                    title={L.otherDetails}
                  >
                    <p className="whitespace-pre-line break-words text-sm sm:text-base leading-relaxed text-[#1A2236] dark:text-slate-200">
                      {o.description}
                    </p>
                  </ExecutiveSectionCard>
                )}
              </>
            )}

            {/* Section 3: Executive Mandate Assurance */}
            <div className="flex items-start gap-4 rounded-2xl border border-[#E9E5DC] bg-white p-5 shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#061B36] text-[#F0C27B] dark:bg-[#1D3B66]">
                <ShieldCheckIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#061B36] dark:text-white">
                  Curated Executive Mandate Guarantee
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-[#5B6479] dark:text-slate-300 leading-relaxed">
                  Every opportunity in Gravitas Edge is individually reviewed and sourced from retained search partners, corporate boards, and verified leadership networks. We never scrape public job boards.
                </p>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════
              RIGHT COLUMN: ACTION CARD & MANDATE SNAPSHOT
              ═════════════════════════════════════════════════════════ */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {locked ? (
              /* High-Conversion Vault Access Card */
              <div className="relative overflow-hidden rounded-2xl border border-[#D6952F]/40 bg-gradient-to-b from-[#061B36] to-[#0A2645] p-6 text-white shadow-xl isolate">
                {/* Decorative radial watermarks */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-[#D6952F]/20 blur-2xl"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rounded-full border border-white/10"
                />

                <div className="relative z-10">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.08] text-[#F0C27B] border border-white/15 shadow-inner">
                    <LockIcon className="h-6 w-6" />
                  </span>

                  <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#F0C27B]">
                    Premium Subscriber Vault
                  </p>
                  <h2 className="mt-1 font-sans text-xl font-extrabold text-white leading-snug">
                    Unlock Full Mandate Details
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-[#C9D3EA] leading-relaxed">
                    Gain verified access to decision-maker contacts, exact organization details, and application channels for this role.
                  </p>

                  <ul className="mt-5 space-y-2.5 border-t border-white/10 pt-4">
                    {[
                      'Direct hiring partner & recruiter email',
                      'Exact organization & leadership context',
                      'Full requirements & experience parameters',
                      'Direct application routes without queues',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
                        <span className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-500/20 p-1 text-emerald-400">
                          <CheckIcon className="h-3 w-3" />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={unlockHref}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F0C27B] to-[#D6952F] px-6 py-3.5 text-sm font-extrabold text-[#061B36] shadow-lg hover:brightness-105 transition-all hover:-translate-y-0.5 cursor-pointer"
                  >
                    <span>Unlock Full Access</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>

                  <p className="mt-3 text-center text-[11px] text-[#AEB9D6]">
                    One-time payment or flexible term · No auto-debit
                  </p>
                </div>
              </div>
            ) : (
              /* Unlocked Application Card */
              <div className="overflow-hidden rounded-2xl border border-emerald-500/40 bg-white shadow-sm dark:bg-[#0E2340] dark:border-emerald-500/30">
                <div className="relative border-b border-[#E9E5DC] bg-gradient-to-b from-emerald-50/70 to-white px-6 py-5 dark:border-[#1E3557] dark:from-emerald-950/20 dark:to-[#0E2340]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#061B36] text-[#F0C27B] shadow-2xs dark:bg-[#1D3B66]">
                      <SendIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#061B36] dark:text-white">
                        How to Apply
                      </h2>
                      <p className="text-xs text-[#5B6479] dark:text-slate-400">
                        Direct unmediated access to hiring team
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {applyEmail ? (
                    <div className="space-y-4">
                      <a
                        href={buildApplyMailto(applyEmail, {
                          title: o.title,
                          company: revealCompanyExperience ? o.company : undefined,
                        })}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#061B36] px-6 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-[#10243E] dark:bg-[#F0C27B] dark:text-[#061B36] dark:hover:bg-[#D6952F] transition-all hover:-translate-y-0.5"
                      >
                        <span>Apply via Direct Email</span>
                        <ArrowRightIcon className="h-4 w-4" />
                      </a>

                      <div className="rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] p-4 dark:border-[#1E3557] dark:bg-[#081B33]">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B6479] dark:text-slate-400">
                          Recruiter / Mandate Contact
                        </p>
                        <a
                          href={`mailto:${applyEmail}`}
                          className="mt-1 block break-all text-sm font-bold text-[#061B36] hover:text-[#D6952F] dark:text-white dark:hover:text-[#F0C27B] transition-colors"
                        >
                          {applyEmail}
                        </a>
                        <CopyEmailButton email={applyEmail} className="mt-3 w-full" />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#E9E5DC] bg-[#FAF8F5] p-4 text-xs text-[#5B6479] dark:border-[#1E3557] dark:bg-[#081B33] dark:text-slate-400">
                      An application email is being verified for this mandate. Please check back shortly or reach out to our team.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mandate Snapshot Card */}
            <ExecutiveSectionCard
              icon={<InfoIcon className="h-5 w-5" />}
              eyebrow="Mandate Registry"
              title="At a Glance"
            >
              <dl className="space-y-1">
                <SnapshotRow label="Mandate ID" value={formattedId || o.jobId || 'N/A'} />
                <SnapshotRow label="Date Posted" value={formatDate(o.publishedDate)} />
                <SnapshotRow label="Closing / Expiry" value={formatDate(o.expiryDate)} />
                <SnapshotRow label="Source" value={source || 'Direct Search Mandate'} />
                <SnapshotRow
                  label="Category"
                  value={o.category ? titleCase(o.category) : undefined}
                />
                <SnapshotRow
                  label={o.vaults && o.vaults.length > 1 ? 'Opportunity Vaults' : 'Opportunity Vault'}
                  value={o.vaults?.length ? o.vaults.map((v) => v.name).join(', ') : 'Global Access'}
                />
              </dl>
            </ExecutiveSectionCard>

            {/* Advisory Assistance Card */}
            <div className="rounded-2xl border border-[#E9E5DC] bg-white p-5 text-xs text-[#5B6479] shadow-sm dark:border-[#1E3557] dark:bg-[#0E2340] dark:text-slate-400">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#061B36] dark:text-white">
                Need Mandate Guidance?
              </h4>
              <p className="mt-1.5 leading-relaxed">
                Connect with our advisory consultants for free guidance on which opportunities and Vaults fit your executive background.
              </p>
              <Link
                href="/contact"
                className="mt-3 inline-flex items-center gap-1.5 font-bold text-[#D6952F] hover:underline"
              >
                Contact Advisory Team →
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
