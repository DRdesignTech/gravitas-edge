'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchVaults } from '@/lib/services';
import { Vault } from '@/lib/types';
import { Button, Card, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { VaultCard, VaultIcon } from '@/components/cards';
import { getErrorMessage } from '@/lib/errors';

export default function VaultsPage() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    fetchVaults()
      .then(setVaults)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="relative">
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-transparent dark:from-brand-950/40" />
        <div className="pointer-events-none absolute -top-24 right-0 -z-10 h-72 w-72 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-500/10" />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Enter any vault
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-content sm:text-4xl">
            Content Vaults
          </h1>
          <p className="mt-2 max-w-2xl text-content-muted">
            Browse the jobs inside every vault for free. Subscribe to a vault to unlock full job
            details and direct hiring contacts.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : error ? (
          <Card>
            <ErrorState message={error} onRetry={load} />
          </Card>
        ) : vaults.length === 0 ? (
          <Card>
            <EmptyState
              icon={<VaultIcon className="h-6 w-6" />}
              title="No vaults yet"
              description="Vaults will appear here as they are published."
            />
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {vaults.map((v) => (
              <VaultCard key={v.id} vault={v} />
            ))}
          </div>
        )}

        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-brand-200 bg-brand-50/60 px-6 py-8 text-center dark:border-brand-800 dark:bg-brand-950/40 sm:flex-row sm:text-left">
          <div>
            <h2 className="text-lg font-bold text-content">Ready to see what&apos;s inside?</h2>
            <p className="mt-1 text-sm text-content-muted">
              Unlock full job details, descriptions and direct hiring contacts with a subscription.
            </p>
          </div>
          <Link href="/plans" className="shrink-0">
            <Button>Unlock Full Access</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
