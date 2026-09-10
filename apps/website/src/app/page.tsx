'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchOpportunities, fetchVaults } from '@/lib/services';
import { Opportunity, PaginatedResult, Vault } from '@/lib/types';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui';
import { OpportunityCard, VaultCard, SearchIcon } from '@/components/cards';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/lib/auth';

/* ── Cluster of small inline icons used across the marketing sections ── */

function KeyIcon({ className = 'h-4 w-4' }: { className?: string }) {
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
        d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
      />
    </svg>
  );
}

function CompassIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 7.5l-3 6-6 3 3-6 6-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ShieldCheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
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
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function BadgeCheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
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
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function EyeIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function GlobeIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
      />
    </svg>
  );
}

function BoltIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </svg>
  );
}

function ArrowUpRightIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
      />
    </svg>
  );
}

function DotIcon({ className = 'h-2.5 w-2.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 10 10" fill="currentColor">
      <circle cx="5" cy="5" r="5" />
    </svg>
  );
}

function WhatsAppIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2.05 22l5.29-1.38a9.9 9.9 0 004.7 1.2h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.13-2.9-7C17.16 3.03 14.7 2 12.04 2zm0 18.12h-.01a8.2 8.2 0 01-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 01-1.26-4.37c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.82c0 4.54-3.69 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29z" />
    </svg>
  );
}

/* ── Product / dashboard mockup visual ─────────────────────────────── */

function DashboardWindow() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-blue-500/25 bg-[#0b1333] shadow-[0_20px_60px_-20px_rgba(0,143,239,0.45)]">
      {/* Window header */}
      <div className="flex items-center justify-between border-b border-blue-500/15 bg-[#0a1128] px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-blue-200/80">
          <DotIcon className="h-2 w-2 text-blue-400" />
          gravitas_intelligence_db
        </div>
        <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
          Vault Active
        </span>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        {/* Opportunity card 1 */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Regional Business Head</p>
              <p className="mt-0.5 text-xs text-blue-200/70">FinTech Unicorn • $15k USD tax-free</p>
            </div>
            <span className="mt-0.5 shrink-0 rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-300">
              Direct
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-200/80">
            <DotIcon className="h-1.5 w-1.5 text-emerald-400" />
            Dubai, UAE
          </div>
        </div>

        {/* Opportunity card 2 */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">VP of Engineering</p>
              <p className="mt-0.5 text-xs text-blue-200/70">E-Commerce Scaleup • ₹50–60L</p>
            </div>
            <span className="mt-0.5 shrink-0 rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-300">
              Direct
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-200/80">
            <DotIcon className="h-1.5 w-1.5 text-emerald-400" />
            Bangalore, India
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneCard() {
  return (
    <div className="w-full overflow-hidden rounded-3xl border border-blue-500/30 bg-[#08102a] shadow-[0_20px_50px_-15px_rgba(0,143,239,0.6)]">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-blue-500/15 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <DotIcon className="h-2 w-2 animate-pulse text-emerald-400" />
          GRAVITAS VIP EDGE
        </span>
        <span className="text-[10px] text-blue-200/60">Alert Sent Today</span>
      </div>

      {/* Notification card */}
      <div className="p-4">
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">
            <DotIcon className="h-1.5 w-1.5" /> Hiring Manager Alert
          </p>
          <p className="mt-2 text-xs leading-relaxed text-blue-100/90">
            Vetted CTO @ AI Healthtech. Looking for Lead Architect today. Direct WhatsApp contact:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-300">
              <WhatsAppIcon className="h-3 w-3" /> +9•• ••• ••42
            </span>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
          <p className="text-xs font-medium text-blue-100">
            &ldquo;Pre-Market Director of Product, Bangalore&rdquo;
          </p>
          <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-300">
            <BadgeCheckIcon className="h-3 w-3" /> VIP TOKEN VERIFIED
          </p>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-blue-200/60">
          <span className="flex -space-x-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-blue-500/40 bg-[#0b1333] text-[8px] font-bold text-blue-200">
              A
            </span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-blue-500/40 bg-[#0b1333] text-[8px] font-bold text-blue-200">
              R
            </span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-blue-500/40 bg-[#0b1333] text-[8px] font-bold text-blue-200">
              M
            </span>
          </span>
          Recruiters typing ...
        </div>
      </div>
    </div>
  );
}

/* ── Testimonial icons ────────────────────────────────────────────── */

function BadgeCheckSolidIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function QuoteMarkIcon({ className = 'h-16 w-16' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.6 5C6.5 6.4 4.5 9.3 4.5 13v3.7c0 .9.7 1.6 1.6 1.6h3.9c.9 0 1.6-.7 1.6-1.6V14c0-.9-.7-1.6-1.6-1.6h-1.7c.1-2 1.1-3.4 3-4.3L9.6 5zm9.4 0c-3.1 1.4-5.1 4.3-5.1 8v3.7c0 .9.7 1.6 1.6 1.6h3.9c.9 0 1.6-.7 1.6-1.6V14c0-.9-.7-1.6-1.6-1.6h-1.7c.1-2 1.1-3.4 3-4.3L19 5z" />
    </svg>
  );
}

function Avatar({ name, className = 'h-11 w-11 text-sm' }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-blue-500 font-bold text-white ring-2 ring-blue-400/30 ${className}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

/* ── Testimonial cards data ───────────────────────────────────────── */

const testimonials = [
  {
    badge: '45% Pay Jump',
    text: 'I found a Lead PM role 3 weeks before it was posted publicly on LinkedIn. Applied directly to the VP via the email provided in the Gravitas Vault, and was offered India-competitive premium equity + a 45% pay bump.',
    name: 'Simran Khurana',
    role: 'Lead Product Manager @ FinTech Growth Scale-Up',
  },
  {
    badge: 'Tax-Free UAE Relocation',
    text: 'Moving to Dubai was my goal. The Middle East Vault gave me the direct headhunter list and active pre-market roles. I contacted the talent partner directly and landed a key tax-free package without applying blindly on portals.',
    name: 'Adil Mahmood',
    role: 'Director of Infrastructure @ Enterprise SaaS (Dubai)',
  },
];

/* ── Advantage cards data ─────────────────────────────────────────── */

const advantages = [
  {
    label: 'ZERO NOISE, INFINITE SIGNALS',
    title: 'Curated Opportunities',
    description:
      'We filter out recruiter agency spam and standard reposts. You only see direct hiring mandates derived from venture pipelines and private investor boards.',
    highlight: 'Top 1% Companies Only',
    icon: 'compass',
  },
  {
    label: 'DIRECT WARM LEADS',
    title: 'Recruiter Visibility',
    description:
      'No black holes. Every listing provides verified names, real email routing, or LinkedIn handles of the hiring managers. Bypass recruiters and cold ATS submissions.',
    highlight: 'Direct Founder & VP access',
    icon: 'eye',
  },
  {
    label: 'PREMIUM INTERNATIONAL MOBILITY',
    title: 'India UAE Global',
    description:
      'Find premium corporate roles in Bangalore, luxury and executive positions in Dubai, or high-USD remote options with flexible global visa sponsorships.',
    highlight: 'Including TAX-FREE structures',
    icon: 'globe',
  },
  {
    label: 'FIRST-MOVER ADVANTAGE',
    title: 'Updated Daily',
    description:
      'The average job post gets 800 applications in 48 hours. By providing unreleased, unlisted roles in real-time, you apply 3 weeks before anyone else clicks apply.',
    highlight: '900+ active roles live',
    icon: 'bolt',
  },
];

function AdvantageIcon({ icon }: { icon: string }) {
  const cls = 'h-6 w-6';
  switch (icon) {
    case 'compass':
      return <CompassIcon className={cls} />;
    case 'eye':
      return <EyeIcon className={cls} />;
    case 'globe':
      return <GlobeIcon className={cls} />;
    case 'bolt':
      return <BoltIcon className={cls} />;
    default:
      return <CompassIcon className={cls} />;
  }
}

export default function Home() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([fetchOpportunities({ page: 1, limit: 6 }), fetchVaults()])
      .then(([opps, v]) => {
        setOpportunities((opps as PaginatedResult<Opportunity>).items || []);
        setVaults(v || []);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overflow-hidden">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — HERO                                              */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#050a1c]">
        {/* Background gradients */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,143,239,0.35),transparent_65%)] blur-2xl" />
          <div className="absolute -left-32 top-24 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute -right-32 top-48 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-28">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            {/* Live badge */}
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-blue-200">
              <DotIcon className="h-1.5 w-1.5 animate-pulse text-blue-300" />
              Now Live: Private Relocation &amp; UAE Pipelines
            </span>

            {/* Heading */}
            <h1 className="mt-7 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Access{' '}
              <span className="bg-gradient-to-r from-brand-400 via-blue-300 to-brand-400 bg-clip-text text-transparent">
                Hidden Hiring
              </span>{' '}
              Opportunities Before Everyone Else
            </h1>

            {/* Subhead */}
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-blue-100/70 sm:text-lg">
              Curated Opportunities Across India, UAE &amp; Global Markets With Recruiter and Hiring
              Manager Visibility. Bypassing Job Boards &amp; Cold Application Portals Entirely.
            </p>

            {/* CTA buttons */}
            <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
              <Link
                href={user ? '/dashboard/subscriptions' : '/register'}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-400 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-400 active:scale-[0.98] sm:w-auto"
              >
                <KeyIcon className="h-4 w-4" /> Unlock Full Access
              </Link>
              <Link
                href="/opportunities"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-400/40 bg-blue-500/10 px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400/60 active:scale-[0.98] sm:w-auto"
              >
                <CompassIcon className="h-4 w-4" /> Preview Opportunities
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-blue-100/60">
              <span className="inline-flex items-center gap-2">
                <ShieldCheckIcon className="h-4 w-4 text-emerald-400/90" />
                No Placement Commissions
              </span>
              <span className="inline-flex items-center gap-2">
                <BadgeCheckIcon className="h-4 w-4 text-emerald-400/90" />
                100% Vetted Contacts
              </span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* SECTION 2 — PRODUCT VISUAL (dashboard + phone)            */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="relative mt-16 lg:mt-20">
            {/* Glow behind dashboard */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-64 -translate-y-1/2 bg-[radial-gradient(circle_at_center,rgba(0,143,239,0.25),transparent_70%)] blur-2xl" />
            <div className="pointer-events-none absolute left-1/2 top-8 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

            <div className="relative mx-auto max-w-4xl">
              <div className="-mx-1">
                <DashboardWindow />
              </div>

              {/* Phone card overlapping */}
              <div className="absolute -bottom-24 right-0 hidden w-52 sm:block sm:-right-4 sm:w-64 lg:-right-16">
                <PhoneCard />
              </div>
            </div>

            {/* Spacer for the overlapping phone card */}
            <div className="h-0 sm:h-28" />
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* SECTION 3 — STATS                                           */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="mt-14 lg:mt-16">
            <div className="grid grid-cols-2 rounded-2xl border border-blue-500/20 bg-[#08102a]/80 py-6 backdrop-blur-sm sm:py-10">
              <div className="flex flex-col items-center gap-1 border-b border-r border-blue-500/15 px-3 py-3 sm:px-4 sm:py-4">
                <p className="bg-gradient-to-r from-brand-300 to-blue-300 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl lg:text-4xl">
                  1000+
                </p>
                <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-blue-200/60 sm:text-xs">
                  Opportunities Vetted
                </p>
              </div>
              <div className="flex flex-col items-center gap-1 border-b border-blue-500/15 px-3 py-3 sm:px-4 sm:py-4">
                <p className="whitespace-nowrap text-2xl font-extrabold text-white sm:text-3xl lg:text-4xl">
                  India Hub
                </p>
                <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-blue-200/60 sm:text-xs">
                  Bangalore &amp; Mumbai
                </p>
              </div>
              <div className="flex flex-col items-center gap-1 border-r border-blue-500/15 px-3 py-3 sm:px-4 sm:py-4">
                <p className="whitespace-nowrap text-2xl font-extrabold text-white sm:text-3xl lg:text-4xl">
                  UAE &amp; GCC
                </p>
                <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-blue-200/60 sm:text-xs">
                  Dubai &amp; Riyadh
                </p>
              </div>
              <div className="flex flex-col items-center gap-1 px-3 py-3 sm:px-4 sm:py-4">
                <p className="whitespace-nowrap bg-gradient-to-r from-brand-300 to-blue-300 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl lg:text-4xl">
                  Global Remote
                </p>
                <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-blue-200/60 sm:text-xs">
                  US/EU Compensation
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-blue-200">
                <DotIcon className="h-1.5 w-1.5 animate-pulse text-emerald-400" />
                Updated Daily
              </span>
              <p className="mt-2 text-xs text-blue-200/50">Latest update 4 mins ago</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* SECTION 4 & 5 — ADVANTAGE HEADER + CARDS (light)               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
              The Gravitas Advantage
            </span>
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[#0a1730] dark:text-white sm:text-4xl">
              Why Professionals Choose Gravitas Edge
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-500 dark:text-content-muted">
              Bypassing traditional recruitment networks to hand you unlisted leverage, higher
              compensation packaging, and direct connections.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {advantages.map((a) => (
              <div
                key={a.title}
                className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_12px_30px_-8px_rgba(0,143,239,0.25)] dark:border-line dark:bg-surface-elevated dark:hover:border-brand-500/40"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                  <AdvantageIcon icon={a.icon} />
                </div>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-300">
                  {a.label}
                </p>
                <h3 className="mt-2 flex items-center gap-1.5 text-xl font-bold tracking-tight text-[#0a1730] dark:text-white">
                  {a.title}
                  <ArrowUpRightIcon className="h-5 w-5 text-brand-500/70" />
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500 dark:text-content-muted">
                  {a.description}
                </p>
                <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-line">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <p className="text-sm font-semibold text-[#0a1730] dark:text-white">
                    {a.highlight}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* Existing data-driven sections (kept & working)                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="border-t border-line bg-surface dark:bg-surface-elevated/50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-widest text-brand-600 uppercase dark:text-brand-400">
                Fresh this week
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-content">
                Latest Opportunities
              </h2>
              <p className="mt-1 text-sm text-content-muted">Fresh roles added by our partners.</p>
            </div>
            <Link
              href="/opportunities"
              className="whitespace-nowrap text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : opportunities.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface dark:bg-surface-elevated">
              <EmptyState
                icon={<SearchIcon className="h-6 w-6" />}
                title="No opportunities yet"
                description="Check back soon — new opportunities are added regularly."
              />
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {opportunities.map((o) => (
                <OpportunityCard key={o.id} opportunity={o} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Vaults */}
      <section className="border-t border-line bg-surface dark:bg-surface-elevated/50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-widest text-brand-600 uppercase dark:text-brand-400">
                Members only
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-content">
                Content Vaults
              </h2>
              <p className="mt-1 text-sm text-content-muted">
                Members-only vaults of referrals and premium roles.
              </p>
            </div>
            {user && (
              <Link
                href="/dashboard/vaults"
                className="whitespace-nowrap text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                My vaults →
              </Link>
            )}
          </div>

          {loading ? (
            <div className="grid gap-5 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : vaults.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface dark:bg-surface-elevated">
              <EmptyState
                title="No vaults yet"
                description="Vaults will appear here as they are published."
              />
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {vaults.map((v) => (
                <VaultCard key={v.id} vault={v} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TESTIMONIALS — Member Results (last section)                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0a1128] via-[#070d24] to-[#060b1f]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,143,239,0.25),transparent_70%)] blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-blue-200">
              Member Results
            </span>
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Trusted by professionals who moved faster
            </h2>
            <p className="mt-4 text-base leading-relaxed text-blue-100/70">
              Real outcomes from subscribers who used the direct hiring access before the roles hit
              the open market.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="relative flex flex-col overflow-hidden rounded-3xl border border-blue-400/20 bg-blue-500/[0.07] p-7 shadow-[0_20px_50px_-20px_rgba(0,143,239,0.45)] sm:p-8"
              >
                {/* Large subtle quotation mark, top-right */}
                <QuoteMarkIcon className="pointer-events-none absolute -top-2 right-4 h-20 w-20 text-blue-400/10" />

                {/* Badge */}
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-blue-300/30 bg-blue-300/15 px-3 py-1 text-xs font-semibold text-blue-100">
                  <DotIcon className="h-1.5 w-1.5 text-emerald-400" />
                  {t.badge}
                </span>

                <blockquote className="mt-5 flex-1 text-base italic leading-relaxed text-blue-50/90">
                  &ldquo;{t.text}&rdquo;
                </blockquote>

                {/* Divider + author */}
                <div className="mt-6 border-t border-blue-400/15 pt-5">
                  <div className="flex items-center gap-3">
                    <Avatar name={t.name} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-semibold text-white">
                        {t.name}
                        <BadgeCheckSolidIcon className="h-4 w-4 shrink-0 text-blue-300" />
                      </p>
                      <p className="mt-0.5 text-sm text-blue-200/70">{t.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
