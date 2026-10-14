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
import { OPPORTUNITY_FIELD_LABELS, extractEmail, buildApplyMailto } from '@job-portal/shared';

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

/* ------------------------------------------------------------------ */
/*  Small presentation pieces                                          */
/* ------------------------------------------------------------------ */

function HeroPill({
  tone,
  children,
}: {
  tone: 'gold' | 'glass' | 'emerald';
  children: React.ReactNode;
}) {
  const tones = {
    gold: 'border-[#C8943E]/40 bg-gradient-to-r from-[#C8943E]/25 to-[#E3B968]/10 text-[#F1CE82]',
    emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    glass: 'border-white/15 bg-white/[0.06] text-slate-200',
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function HeroFact({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-300">
      <span className="text-[#C8943E]">{icon}</span>
      {children}
    </span>
  );
}

function SectionCard({
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
      className={`overflow-hidden rounded-2xl border border-line bg-surface shadow-card dark:bg-surface-elevated ${className}`}
    >
      {title && (
        <div className="flex items-center gap-3 border-b border-line px-6 py-4">
          {icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-content-faint">
                {eyebrow}
              </p>
            )}
            <h2 className="truncate text-base font-bold text-content">{title}</h2>
          </div>
        </div>
      )}
      <div className="px-6 py-5">{children}</div>
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
    <div className="flex items-start gap-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-brand-600 dark:bg-surface-muted dark:text-brand-300">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-content-faint">
          {label}
        </dt>
        <dd className="mt-0.5 break-words text-sm font-medium leading-snug text-content">
          {value}
        </dd>
      </div>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="shrink-0 text-content-faint">{label}</dt>
      <dd className="break-words text-right font-medium text-content">{value}</dd>
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
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-content-faint">
        <LockIcon className="h-3 w-3 text-amber-500" /> {label}
      </p>
      <p className="mt-2 select-none whitespace-pre-line break-words rounded-xl border border-dashed border-line bg-surface-muted/60 px-4 py-3 text-sm leading-relaxed text-content-faint dark:bg-surface-muted/40">
        {value}
      </p>
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
      // Clipboard unavailable — let the user copy from the mailto link.
    }
  };

  return (
    <Button type="button" variant="outline" onClick={copy} className={className}>
      {copied ? (
        <>
          <CheckIcon className="h-4 w-4" /> Copied!
        </>
      ) : (
        <>
          <CopyIcon className="h-4 w-4" /> Copy email
        </>
      )}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function OpportunityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /**
   * Prefer a real browser Back when the visitor reached this page from an
   * internal route (exact previous page + scroll position preserved). Only fall
   * back to the hardcoded route when no internal history exists (e.g. the page
   * was opened directly).
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
      <div>
        <section className="bg-[#061B36]">
          <div className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pb-16 lg:pt-12">
            <Skeleton className="h-4 w-32 bg-white/10" />
            <Skeleton className="mt-6 h-6 w-40 bg-white/10" />
            <Skeleton className="mt-4 h-11 w-3/4 bg-white/10" />
            <Skeleton className="mt-3 h-6 w-1/3 bg-white/10" />
            <Skeleton className="mt-8 h-5 w-1/2 bg-white/10" />
          </div>
        </section>
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
            <div className="space-y-6">
              <Skeleton className="h-72" />
              <Skeleton className="h-56" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="py-4">
          <EmptyState
            icon={<LockIcon className="h-6 w-6" />}
            title={opportunity ? 'In preview' : 'Opportunity not found'}
            description={
              opportunity
                ? 'This premium opportunity may require an active subscription.'
                : "We couldn't load this opportunity."
            }
            action={
              <>
                {error && (
                  <Button variant="outline" onClick={load}>
                    Try again
                  </Button>
                )}
                <Link href="/opportunities" onClick={handleBack}>
                  <Button variant="ghost">Back to opportunities</Button>
                </Link>
              </>
            }
          />
        </Card>
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
  const experience = hasExperience(o.experienceText, o.minExperience, o.maxExperience)
    ? displayExperience(o.experienceText, o.minExperience, o.maxExperience)
    : null;
  const unlockHref = singleVault ? `/vaults/${singleVault.id}` : '/plans';

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#061B36]">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span
            className="absolute -right-24 -top-32 h-[26rem] w-[26rem] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(200,148,62,0.22), transparent 70%)',
            }}
          />
          <span
            className="absolute -left-24 top-1/4 h-80 w-80 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(120,160,255,0.12), transparent 70%)',
            }}
          />
          <span className="absolute right-16 top-12 h-40 w-40 rounded-full border border-white/[0.06]" />
          <span className="absolute right-36 top-24 h-24 w-24 rounded-full border border-white/[0.06]" />
          <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#C8943E]/50 to-transparent" />
        </span>

        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pb-16 lg:pt-12">
          <Link
            href={backHref}
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#C8943E] transition-colors hover:text-white"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {backLabel}
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {o.isPremium ? (
              <HeroPill tone="gold">
                <SparkleIcon className="h-3.5 w-3.5" /> Premium
              </HeroPill>
            ) : (
              <HeroPill tone="emerald">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Open
              </HeroPill>
            )}
            {o.isPremium && o.isFullAccess && (
              <HeroPill tone="emerald">
                <UnlockIcon className="h-3.5 w-3.5" /> Unlocked
              </HeroPill>
            )}
            <HeroPill tone="glass">{titleCase(o.category)}</HeroPill>
            {o.employmentType && <HeroPill tone="glass">{titleCase(o.employmentType)}</HeroPill>}
          </div>

          <h1 className="mt-5 max-w-4xl text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-5xl">
            {o.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            {isMeaningful(o.company) ? (
              <span className="inline-flex items-center gap-2 text-base text-slate-200 sm:text-lg">
                <BuildingIcon className="h-5 w-5 text-[#C8943E]" />
                {o.company}
              </span>
            ) : (
              <span className="text-base italic text-slate-400 sm:text-lg">
                Company not disclosed
              </span>
            )}
            {isMeaningful(o.salary) && (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#C8943E]/40 bg-[#C8943E]/10 px-3.5 py-1.5 text-sm font-bold text-[#F1CE82]">
                <CurrencyIcon className="h-4 w-4" />
                {o.salary}
              </span>
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-5">
            {o.location && <HeroFact icon={<PinIcon className="h-4 w-4" />}>{o.location}</HeroFact>}
            {o.country && <HeroFact icon={<GlobeIcon className="h-4 w-4" />}>{o.country}</HeroFact>}
            {experience && (
              <HeroFact icon={<BarsIcon className="h-4 w-4" />}>{experience}</HeroFact>
            )}
            {isMeaningful(o.industry) && (
              <HeroFact icon={<LayersIcon className="h-4 w-4" />}>{o.industry}</HeroFact>
            )}
          </div>
        </div>
      </section>

      {/* ── Body ─────────────────────────────────────────────── */}
      <section className="bg-surface-muted">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
            {/* Main column */}
            <div className="space-y-6">
              <SectionCard
                icon={<BriefcaseIcon className="h-4 w-4" />}
                eyebrow="Opportunity"
                title="Job overview"
              >
                <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                  <FactTile
                    icon={<LayersIcon className="h-4 w-4" />}
                    label={L.sector}
                    value={isMeaningful(o.industry) ? o.industry : undefined}
                  />
                  <FactTile
                    icon={<PinIcon className="h-4 w-4" />}
                    label={L.location}
                    value={isMeaningful(o.location) ? o.location : undefined}
                  />
                  <FactTile
                    icon={<GlobeIcon className="h-4 w-4" />}
                    label="Country"
                    value={isMeaningful(o.country) ? o.country : undefined}
                  />
                  <FactTile
                    icon={<TagIcon className="h-4 w-4" />}
                    label="Functional area"
                    value={isMeaningful(o.functionalArea) ? o.functionalArea : undefined}
                  />
                  <FactTile
                    icon={<BriefcaseIcon className="h-4 w-4" />}
                    label="Employment type"
                    value={o.employmentType ? titleCase(o.employmentType) : undefined}
                  />
                  <FactTile
                    icon={<BarsIcon className="h-4 w-4" />}
                    label={L.experience}
                    value={experience}
                  />
                </dl>
              </SectionCard>

              {locked ? (
                <SectionCard
                  icon={<LockIcon className="h-4 w-4" />}
                  eyebrow="Preview"
                  title="Full details are locked"
                >
                  <p className="text-sm leading-relaxed text-content-muted">
                    Qualification, other details and how to apply unlock with access to the relevant
                    Vault. What you see below is a masked preview — no original details are
                    revealed.
                  </p>
                  <div className="mt-6 grid gap-5 border-t border-line pt-6 sm:grid-cols-2">
                    <MaskedBlock label={L.qualification} value={o.lockedPreview?.qualification} />
                    <MaskedBlock label={L.otherDetails} value={o.lockedPreview?.otherDetails} />
                    <MaskedBlock
                      className="sm:col-span-2"
                      label={L.howToApply}
                      value={o.lockedPreview?.howToApply}
                    />
                  </div>
                </SectionCard>
              ) : (
                <>
                  {isMeaningful(o.qualification) && (
                    <SectionCard
                      icon={<AwardIcon className="h-4 w-4" />}
                      eyebrow="Requirement"
                      title={L.qualification}
                    >
                      <p className="whitespace-pre-line break-words text-sm leading-relaxed text-content">
                        {o.qualification}
                      </p>
                    </SectionCard>
                  )}

                  {isMeaningful(o.description) && (
                    <SectionCard
                      icon={<FileTextIcon className="h-4 w-4" />}
                      eyebrow="Details"
                      title={L.otherDetails}
                    >
                      <p className="whitespace-pre-line break-words text-sm leading-relaxed text-content">
                        {o.description}
                      </p>
                    </SectionCard>
                  )}
                </>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              {locked ? (
                <div className="relative overflow-hidden rounded-2xl border border-[#C8943E]/40 bg-gradient-to-br from-[#061B36] to-[#0a2547] p-6 text-white shadow-gold">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, rgba(200,148,62,0.3), transparent 70%)',
                    }}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full border border-[#C8943E]/20"
                  />
                  <div className="relative">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C8943E]/15 text-[#E3B968] ring-1 ring-inset ring-[#C8943E]/40">
                      <LockIcon className="h-5 w-5" />
                    </span>
                    <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#E3B968]">
                      Premium Access
                    </p>
                    <h2 className="mt-1 text-lg font-bold leading-snug">Unlock full job details</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      Get the complete picture for this role with an active Vault subscription.
                    </p>
                    <ul className="mt-4 space-y-2.5">
                      {[
                        'Full qualification & requirements',
                        'Complete other details',
                        'How to apply & direct contact',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm text-slate-200">
                          <span className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-400/15 p-1 text-emerald-300">
                            <CheckIcon className="h-3 w-3" />
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={unlockHref}
                      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E3B968] to-[#C8943E] px-6 py-3 text-base font-bold text-[#061B36] shadow-[0_14px_30px_-14px_rgba(200,148,62,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-14px_rgba(200,148,62,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8943E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#061B36]"
                    >
                      Unlock Full Access
                      <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-brand-400/40 bg-gradient-to-b from-surface to-surface-muted shadow-card dark:from-surface-elevated dark:to-surface">
                  <div className="relative border-b border-line bg-gradient-to-br from-brand-50 via-surface to-surface px-6 py-5 dark:from-brand-500/[0.08] dark:via-surface-elevated dark:to-surface-elevated">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#061B36] text-[#E3B968] shadow-sm">
                      <SendIcon className="h-5 w-5" />
                    </span>
                    <h2 className="mt-3 text-lg font-bold text-content">How to apply</h2>
                    <p className="mt-1 text-sm text-content-muted">
                      Apply directly to the hiring team.
                    </p>
                  </div>
                  <div className="px-6 py-5">
                    {applyEmail ? (
                      <>
                        <Button
                          href={buildApplyMailto(applyEmail, {
                            title: o.title,
                            company: o.company,
                          })}
                          size="lg"
                          className="w-full"
                        >
                          Apply now
                          <ArrowRightIcon className="h-4 w-4" />
                        </Button>
                        <div className="mt-4 rounded-xl border border-line bg-surface-muted/60 p-3.5 dark:bg-surface-muted/40">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-faint">
                            Contact
                          </p>
                          <a
                            href={`mailto:${applyEmail}`}
                            className="mt-1 block break-all text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                          >
                            {applyEmail}
                          </a>
                          <CopyEmailButton email={applyEmail} className="mt-3 w-full" />
                        </div>
                      </>
                    ) : (
                      <p className="text-sm leading-relaxed text-content-muted">
                        An application email is not available for this opportunity yet. Please check
                        back later or contact us for assistance.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <SectionCard
                icon={<InfoIcon className="h-4 w-4" />}
                eyebrow="Snapshot"
                title="At a glance"
              >
                <dl className="space-y-3.5">
                  <SnapshotRow label="Posted" value={formatDate(o.publishedDate)} />
                  <SnapshotRow label="Expires" value={formatDate(o.expiryDate)} />
                  <SnapshotRow
                    label="Reference"
                    value={isMeaningful(o.externalRef) ? o.externalRef : undefined}
                  />
                  <SnapshotRow label="Source" value={source} />
                  <SnapshotRow
                    label="Category"
                    value={o.category ? titleCase(o.category) : undefined}
                  />
                  <SnapshotRow
                    label={o.vaults && o.vaults.length > 1 ? 'Vaults' : 'Vault'}
                    value={o.vaults?.length ? o.vaults.map((v) => v.name).join(', ') : undefined}
                  />
                </dl>
              </SectionCard>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
