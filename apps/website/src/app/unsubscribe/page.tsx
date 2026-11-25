'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import BrandLogo from '@/components/brand/BrandLogo';
import { Alert, Button, Input, useToast } from '@/components/ui';
import { parseApiError } from '@/lib/errors';
import { subscribeNewsletter, unsubscribeNewsletter } from '@/lib/services';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const token = searchParams.get('token')?.trim() || '';
  const queryEmail = searchParams.get('email')?.trim().toLowerCase() || '';

  const [emailInput, setEmailInput] = useState(queryEmail);
  const [resolvedEmail, setResolvedEmail] = useState(queryEmail);
  const [phase, setPhase] = useState<'confirm' | 'unsubscribed' | 'resubscribed'>('confirm');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleUnsubscribe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setFieldError(undefined);

    const normalizedEmail = emailInput.trim().toLowerCase();
    if (!token && (!normalizedEmail || !EMAIL_RE.test(normalizedEmail))) {
      setFieldError('Please enter a valid subscribed email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await unsubscribeNewsletter({
        token: token || undefined,
        email: normalizedEmail || undefined,
      });
      setResolvedEmail(res.email || normalizedEmail);
      setEmailInput(res.email || normalizedEmail);
      setStatusMessage(res.message);
      setPhase('unsubscribed');
      showToast(res.message, 'success');
    } catch (err) {
      const info = parseApiError(err);
      setError(info.message);
      showToast(info.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResubscribe = async () => {
    const targetEmail = (resolvedEmail || emailInput).trim().toLowerCase();
    if (!targetEmail || !EMAIL_RE.test(targetEmail)) {
      setError('A valid email address is required to re-subscribe.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await subscribeNewsletter(targetEmail);
      setStatusMessage(res.message);
      setPhase('resubscribed');
      showToast(res.message, 'success');
    } catch (err) {
      const info = parseApiError(err);
      setError(info.message);
      showToast(info.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -left-24 top-[-12%] h-80 w-80 rounded-full bg-[#C8943E]/10 blur-3xl" />
        <div className="absolute bottom-[-16%] right-[-12%] h-96 w-96 rounded-full bg-[#061B36]/10 blur-3xl dark:bg-[#C8943E]/10" />
      </div>

      <div className="relative z-10 w-full max-w-[30rem]">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-premium sm:p-8 dark:bg-surface-elevated">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#C8943E] to-transparent"
          />

          <div className="text-center">
            <BrandLogo className="mx-auto h-14 w-auto" showName={false} />
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#C8943E]">
              Newsletter Preferences
            </p>
            <h1 className="mt-1.5 font-serif-heading text-2xl font-bold tracking-tight text-[#061B36] dark:text-content">
              {phase === 'unsubscribed'
                ? 'You Have Been Unsubscribed'
                : phase === 'resubscribed'
                  ? 'Welcome Back!'
                  : 'Unsubscribe from Newsletter'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-content-muted">
              {phase === 'confirm' && token && (
                <>
                  Click the button below to stop receiving newsletter updates
                  {queryEmail ? (
                    <>
                      {' '}
                      for <strong className="font-semibold text-content">{queryEmail}</strong>
                    </>
                  ) : null}
                  .
                </>
              )}
              {phase === 'confirm' && !token && (
                <>
                  Enter the email address you used to subscribe and confirm below to opt out of
                  future newsletter emails.
                </>
              )}
              {phase === 'unsubscribed' && (
                <>
                  {statusMessage ||
                    'You will no longer receive newsletter broadcasts from Gravitas Edge Consulting.'}
                  {resolvedEmail ? (
                    <span className="mt-1 block text-xs text-content-muted">
                      Email: <strong className="font-semibold text-content">{resolvedEmail}</strong>
                    </span>
                  ) : null}
                </>
              )}
              {phase === 'resubscribed' && (
                <>
                  {statusMessage ||
                    'Your newsletter subscription has been reactivated. Check your inbox for our welcome email.'}
                </>
              )}
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mt-5">
              <p>{error}</p>
            </Alert>
          )}

          {phase === 'confirm' && (
            <form onSubmit={handleUnsubscribe} className="mt-6 space-y-4" noValidate>
              {!token && (
                <Input
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (fieldError) setFieldError(undefined);
                  }}
                  placeholder="you@example.com"
                  error={fieldError}
                  required
                />
              )}

              <Button type="submit" loading={loading} className="w-full">
                {loading ? 'Processing…' : 'Confirm Unsubscribe'}
              </Button>
            </form>
          )}

          {phase === 'unsubscribed' && (
            <div className="mt-6 space-y-3">
              <Alert variant="success">
                <p>Your newsletter preferences have been updated.</p>
              </Alert>

              {(resolvedEmail || emailInput) && (
                <Button
                  type="button"
                  variant="secondary"
                  loading={loading}
                  onClick={handleResubscribe}
                  className="w-full"
                >
                  {loading ? 'Re-subscribing…' : 'Changed your mind? Re-subscribe'}
                </Button>
              )}
            </div>
          )}

          {phase === 'resubscribed' && (
            <div className="mt-6">
              <Alert variant="success">
                <p>
                  You are subscribed again
                  {resolvedEmail ? (
                    <>
                      {' '}
                      as <strong>{resolvedEmail}</strong>
                    </>
                  ) : null}
                  .
                </p>
              </Alert>
            </div>
          )}

          <div className="mt-7 border-t border-line pt-5">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-content-muted">
              Explore Gravitas Edge
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
              <Link
                href="/plans"
                className="rounded-full border border-line bg-surface-muted px-3.5 py-1.5 text-content transition-colors hover:border-[#C8943E] hover:text-[#C8943E]"
              >
                Plans
              </Link>
              <Link
                href="/opportunities"
                className="rounded-full border border-line bg-surface-muted px-3.5 py-1.5 text-content transition-colors hover:border-[#C8943E] hover:text-[#C8943E]"
              >
                Opportunities
              </Link>
              <Link
                href="/vaults"
                className="rounded-full border border-line bg-surface-muted px-3.5 py-1.5 text-content transition-colors hover:border-[#C8943E] hover:text-[#C8943E]"
              >
                Vaults
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-content-muted">
              <Link href="/privacy-policy" className="hover:text-content hover:underline">
                User Policy
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/terms-and-conditions" className="hover:text-content hover:underline">
                Terms &amp; Conditions
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/" className="hover:text-content hover:underline">
                Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
          <div className="w-full max-w-[30rem] rounded-3xl border border-line bg-surface p-8 text-center shadow-premium">
            <p className="text-sm text-content-muted">Loading newsletter preferences…</p>
          </div>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
