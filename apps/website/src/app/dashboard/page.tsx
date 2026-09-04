'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchMyActiveSubscriptions, fetchVaults } from '@/lib/services';
import { Subscription, Vault } from '@/lib/types';
import {
  Badge,
  Card,
  Button,
  Skeleton,
  ErrorState,
  EmptyState,
  PageHeader,
  StatusBadge,
} from '@/components/ui';
import { VaultIcon, BriefcaseIcon, LayersIcon } from '@/components/cards';
import { formatDate, formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

export default function Dashboard() {
  const { user } = useAuth();
  const [activeSubs, setActiveSubs] = useState<Subscription[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([fetchMyActiveSubscriptions(), fetchVaults()])
      .then(([subs, v]) => {
        setActiveSubs(subs || []);
        setVaults(v || []);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unlockedCount = vaults.filter((v) => !v.locked).length;

  return (
    <div>
      <PageHeader
        title={`Welcome${user?.profile?.fullName ? `, ${user.profile.fullName.split(' ')[0]}` : ''}`}
        subtitle="Here's what your membership looks like."
        actions={
          user?.status === 'ACTIVE' ? (
            <StatusBadge status="ACTIVE" />
          ) : (
            <StatusBadge status={user?.status} />
          )
        }
      />

      {loading ? (
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : error ? (
        <Card className="mt-6">
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Active subscriptions"
            value={activeSubs.length}
            icon={<LayersIcon className="h-5 w-5" />}
          />
          <StatCard
            label="Vaults unlocked"
            value={`${unlockedCount}/${vaults.length}`}
            icon={<VaultIcon className="h-5 w-5" />}
          />
          <StatCard
            label="Account status"
            value={titleCase(user?.status)}
            accent={user?.status === 'ACTIVE' ? 'emerald' : 'red'}
            icon={<BriefcaseIcon className="h-5 w-5" />}
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Active subscription */}
        <Card
          title="Active subscription"
          className="lg:col-span-3"
          action={<Badge variant="info">{activeSubs.length} active</Badge>}
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : error ? (
            <ErrorState title="Couldn't load subscriptions" message={error} onRetry={load} />
          ) : activeSubs.length === 0 ? (
            <div className="py-4">
              <EmptyState
                icon={<LayersIcon className="h-6 w-6" />}
                title="You don't have an active subscription yet"
                description="Unlock premium vaults and opportunities to get the most out of your account."
                action={
                  <Link href="/plans">
                    <Button>View plans</Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {activeSubs.map((s) => (
                <div key={s.id} className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-content">{s.plan?.name || 'Subscription'}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-1 text-sm text-content-muted">
                    {formatDate(s.startDate)} → {formatDate(s.endDate)}
                    {s.plan?.price !== undefined && (
                      <span className="ml-2 text-content">
                        {formatMoney(s.plan.price, s.plan.currency || 'INR')}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick actions */}
        <Card title="Quick actions" className="lg:col-span-2">
          <div className="flex flex-col gap-2.5">
            <Link href="/opportunities">
              <Button variant="outline" className="w-full justify-start">
                Browse opportunities
              </Button>
            </Link>
            <Link href="/dashboard/vaults">
              <Button variant="outline" className="w-full justify-start">
                View my vaults
              </Button>
            </Link>
            <Link href="/dashboard/profile">
              <Button variant="outline" className="w-full justify-start">
                Edit my profile
              </Button>
            </Link>
            <Link href="/plans">
              <Button variant="ghost" className="w-full justify-start">
                Explore plans →
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent = 'brand',
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent?: 'brand' | 'emerald' | 'red';
}) {
  const accents: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  };
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card dark:bg-surface-elevated">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${accents[accent]}`}
        >
          {icon}
        </span>
        <p className="text-sm font-medium text-content-muted">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-content">{value}</p>
    </div>
  );
}

function titleCase(value?: string | null) {
  if (!value) return '—';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
