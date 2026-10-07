'use client';

import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { confirmPurchase, failPayment, fetchPaymentSession, purchasePlan } from '@/lib/services';
import { PaymentSession } from '@/lib/types';
import { Badge, Button, Card, ErrorState, Skeleton, Spinner } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';

/**
 * MOCK / TEST payment gateway for development only.
 *
 * This screen deliberately looks like a real checkout so the full purchase
 * flow (plan -> coupon -> gateway -> success/failure -> activation) can be
 * exercised end-to-end. NO real money is charged and no real gateway is
 * involved. To go live, replace this page with the official Razorpay (or
 * equivalent) checkout: keep calling purchasePlan() to create the session,
 * then handle the gateway callback and confirmPurchase()/failPayment() exactly
 * as this page does.
 */

type MethodId = 'upi' | 'card' | 'netbanking' | 'wallet';
type Phase = 'form' | 'processing' | 'success' | 'failure';

interface PaymentMethod {
  id: MethodId;
  label: string;
  hint: string;
  monogram: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'upi', label: 'UPI', hint: 'Google Pay · PhonePe · Paytm', monogram: 'UP' },
  { id: 'card', label: 'Credit / Debit Card', hint: 'Visa · Mastercard · RuPay', monogram: 'CC' },
  { id: 'netbanking', label: 'Net Banking', hint: 'All major Indian banks', monogram: 'NB' },
  { id: 'wallet', label: 'Wallets', hint: 'Amazon Pay · Paytm Money', monogram: 'WL' },
];

function durationLabel(days: number | null): string {
  if (days === 30) return 'Monthly';
  if (days === 90) return '3 Months';
  if (days === 180) return '6 Months';
  if (days === 365) return 'Yearly';
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

export default function TestPaymentPage() {
  const params = useParams<{ paymentId: string }>();
  const searchParams = useSearchParams();
  const paymentId = params?.paymentId;
  return (
    <GatewaySession
      key={String(paymentId)}
      paymentId={String(paymentId)}
      returnTo={searchParams.get('returnTo') || ''}
    />
  );
}

function GatewaySession({ paymentId, returnTo }: { paymentId: string; returnTo: string }) {
  const router = useRouter();
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [method, setMethod] = useState<MethodId>('upi');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [phaseError, setPhaseError] = useState('');
  const [retrying, setRetrying] = useState(false);

  const loadSession = () => {
    setLoading(true);
    setError('');
    fetchPaymentSession(paymentId)
      .then((s) => {
        setSession(s);
        if (s.status === 'SUCCESS') setPhase('success');
        else if (s.status === 'FAILED') setPhase('failure');
        else setPhase('form');
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  const pay = async () => {
    if (!session || phase === 'processing') return;
    setPhase('processing');
    setPhaseError('');
    // Simulate the gateway round-trip so the state transition is visible.
    await new Promise((r) => setTimeout(r, 1600));
    try {
      if (simulateFailure) {
        await failPayment(session.paymentId);
        setPhase('failure');
      } else {
        const result = await confirmPurchase(session.paymentId);
        // Fresh idempotent read so the success screen shows live data.
        setSession({
          paymentId: result.payment.id,
          orderId: result.payment.orderId,
          status: 'SUCCESS',
          amount: result.payment.amount,
          currency: result.payment.currency,
          planId: session.planId,
          planName: session.planName,
          vaultId: session.vaultId,
          vaultName: session.vaultName,
          durationDays: session.durationDays,
          couponCode: session.couponCode,
          originalAmount: session.originalAmount,
          discountAmount: session.discountAmount,
          finalAmount: session.finalAmount,
        });
        setPhase('success');
      }
    } catch (err) {
      setPhase('form');
      setPhaseError(getErrorMessage(err));
    }
  };

  const startOver = async () => {
    if (!session || retrying) return;
    setRetrying(true);
    setPhaseError('');
    try {
      const next = await purchasePlan(
        session.planId ?? '',
        session.vaultId ?? undefined,
        session.couponCode ?? undefined,
      );
      router.replace(
        `/checkout/test-payment/${next.paymentId}${
          returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''
        }`,
      );
    } catch (err) {
      setPhaseError(getErrorMessage(err));
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="grid gap-6 md:grid-cols-5">
          <Skeleton className="h-80 rounded-3xl md:col-span-2" />
          <Skeleton className="h-80 rounded-3xl md:col-span-3" />
        </div>
      </Shell>
    );
  }

  if (error || !session) {
    return (
      <Shell>
        <Card className="p-6">
          <ErrorState message={error || 'Payment session not found'} onRetry={loadSession} />
        </Card>
      </Shell>
    );
  }

  const currency = session.currency;
  const usesCoupon = session.discountAmount > 0;

  if (phase === 'success') {
    return (
      <Shell>
        <Card className="mx-auto max-w-xl p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            <CheckIcon className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-content">
            Payment successful
          </h1>
          <p className="mt-2 text-sm text-content-muted">
            This was a <Badge variant="success">test payment</Badge> — no real money was charged.
            Your subscription is now active.
          </p>
          <div className="mt-6 rounded-2xl border border-line bg-surface-muted p-4 text-sm">
            <p className="font-semibold text-content">{session.planName ?? 'Plan'}</p>
            <p className="text-content-muted">
              {session.vaultName ?? 'Your vault'} · {durationLabel(session.durationDays)}
            </p>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-content">
              {formatMoney(session.finalAmount, currency)}
            </p>
            <p className="mt-1 text-xs text-content-faint">
              Order {session.orderId ?? session.paymentId}
            </p>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Button
              onClick={() => router.push(returnTo || '/dashboard/subscriptions')}
            >
              {returnTo ? 'Go to your unlocked Vault' : 'Go to my plan'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/plans')}>
              Back to plans
            </Button>
          </div>
        </Card>
      </Shell>
    );
  }

  if (phase === 'failure') {
    return (
      <Shell>
        <Card className="mx-auto max-w-xl p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
            <CrossIcon className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-content">
            Payment failed
          </h1>
          <p className="mt-2 text-sm text-content-muted">
            No money was charged and your subscription was not activated. This was a simulated
            failure for testing the gateway flow.
          </p>
          <div className="mt-6 rounded-2xl border border-line bg-surface-muted p-4 text-sm">
            <p className="font-semibold text-content">{session.planName ?? 'Plan'}</p>
            <p className="text-xs text-content-faint">Order {session.orderId ?? session.paymentId}</p>
          </div>
          {phaseError && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{phaseError}</p>}
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={startOver} loading={retrying}>
              Try again
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(returnTo || '/plans')}
            >
              {returnTo ? 'Back to your Vault' : 'Back to plans'}
            </Button>
          </div>
        </Card>
      </Shell>
    );
  }

  const forbiddenStates = ['CANCELLED', 'REFUNDED', 'PENDING'];
  if (forbiddenStates.includes(session.status)) {
    return (
      <Shell>
        <Card className="mx-auto max-w-xl p-8 text-center">
          <h1 className="text-xl font-bold text-content">
            This payment session can no longer be completed
          </h1>
          <p className="mt-2 text-sm text-content-muted">
            Status: {session.status.toLowerCase()}. Please choose a plan again.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => router.push('/plans')}>Back to plans</Button>
          </div>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid items-start gap-6 md:grid-cols-5">
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-content-faint">
              Order Summary
            </h2>
            <Badge variant="premium">{durationLabel(session.durationDays)}</Badge>
          </div>

          <div className="mt-4 border-b border-line pb-4">
            <p className="text-lg font-bold text-content">{session.planName ?? 'Subscription plan'}</p>
            <p className="text-sm text-content-muted">{session.vaultName ?? 'Vault access'}</p>
          </div>

          {usesCoupon && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <p className="text-content-muted">Original price</p>
              <p className="font-medium text-content-faint line-through">
                {formatMoney(session.originalAmount, currency)}
              </p>
            </div>
          )}

          {usesCoupon && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-emerald-600 dark:text-emerald-400">
                Coupon {session.couponCode ?? ''}
              </p>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">
                −{formatMoney(session.discountAmount, currency)}
              </p>
            </div>
          )}

          <div className="mt-3 flex items-end justify-between border-t border-line pt-4">
            <p className="text-sm font-medium text-content">Payable now</p>
            <p className="text-3xl font-extrabold tracking-tight text-content">
              {formatMoney(session.finalAmount, currency)}
            </p>
          </div>
          <p className="mt-1 text-xs text-content-faint">
            Final amount set by our server — it cannot be changed from the browser.
          </p>
        </Card>

        <Card className="md:col-span-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-content-faint">
            Choose a test payment method
          </h2>
          <p className="mt-1 text-xs text-content-faint">
            Every method here is simulated — no real money and no real gateway.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PAYMENT_METHODS.map((m) => {
              const selected = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  aria-pressed={selected}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                    selected
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 dark:border-brand-500 dark:bg-brand-950'
                      : 'border-line bg-surface hover:border-brand-300'
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                      selected
                        ? 'bg-brand-600 text-white'
                        : 'bg-surface-muted text-content-muted'
                    }`}
                  >
                    {m.monogram}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-content">{m.label}</span>
                    <span className="block truncate text-xs text-content-muted">{m.hint}</span>
                  </span>
                  <span
                    className={`ml-auto h-4 w-4 shrink-0 rounded-full border-2 ${
                      selected ? 'border-brand-600 bg-brand-600' : 'border-line-strong'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-amber-400 bg-amber-50 px-3.5 py-2.5 dark:bg-amber-500/10">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(e) => setSimulateFailure(e.target.checked)}
              className="h-4 w-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Simulate payment failure (dev test)
            </span>
          </label>

          {phaseError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{phaseError}</p>
          )}

          {phase === 'processing' ? (
            <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface-muted py-8">
              <Spinner className="h-7 w-7 text-brand-600" />
              <p className="text-sm font-medium text-content">Processing test payment…</p>
              <p className="text-xs text-content-faint">
                Simulating {simulateFailure ? 'a declined' : 'a successful'} gateway response
              </p>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                className="flex-1"
                variant={simulateFailure ? 'danger' : 'primary'}
                onClick={pay}
              >
                {simulateFailure
                  ? `Decline ${formatMoney(session.finalAmount, currency)} (test)`
                  : `Pay ${formatMoney(session.finalAmount, currency)}`}
              </Button>
              <Button variant="outline" onClick={() => router.push(returnTo || '/plans')}>
                Cancel
              </Button>
            </div>
          )}

          <p className="mt-4 rounded-xl border border-line bg-surface-muted px-3.5 py-3 text-xs leading-relaxed text-content-muted">
            <span className="font-semibold text-content">TEST PAYMENT GATEWAY.</span> No real payment
            is processed and no bank account, card or UPI details are requested or stored. When the
            production gateway is connected, this screen is replaced by the official checkout and
            your payment details go directly to the gateway — never to our servers.
          </p>
        </Card>
      </div>

      <div className="mt-6 text-center text-xs text-content-faint">
        <Link href="/plans" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          ← Choose a different plan
        </Link>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[70vh] bg-surface py-10 dark:bg-surface-elevated/50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-content">
              Test Payment Gateway
            </h1>
            <p className="mt-1 text-sm text-content-muted">
              Development checkout — no real money is charged.
            </p>
          </div>
          <Badge variant="warning">TEST ONLY</Badge>
        </div>
        {children}
      </div>
    </div>
  );
}