'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui';
import { Button, Input, Alert } from '@/components/ui';
import BrandLogo from '@/components/brand/BrandLogo';
import { apiFetch } from '@/lib/api';
import { parseApiError } from '@/lib/errors';

interface ResetPasswordClientProps {
  token?: string;
  email?: string;
}

export default function ResetPasswordClient({ token, email }: ResetPasswordClientProps) {
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<ReturnType<typeof parseApiError> | null>(null);
  const [fieldError, setFieldError] = useState<{ password?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setInvalidToken(true);
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError({});

    const next: { password?: string; confirmPassword?: string } = {};
    if (!password) next.password = 'Please enter a new password.';
    else if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (!confirmPassword) next.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.';
    setFieldError(next);
    if (Object.keys(next).length) return;

    if (!token) return;

    setLoading(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setSubmitted(true);
      showToast('Password has been reset successfully. You can now log in.', 'success');
    } catch (err) {
      const info = parseApiError(err);
      setError(info);
      setFieldError({ password: info.message });
      showToast(info.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-8">
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
              {submitted ? 'Password Reset' : invalidToken ? 'Invalid Link' : 'Set New Password'}
            </h1>
            <p className="mt-1.5 text-sm text-content-muted">
              {submitted
                ? 'Your password has been updated. You can now sign in.'
                : invalidToken
                ? 'This reset link is invalid or has expired. Please request a new one.'
                : `Resetting password for ${email}`}
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mt-5">
              <p>{error.message}</p>
            </Alert>
          )}

          {!submitted && !invalidToken && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <Input
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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
                    {showPassword ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18" /><path d="M10.58 10.58a2.75 2.75 0 003.84 3.84" /><path d="M9.36 5.43A9.62 9.62 0 0112 5.25c6 0 9.75 6.75 9.75 6.75a17.6 17.6 0 01-3.19 4.03M6.11 6.11A17.7 17.7 0 002.25 12s3.75 6.75 9.75 6.75c1.2 0 2.3-.27 3.29-.69" /></svg>
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z" /><circle cx="12" cy="12" r="2.75" /></svg>
                    )}
                  </button>
                }
              />
              <Input
                label="Confirm New Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldError.confirmPassword) setFieldError((f) => ({ ...f, confirmPassword: undefined }));
                }}
                placeholder="••••••••"
                error={fieldError.confirmPassword}
                required
              />

              <Button type="submit" loading={loading} className="w-full">
                {loading ? 'Resetting…' : 'Reset Password'}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-content-muted">
            {submitted ? (
              <>
                <Link
                  href="/login"
                  className="font-semibold text-[#C8943E] hover:text-[#8a6524] dark:hover:text-[#E3B968]"
                >
                  Sign In
                </Link>
              </>
            ) : invalidToken ? (
              <>
                <Link
                  href="/forgot-password"
                  className="font-semibold text-[#C8943E] hover:text-[#8a6524] dark:hover:text-[#E3B968]"
                >
                  Request a new link
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="font-semibold text-[#C8943E] hover:text-[#8a6524] dark:hover:text-[#E3B968]"
                >
                  Back to Sign In
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}