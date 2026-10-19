'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useToast } from '@/components/ui';
import { Button, Input, Alert } from '@/components/ui';
import BrandLogo from '@/components/brand/BrandLogo';
import { apiFetch } from '@/lib/api';
import { parseApiError } from '@/lib/errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<ReturnType<typeof parseApiError> | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(undefined);
    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setFieldError('Please enter a valid email address.');
      return;
    }

    const submittedEmailValue = email.trim();
    setLoading(true);
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: submittedEmailValue }),
      });
      setSubmittedEmail(submittedEmailValue);
      setSubmitted(true);
      showToast('Password reset email sent successfully. Please check your inbox.', 'success');
    } catch (err) {
      const info = parseApiError(err);
      setError(info);
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
              {submitted ? 'Check Your Email' : 'Reset Your Password'}
            </h1>
            <p className="mt-1.5 text-sm text-content-muted">
              {submitted ? (
                <>
                  We've sent a password reset link to{' '}
                  <strong className="font-semibold">{submittedEmail.toLowerCase()}</strong>{' '}
                  . Please check your inbox.
                </>
              ) : (
                'Enter your email and we\'ll send you a link to reset your password.'
              )}
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mt-5">
              <p>{error.message}</p>
            </Alert>
          )}

          {!submitted && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError(undefined);
                }}
                placeholder="you@example.com"
                error={fieldError}
                required
              />

              <Button type="submit" loading={loading} className="w-full">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-content-muted">
            Remember your password?{' '}
            <Link
              href="/login"
              className="font-semibold text-[#C8943E] hover:text-[#8a6524] dark:hover:text-[#E3B968]"
            >
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}