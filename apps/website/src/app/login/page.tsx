import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginFormWrapper searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginFormWrapper({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const params = await searchParams;
  const urlReferralCode = params.ref || null;

  return <LoginForm urlReferralCode={urlReferralCode} />;
}