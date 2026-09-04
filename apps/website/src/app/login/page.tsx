'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button, Card, Input, Alert, useToast } from '@/components/ui';
import BrandLogo, { BRAND_NAME } from '@/components/brand/BrandLogo';
import { getErrorMessage } from '@/lib/errors';

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = 'Please enter your email.';
    if (!password) next.password = 'Please enter your password.';
    setFieldError(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      showToast('Welcome back!', 'success');
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="p-2">
          <div className="mb-2 text-center">
            <BrandLogo className="mx-auto h-16 w-auto" showName={false} />
            <h1 className="mt-4 text-xl font-bold tracking-tight text-content sm:text-2xl">
              Sign in to {BRAND_NAME}
            </h1>
            <p className="mt-1 text-sm text-content-muted">Welcome back.</p>
          </div>

          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
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

          <p className="mt-6 text-center text-sm text-content-muted">
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
