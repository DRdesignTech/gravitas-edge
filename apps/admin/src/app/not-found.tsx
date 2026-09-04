'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4 text-center dark:bg-surface">
      <span className="text-6xl font-black tracking-tight text-brand-600 dark:text-brand-400">
        404
      </span>
      <h1 className="mt-4 text-xl font-bold text-content">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-content-muted">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" className="mt-6">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}
