'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button, Input, Alert, useToast } from '@/components/ui';
import BrandLogo, { BRAND_NAME } from '@/components/brand/BrandLogo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { getErrorMessage } from '@/lib/errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) {
    errors.email = 'Please enter your email address.';
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!password) {
    errors.password = 'Please enter your password.';
  }
  return errors;
}

const FEATURES = [
  {
    title: 'Full control of your marketplace',
    subtitle: 'Manage candidates, opportunities, vaults and referrals from one place.',
  },
  {
    title: 'Real-time visibility',
    subtitle: 'Live subscription, commission and analytics views that you can act on.',
  },
  {
    title: 'Secure by design',
    subtitle: 'Role-based access, rate limiting and hardened file handling built in.',
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const next = validate(email, password);
    setFieldErrors(next);
    if (next.email || next.password) {
      setError('Please fix the highlighted fields below.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      showToast('Welcome back, admin', 'success');
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearFieldError = (field: keyof FieldErrors) =>
    setFieldErrors((f) => (f[field] ? { ...f, [field]: undefined } : f));

  return (
    <div className="flex min-h-screen bg-surface-muted dark:bg-surface" style={{ fontFamily: 'var(--font-poppins)' }}>
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-[#061B36] p-10 lg:flex">
        <div className="relative flex flex-1 flex-col justify-center">
          <h2 className="max-w-md text-3xl font-bold leading-tight text-white">
            Run your consulting marketplace with confidence.
          </h2>
          <ul className="mt-8 space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="mt-1.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-400/30 text-brand-100">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={3.5}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="mt-0.5 text-sm text-brand-200/80">{f.subtitle}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-200/60">
          © {new Date().getFullYear()} Designed, Developed & Marketed by PR Digital Marketing
          Gwalior
        </p>
      </div>

      <div className="relative flex w-full flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <BrandLogo className="mx-auto h-24 w-auto" showName={false} />
            <p className="mt-3 text-xl font-bold tracking-tight text-content">{BRAND_NAME}</p>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-content">Welcome back</h1>
          <p className="mt-1 text-sm text-content-muted">
            Sign in to the {BRAND_NAME} administration console.
          </p>

          <div className="mt-6 rounded-2xl border border-line bg-surface p-6 card-static dark:bg-surface-elevated">
            {error && (
              <Alert variant="error" className="mb-5">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input
                label="Email address"
                type="email"
                required
                autoComplete="email"
                autoFocus
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError('email');
                }}
                error={fieldErrors.email}
              />
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-content">
                  Password <span className="ml-0.5 text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFieldError('password');
                    }}
                    className={`w-full rounded-xl border bg-surface px-3.5 py-2.5 pr-11 text-sm text-content shadow-sm transition placeholder:text-content-faint focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 ${
                      fieldErrors.password
                        ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
                        : 'border-line focus:border-brand-500'
                    } dark:bg-surface-elevated dark:border-line dark:focus:border-brand-400`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-content-muted transition hover:bg-surface-muted hover:text-content"
                  >
                    {showPassword ? (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.8}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.8}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" loading={loading} size="md">
                {loading ? 'Signing you in…' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-xs text-content-muted">
              <span>Protected admin area</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                    clipRule="evenodd"
                  />
                </svg>
                Secure connection
              </span>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-content-muted">
            Having trouble signing in? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}