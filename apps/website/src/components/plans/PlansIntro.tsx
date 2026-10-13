'use client';

import { LockIcon } from '@/components/ui';
import { GlobeIcon, ShieldCheckIcon } from '@/components/cards';

const TRUST_INDICATORS = [
  { icon: <ShieldCheckIcon className="h-4 w-4" />, label: 'Trusted by Professionals' },
  { icon: <GlobeIcon className="h-4 w-4" />, label: 'Global Opportunities' },
  { icon: <LockIcon className="h-4 w-4" />, label: 'Secure Payments' },
];

/**
 * Shared pricing-page introduction used by both the standalone Plans page and
 * the home-page #plans section. Visual decoration is pure CSS (radial glows,
 * gradient text) — no images or external assets.
 */
export default function PlansIntro({ as = 'h2' }: { as?: 'h1' | 'h2' }) {
  const Heading = as;

  return (
    <header className="relative mx-auto max-w-3xl text-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-3.5rem] -z-10 h-64 w-[44rem] max-w-full -translate-x-1/2"
        style={{
          background: 'radial-gradient(50% 55% at 50% 35%, rgba(200,148,62,0.16), transparent 72%)',
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-3.5rem] -z-10 h-64 w-[44rem] max-w-full -translate-x-1/2 opacity-70 dark:opacity-40"
        style={{
          backgroundImage: 'radial-gradient(rgba(200,148,62,0.28) 1px, transparent 1.5px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(55% 65% at 50% 30%, #061B36, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(55% 65% at 50% 30%, #061B36, transparent 75%)',
        }}
      />

      <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-50/70 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600 shadow-sm backdrop-blur-sm dark:border-brand-400/25 dark:bg-brand-950/60 dark:text-brand-300">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
        Plans / Pricing
      </span>

      <Heading className="mt-5 text-3xl font-extrabold tracking-tight text-content sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
        Choose Your <span className="text-gold-gradient">Opportunity Vault</span>
      </Heading>

      <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-content-muted">
        Access curated opportunities across global markets with flexible plans designed for your
        goals.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
        {TRUST_INDICATORS.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-[13px] font-medium text-content-muted shadow-sm backdrop-blur-sm dark:bg-surface-elevated/60"
          >
            <span className="shrink-0 text-brand-500 dark:text-brand-300">{item.icon}</span>
            {item.label}
          </span>
        ))}
      </div>
    </header>
  );
}
