'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { LoadingSpinner } from '@/components/ui';

/**
 * Login-only route guard. Dashboard access is intentionally NOT gated on
 * holding a plan: Vault subscribers, RVA subscribers, both, and neither can all
 * reach the dashboard — paid content stays locked in place according to its
 * own entitlement rules.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading your dashboard…" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
