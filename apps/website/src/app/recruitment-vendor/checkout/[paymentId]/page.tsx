'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, ErrorState, Skeleton } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import { failRvaPayment, fetchRvaPaymentSession, verifyRvaPayment } from '@/lib/services';
import { RvaPaymentSession } from '@/lib/types';

type Phase = 'form' | 'processing' | 'success' | 'failure';

function durationLabel(days: number | null): string {
  if (days === 30) return 'Monthly';
  if (days === 90) return '3 Months';
  if (days === 180) return '6 Months';
  return days ? `${days} Days` : '';
}

function CheckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CrossIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ShieldIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function ArrowLeftIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

export default function RvaCheckoutPage() {
  const params = useParams<{ paymentId: string }>();
  const paymentId = String(params?.paymentId ?? '');

  return <RvaCheckout key={paymentId} paymentId={paymentId} />;
}

function RvaCheckout({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<RvaPaymentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [phaseError, setPhaseError] = useState('');

  const loadSession = useCallback(() => {
    setLoading(true);
    setError('');
    fetchRvaPaymentSession(paymentId)
      .then((s) => {
        setSession(s);
        if (s.status === 'SUCCESS') setPhase('success');
        else if (s.status === 'FAILED') setPhase('failure');
        else setPhase('form');
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [paymentId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const loadRazorpayScript = () =>
    new Promise<void>((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
      document.body.appendChild(script);
    });

  const pay = async () => {
    if (!session || phase === 'processing') return;
    setPhase('processing');
    setPhaseError('');
    try {
      await loadRazorpayScript();
      if (!(window as any).Razorpay || !session.orderId) {
        throw new Error('Failed to load Razorpay checkout');
      }

      const rzp = new (window as any).Razorpay({
        key: session.keyId,
        amount: Math.round(session.amount * 100),
        currency: session.currency,
        name: 'Gravitas Edge',
        description: `${session.planName ?? 'Recruitment Vendor Access'} - ${durationLabel(
          session.durationDays,
        )}`,
        order_id: session.orderId,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyRvaPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              paymentId,
            });
            setPhase('success');
            loadSession();
          } catch (err) {
            setPhase('failure');
            setPhaseError(getErrorMessage(err));
          }
        },
        modal: {
          ondismiss: () => setPhase('form'),
        },
        theme: { color: '#061B36' },
        retry: { enabled: true },
      });
      rzp.open();
    } catch (err) {
      setPhase('form');
      setPhaseError(getErrorMessage(err));
    }
  };

  const cancelSession = () => {
    failRvaPayment(paymentId).catch(() => {});
    router.push('/recruitment-vendor');
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Skeleton className="h-[24rem] rounded-3xl" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-card dark:bg-surface-elevated">
          <ErrorState message={error || 'Payment session not found'} onRetry={loadSession} />
        </div>
      </div>
    );
  }

  const currency = session.currency;

  if (phase === 'success') {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card dark:bg-surface-elevated">
          <div className="relative overflow-hidden bg-[#061B36] px-6 py-9 text-center">
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/40">
              <CheckIcon className="h-8 w-8" />
            </div>
            <h1 className="relative mt-4 text-2xl font-extrabold tracking-tight text-white">
              Payment successful
            </h1>
            <p className="relative mt-1.5 text-sm text-white/70">
              Your Recruitment Vendor Access is now active.
            </p>
          </div>
          <div className="px-6 py-6">
            <div className="rounded-2xl border border-line bg-surface-muted p-4 dark:bg-surface">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-content">
                    {session.planName ?? 'Recruitment Vendor Access'}
                  </p>
                  <p className="truncate text-xs text-content-muted">
                    {durationLabel(session.durationDays)}
                  </p>
                </div>
                <p className="shrink-0 text-xl font-extrabold tracking-tight text-content">
                  {formatMoney(session.amount, currency)}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Button className="w-full !py-3.5 !text-base" onClick={() => router.push('/recruitment-vendor')}>
                Back to Recruitment Vendor Access
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard')}>
                Go to my dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'failure') {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card dark:bg-surface-elevated">
          <div className="relative overflow-hidden bg-[#061B36] px-6 py-9 text-center">
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-400 ring-1 ring-red-400/40">
              <CrossIcon className="h-8 w-8" />
            </div>
            <h1 className="relative mt-4 text-2xl font-extrabold tracking-tight text-white">
              Payment failed
            </h1>
            <p className="relative mt-1.5 text-sm text-white/70">
              The payment was not completed and your access was not activated.
            </p>
          </div>
          <div className="px-6 py-6">
            {phaseError && (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {phaseError}
              </p>
            )}
            <div className="flex flex-col gap-3">
              <Button className="w-full !py-3.5 !text-base" onClick={loadSession}>
                Try again
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push('/recruitment-vendor')}>
                Back to plans
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (['CANCELLED', 'REFUNDED', 'PENDING'].includes(session.status)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-line bg-surface px-6 py-9 text-center shadow-card dark:bg-surface-elevated">
          <h1 className="text-xl font-extrabold tracking-tight text-content">
            This payment session can no longer be completed
          </h1>
          <p className="mt-2 text-sm text-content-muted">
            Status: <span className="font-semibold">{session.status.toLowerCase()}</span>. Please
            choose a plan again.
          </p>
          <div className="mt-6">
            <Button onClick={() => router.push('/recruitment-vendor')}>Back to plans</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
      <Link
        href="/recruitment-vendor"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-content-muted transition-colors hover:text-content"
      >
        <ArrowLeftIcon className="h-4 w-4" /> Back to Recruitment Vendor Access
      </Link>

      <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-surface shadow-card dark:bg-surface-elevated">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-content">
              {session.planName ?? 'Recruitment Vendor Access'}
            </p>
            <p className="truncate text-xs text-content-muted">
              {durationLabel(session.durationDays)}
            </p>
          </div>
          <Badge variant="premium">{durationLabel(session.durationDays)}</Badge>
        </div>

        <div className="px-6 py-6">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-content-muted">Plan</dt>
              <dd className="text-right font-semibold text-content">
                {session.planName ?? 'Recruitment Vendor Access'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-content-muted">Duration</dt>
              <dd className="text-right font-semibold text-content">
                {durationLabel(session.durationDays)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
              <dt className="font-semibold text-content">Total due today</dt>
              <dd className="text-right text-2xl font-extrabold tracking-tight text-content">
                {formatMoney(session.amount, currency)}
              </dd>
            </div>
          </dl>

          <Button
            className="mt-6 w-full !py-4 !text-base font-bold"
            loading={phase === 'processing'}
            disabled={phase === 'processing'}
            onClick={pay}
          >
            {phase === 'processing' ? 'Opening Razorpay…' : `Pay ${formatMoney(session.amount, currency)}`}
          </Button>
          <button
            type="button"
            onClick={cancelSession}
            className="mt-3 w-full text-center text-xs font-medium text-content-faint transition-colors hover:text-content"
          >
            Cancel and return
          </button>

          {phaseError && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {phaseError}
            </p>
          )}

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-line bg-surface-muted px-4 py-3.5 dark:bg-surface">
            <ShieldIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-500 dark:text-brand-400" />
            <p className="text-xs leading-relaxed text-content-muted">
              Your payment details go directly to Razorpay&rsquo;s secure checkout — they never touch
              our servers. Access is activated only after our server verifies the payment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
