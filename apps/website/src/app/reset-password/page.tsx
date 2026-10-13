import { Metadata } from 'next';
import ResetPasswordClient from './ResetPasswordClient';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Reset your Gravitas Edge Consulting password',
};

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const params = await searchParams;
  return <ResetPasswordClient token={params.token} email={params.email} />;
}
