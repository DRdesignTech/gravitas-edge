'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button, Card, Input, Alert, useToast } from '@/components/ui';
import BrandLogo, { BRAND_NAME } from '@/components/brand/BrandLogo';
import SessionExpiredNotifier from '@/components/layout/SessionExpiredNotifier';
import { parseApiError } from '@/lib/errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Copy shown when the entered email belongs to no account. */
const ACCOUNT_NOT_FOUND_CODE = 'ACCOUNT_NOT_FOUND';

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ReturnType<typeof parseApiError> | null>(null);
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const next: { email?: string; password?: string } = {};
    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      next.email = 'Please enter a valid email address.';
    }
    if (!password) next.password = 'Please enter your password.';
    setFieldError(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      showToast('Welcome back!', 'success');
    } catch (err) {
      const info = parseApiError(err);
      setError(info);
      showToast(info.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showCreateAccountCta = error?.code === ACCOUNT_NOT_FOUND_CODE;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-4 sm:py-6">
      <SessionExpiredNotifier />
      <div className="w-full max-w-[30rem]">
        <Card className="p-2">
          <div className="mb-2 text-center">
            <BrandLogo className="mx-auto h-16 w-auto" showName={false} />
            <h1 className="mt-2 text-xl font-bold tracking-tight text-content sm:text-2xl">
              Sign in to {BRAND_NAME}
            </h1>
            <p className="mt-1.5 text-base font-semibold text-content-muted">Welcome back.</p>
          </div>

          {error && (
            <Alert variant="error" className="mb-4">
              <div className="space-y-3">
                <p>{error.message}</p>
                {showCreateAccountCta && (
                  <div>
                    <Link
                      href="/register"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.98]"
                    >
                      Create an account
                    </Link>
                  </div>
                )}
              </div>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldError.email) setFieldError((f) => ({ ...f, email: undefined }));
              }}
              placeholder="you@example.com"
              error={fieldError.email}
              required
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldError.password) setFieldError((f) => ({ ...f, password: undefined }));
              }}
              placeholder="••••••••"
              error={fieldError.password}
              required
            />
            <Button type="submit" className="w-full" loading={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-content-muted">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              Create one
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
