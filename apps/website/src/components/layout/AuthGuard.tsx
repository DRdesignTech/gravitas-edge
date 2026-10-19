'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { hasActiveSubscription } from '@/lib/access-routing';
import { LoadingSpinner } from '@/components/ui';

/**
 * Route guard for protected dashboard routes.
 * Requires the user to be logged in AND have at least one active subscription (OV or RVA).
 * Users without active subscriptions are redirected to /plans.
 * Loading/error states are handled gracefully to prevent redirect loops.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, hasVaultAccess, hasRvaAccess } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    // Check subscription status only after user is loaded
    const hasActive = hasActiveSubscription(hasVaultAccess, hasRvaAccess);
    if (hasActive === false) {
      router.replace('/plans');
    }
    // If hasActive is null (loading/error) or true, allow access
  }, [loading, user, hasVaultAccess, hasRvaAccess, router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading your dashboard…" />
      </div>
    );
  }

  if (!user) return null;

  // If subscription check is still resolving (null), show loading to avoid flash
  const hasActive = hasActiveSubscription(hasVaultAccess, hasRvaAccess);
  if (hasActive === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Verifying subscription…" />
      </div>
    );
  }

  // If no active subscription, the useEffect will redirect, but we return null
  // to avoid rendering protected content during the redirect
  if (hasActive === false) return null;

  return <>{children}</>;
}
