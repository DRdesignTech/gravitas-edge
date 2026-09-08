'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchOpportunities, fetchVaults } from '@/lib/services';
import { Opportunity, PaginatedResult, Vault } from '@/lib/types';
import { Button, Skeleton, ErrorState, EmptyState } from '@/components/ui';
import { OpportunityCard, VaultCard, SearchIcon } from '@/components/cards';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/lib/auth';

const features = [
  {
    title: 'Curated opportunities',
    desc: 'Hand-picked roles across India and the globe, reviewed for quality and relevance.',
    icon: '🎯',
  },
  {
    title: 'Premium referral vaults',
    desc: 'Unlock exclusive, members-only vaults packed with referral pathways and interviews.',
    icon: '🔐',
  },
  {
    title: 'Stay organized',
    desc: 'Track your subscriptions, saved access and career progress from one clean dashboard.',
    icon: '🗂️',
  },
  {
    title: 'Trusted & transparent',
    desc: 'Clear pricing, no spam and honest listings so you can focus on your next move.',
    icon: '🛡️',
  },
];

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
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
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 via-surface to-surface dark:from-brand-950/40 dark:via-surface dark:to-surface" />
        <div className="pointer-events-none absolute -top-32 left-1/4 -z-10 h-80 w-80 rounded-full bg-brand-300/25 blur-3xl dark:bg-brand-500/10" />
        <div className="pointer-events-none absolute -top-24 right-10 -z-10 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl dark:bg-brand-400/10" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,transparent_0%,rgb(var(--color-surface))_100%)]" />
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Premium referrals, unlocked
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-content sm:text-5xl lg:text-6xl">
            Find your next career{' '}
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent dark:from-brand-400 dark:to-brand-300">
              opportunity
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-content-muted">
            Discover curated opportunities across India and the globe. Unlock premium referral
            vaults and never miss a great match again.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/opportunities">
              <Button size="lg">
                <SearchIcon className="h-4 w-4" /> Browse Opportunities
              </Button>
            </Link>
            <Link href={user ? '/dashboard/subscriptions' : '/plans'}>
              <Button size="lg" variant="outline">
                {user ? 'Manage Subscriptions' : 'View Plans'}
              </Button>
            </Link>
          </div>
          <div className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-content-muted">
            <span className="inline-flex items-center gap-2">
              <CheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              India + global roles
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Free &amp; premium listings
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Members-only referral vaults
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold tracking-widest text-brand-600 uppercase dark:text-brand-400">
            Why Gravitas Edge
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-content sm:text-3xl">
            Everything you need to move forward
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-line bg-surface p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover dark:bg-surface-elevated dark:hover:border-brand-500/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-2xl transition-transform duration-200 group-hover:scale-105 dark:border-brand-800 dark:bg-brand-950">
                {f.icon}
              </div>
              <h3 className="mt-4 font-semibold text-content">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-content-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest opportunities */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
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
      </section>

      {/* Vaults */}
      <section className="border-t border-line bg-surface dark:bg-surface-elevated/50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
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
    </div>
  );
}
