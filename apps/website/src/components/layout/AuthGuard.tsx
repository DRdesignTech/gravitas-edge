'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { LoadingSpinner } from '@/components/ui';

export default function AuthGuard({
  children,
  requireAccess = false,
}: {
  children: React.ReactNode;
  /** When true, users without an active Vault subscription are sent to /plans. */
  requireAccess?: boolean;
}) {
  const { user, loading, hasVaultAccess } = useAuth();
  const router = useRouter();

  const needsPlan = requireAccess && hasVaultAccess === false;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (needsPlan) {
      router.replace('/plans');
    }
  }, [loading, user, needsPlan, router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Loading your dashboard…" />
      </div>
    );
  }

  if (!user) return null;

  if (needsPlan) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner label="Redirecting you to plans…" />
      </div>
    );
  }

  return <>{children}</>;
}
