'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button, Input, Card, Alert, useToast } from '@/components/ui';
import BrandLogo, { BRAND_NAME } from '@/components/brand/BrandLogo';
import { getErrorMessage } from '@/lib/errors';

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = 'Please enter your email.';
    if (!password) next.password = 'Please enter your password.';
    setFieldErrors(next);
    if (Object.keys(next).length) return;

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4 dark:bg-surface">
      <div className="w-full max-w-md">
        <Card className="p-2">
          <div className="mb-2 text-center">
            <BrandLogo className="mx-auto h-20 w-auto" showName={false} />
            <h1 className="mt-4 text-xl font-bold tracking-tight text-content sm:text-2xl">
              Admin Sign in
            </h1>
            <p className="mt-1 text-sm text-content-muted">{BRAND_NAME} administration console</p>
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
              required
              autoComplete="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
              }}
              error={fieldErrors.email}
            />
            <Input
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
              }}
              error={fieldErrors.password}
            />
            <Button type="submit" className="w-full" loading={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
