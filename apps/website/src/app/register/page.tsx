'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useGuestResume } from '@/lib/guest-resume';
import { linkGuestResume } from '@/lib/services';
import { Button, Card, Input, Alert, useToast } from '@/components/ui';
import BrandLogo, { BRAND_NAME } from '@/components/brand/BrandLogo';
import { getErrorMessage } from '@/lib/errors';
import { getPasswordError } from '@/lib/password';

const REFERRAL_CODE_RE = /^REF-[A-Z2-9]{10}$/;

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirm?: string;
  terms?: string;
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const refParam = searchParams.get('ref');
  const referralCode = refParam && REFERRAL_CODE_RE.test(refParam) ? refParam : null;
  const invalidReferralCode = refParam && !referralCode;

  const { register } = useAuth();
  const { guestToken, guestResume, clearGuestResume } = useGuestResume();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const livePasswordError = password.length > 0 ? getPasswordError(password) : undefined;
  const passwordMessage = fieldErrors.password ?? livePasswordError;
  const showPasswordMessage = !!passwordMessage;

  const clearField = (field: keyof FieldErrors) =>
    setFieldErrors((f) => ({ ...f, [field]: undefined }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const next: FieldErrors = {};
    if (!fullName.trim()) next.fullName = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Please enter a valid email.';
    const passwordError = getPasswordError(password);
    if (passwordError) next.password = passwordError;
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    if (!agreedTerms)
      next.terms = 'Please accept the Privacy Policy and Terms & Conditions to continue.';
    setFieldErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await register(fullName.trim(), email.trim(), password, referralCode ?? undefined);

      if (guestToken) {
        try {
          await linkGuestResume(guestToken);
          clearGuestResume();
          showToast('Your resume has been linked to your account.', 'success');
        } catch {
          // Best effort: never block account creation when the guest resume
          // could not be linked (the resume remains stored server-side).
        }
      }

      showToast(`Account created! Welcome to ${BRAND_NAME}.`, 'success');
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-4 sm:py-6">
      <div className="w-full max-w-[30rem]">
        <Card className="p-2">
          <div className="mb-2 text-center">
            <BrandLogo className="mx-auto h-16 w-auto" showName={false} />{' '}
            <h1 className="mt-2 text-xl font-bold tracking-tight text-content sm:text-2xl">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-content-muted">
              Create a free account to explore {BRAND_NAME} opportunities.
            </p>
          </div>

          {invalidReferralCode && (
            <Alert variant="warning" className="mb-4">
              The referral link you used contains an invalid code. You can still create an account
              without a referral.
            </Alert>
          )}

          {referralCode && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              You were referred with code{' '}
              <span className="font-mono font-semibold">{referralCode}</span>
            </div>
          )}

          {guestResume && (
            <div className="mb-4 rounded-xl border border-[#C8943E]/30 bg-[#FFF3D9] px-4 py-3 text-sm text-[#7A5A1E] dark:border-[#C8943E]/30 dark:bg-brand-950 dark:text-brand-200">
              You uploaded {guestResume.originalName} as a guest — it will be linked to your new
              account, so you won&apos;t need to upload it again.
            </div>
          )}

          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <Input
              label="Full name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                clearField('fullName');
              }}
              placeholder="Jane Doe"
              error={fieldErrors.fullName}
              required
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearField('email');
              }}
              placeholder="you@example.com"
              error={fieldErrors.email}
              required
            />
            <div>
              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearField('password');
                  clearField('confirm');
                }}
                aria-invalid={showPasswordMessage}
                aria-describedby={showPasswordMessage ? 'password-requirements' : undefined}
                className={
                  showPasswordMessage ? '!border-red-500 focus:!ring-red-500/50' : undefined
                }
                placeholder="Enter your password"
                required
              />
              {showPasswordMessage && (
                <p
                  id="password-requirements"
                  className="mt-1.5 text-xs leading-relaxed text-red-600 dark:text-red-400"
                >
                  {passwordMessage}
                </p>
              )}
            </div>
            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                clearField('confirm');
              }}
              placeholder="Re-enter your password"
              error={fieldErrors.confirm}
              required
            />
            <div>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 transition-colors ${
                  fieldErrors.terms ? 'border-red-500/60 bg-red-50/30' : 'border-line bg-surface'
                }`}
              >
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => {
                    setAgreedTerms(e.target.checked);
                    clearField('terms');
                  }}
                  required
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                  aria-invalid={!!fieldErrors.terms}
                />
                <span className="text-sm leading-relaxed text-content-muted">
                  I have read and agree to the{' '}
                  <Link
                    href="/privacy-policy"
                    className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
                  >
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/terms-and-conditions"
                    className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-400"
                  >
                    Terms & Conditions
                  </Link>
                  .
                </span>
              </label>
              {fieldErrors.terms && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{fieldErrors.terms}</p>
              )}
            </div>
            <Button type="submit" className="w-full" loading={loading} disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-content-muted">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
