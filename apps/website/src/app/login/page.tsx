'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button, Input, Alert, useToast } from '@/components/ui';
import BrandLogo from '@/components/brand/BrandLogo';
import SessionExpiredNotifier from '@/components/layout/SessionExpiredNotifier';
import { parseApiError } from '@/lib/errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Copy shown when the entered email belongs to no account. */
const ACCOUNT_NOT_FOUND_CODE = 'ACCOUNT_NOT_FOUND';

function EyeIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

function EyeOffIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M10.58 10.58a2.75 2.75 0 003.84 3.84" />
      <path d="M9.36 5.43A9.62 9.62 0 0112 5.25c6 0 9.75 6.75 9.75 6.75a17.6 17.6 0 01-3.19 4.03M6.11 6.11A17.7 17.7 0 002.25 12s3.75 6.75 9.75 6.75c1.2 0 2.3-.27 3.29-.69" />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-8">
      <SessionExpiredNotifier />

      {/* Soft brand glow behind the card */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -left-24 top-[-12%] h-80 w-80 rounded-full bg-[#C8943E]/10 blur-3xl" />
        <div className="absolute bottom-[-16%] right-[-12%] h-96 w-96 rounded-full bg-[#061B36]/10 blur-3xl dark:bg-[#C8943E]/10" />
      </div>

      <div className="relative z-10 w-full max-w-[26rem]">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-premium sm:p-7 dark:bg-surface-elevated">
          {/* Gold hairline accent */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#C8943E] to-transparent"
          />
          <div className="text-center">
            <BrandLogo className="mx-auto h-14 w-auto" showName={false} />
            <h1 className="mt-4 font-serif-heading text-2xl font-bold tracking-tight text-[#061B36] dark:text-content">
              Welcome Back
            </h1>
            <p className="mt-1.5 text-sm text-content-muted">
              Access your subscription and opportunities.
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mt-5">
              <div className="space-y-3">
                <p>{error.message}</p>
                {showCreateAccountCta && (
                  <div>
                    <Link
                      href="/register"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#061B36] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-[#071A35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.98]"
                    >
                      Create an account
                    </Link>
                  </div>
                )}
              </div>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <Input
              label="Email address"
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
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldError.password) setFieldError((f) => ({ ...f, password: undefined }));
              }}
              placeholder="••••••••"
              error={fieldError.password}
              required
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-content-faint transition-colors hover:bg-surface-muted hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8943E]"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-[#C8943E] hover:text-[#8a6524] dark:hover:text-[#E3B968]"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full bg-gradient-to-r from-[#E3B968] via-[#C8943E] to-[#B8832F] font-semibold text-[#061B36] shadow-lg shadow-[#C8943E]/30 hover:shadow-xl hover:shadow-[#C8943E]/40 dark:text-[#061B36]"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-content-muted">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-semibold text-[#C8943E] hover:text-[#8a6524] dark:hover:text-[#E3B968]"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
