'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchVaults } from '@/lib/services';
import { Vault } from '@/lib/types';
import { Button, Card, EmptyState, Skeleton, ErrorState, PageHeader } from '@/components/ui';
import { VaultCard } from '@/components/cards';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlocked = vaults.filter((v) => !v.locked).length;

  return (
    <div>
      <PageHeader
        title="My Vaults"
        subtitle={loading ? 'Loading…' : `${unlocked} of ${vaults.length} vaults unlocked`}
        actions={
          unlocked !== vaults.length ? (
            <Link href="/plans">
              <Button size="sm">Unlock more</Button>
            </Link>
          ) : undefined
        }
      />

      {loading ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : error ? (
        <Card className="mt-6">
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : vaults.length === 0 ? (
        <Card className="mt-6">
          <EmptyState
            title="No vaults available"
            description="Vaults will appear here when published."
          />
        </Card>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {vaults.map((v) => (
            <VaultCard key={v.id} vault={v} />
          ))}
        </div>
      )}
    </div>
  );
}
