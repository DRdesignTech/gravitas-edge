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
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-transparent dark:from-brand-950/40" />
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Premium referrals, unlocked
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-content sm:text-5xl lg:text-6xl">
            Find your next career{' '}
            <span className="bg-gradient-to-r from-brand-600 to-violet-600 bg-clip-text text-transparent dark:from-brand-400 dark:to-violet-400">
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
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-line bg-surface p-6 shadow-card dark:bg-surface-elevated"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-xl dark:bg-brand-950">
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
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-content">Latest Opportunities</h2>
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
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-content">Content Vaults</h2>
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
