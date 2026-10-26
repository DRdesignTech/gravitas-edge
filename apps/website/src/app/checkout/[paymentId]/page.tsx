'use client';

import { cancelCheckout, retryCheckout } from '@/lib/checkout-retry';

import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  failPayment,
  fetchAvailableCoupons,
  fetchPaymentSession,
  purchasePlan,
  validateCoupon,
  verifyPayment,
  verifySubscriptionPayment,
} from '@/lib/services';
import { AvailableCoupon, PaymentSession } from '@/lib/types';
import { Badge, Button, Card, ErrorState, Input, Skeleton, Spinner } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { getCouponErrorMessage, getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/lib/auth';

/**
 * Razorpay checkout. The payment order is created server-side by
 * POST /subscriptions/purchase (never trusts client prices); the Razorpay
 * popup is opened with the returned order_id/key_id, and the payment is only
 * activated after the server verifies the Razorpay signature.
 */

type Phase = 'form' | 'processing' | 'success' | 'failure';

function durationLabel(days: number | null): string {
  if (days === 30) return 'Monthly';
  if (days === 90) return '3 Months';
  if (days === 180) return '6 Months';
  if (days === 365) return 'Yearly';
  return days ? `${days} Days` : '';
}

function CheckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CrossIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ArrowLeftIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function ArrowRightIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
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

function TagIcon({ className = 'h-4 w-4' }: { className?: string }) {
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
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

function ChevronDownIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

export default function CheckoutPage() {
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
  const successRedirected = useRef(false);
  const redirectAfterSuccess = () => {
    if (successRedirected.current) return;
    successRedirected.current = true;
    router.replace(returnTo || '/dashboard');
  };
  const { refreshAccess } = useAuth();
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [phaseError, setPhaseError] = useState('');
  const [retrying, setRetrying] = useState(false);

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{
    code: string;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
  } | null>(null);
  const [couponStatus, setCouponStatus] = useState<'idle' | 'applying' | 'error'>('idle');
  const [couponError, setCouponError] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [showCoupons, setShowCoupons] = useState(false);

  const loadSession = () => {
    setLoading(true);
    setError('');
    fetchPaymentSession(paymentId)
      .then((s) => {
        setSession(s);
        if (s.status === 'SUCCESS') {
          setPhase('success');
          redirectAfterSuccess();
        } else if (s.status === 'FAILED' || s.cleanupPending) {
          setPhase('failure');
          if (s.cleanupPending) {
            setPhaseError('AutoPay cleanup is pending. Retry to finish cleanup before starting a fresh checkout.');
          }
        } else if (s.status === 'PENDING') {
          setPhase('processing');
          setPhaseError(
            'Payment confirmation is still pending. Access will be activated only after the captured payment is confirmed.',
          );
        } else setPhase('form');
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  const checkPendingStatus = async () => {
    setPhaseError('');
    try {
      const refreshed = await fetchPaymentSession(paymentId);
      setSession(refreshed);
      if (refreshed.status === 'SUCCESS') {
        await refreshAccess();
        setPhase('success');
        redirectAfterSuccess();
        return;
      }
      if (refreshed.status === 'FAILED') {
        setPhase('failure');
        return;
      }
      setPhase('processing');
      setPhaseError(
        'Payment confirmation is still pending. You can check again shortly; access has not been activated yet.',
      );
    } catch (err) {
      setPhase('processing');
      setPhaseError(getErrorMessage(err));
    }
  };

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  // Reflect any coupon already frozen on the server session.
  useEffect(() => {
    if (!session) return;
    if (session.couponCode) {
      setCoupon({
        code: session.couponCode,
        originalAmount: session.originalAmount,
        discountAmount: session.discountAmount,
        finalAmount: session.finalAmount,
      });
    } else {
      setCoupon(null);
    }
  }, [session?.paymentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the coupons this user can apply to the session's plan.
  useEffect(() => {
    const planId = session?.planId;
    if (!planId) return;
    let cancelled = false;
    setCouponsLoading(true);
    fetchAvailableCoupons(planId)
      .then((res) => {
        if (!cancelled) setAvailableCoupons(res.coupons);
      })
      .catch(() => {
        if (!cancelled) setAvailableCoupons([]);
      })
      .finally(() => {
        if (!cancelled) setCouponsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.planId]);

  const applyCoupon = async (raw?: string) => {
    const planId = session?.planId;
    if (!planId) return;
    const code = (raw ?? couponInput).trim();
    if (!code) return;
    setCouponStatus('applying');
    setCouponError('');
    try {
      const res = await validateCoupon(code, planId);
      setCoupon({
        code: res.coupon.code,
        originalAmount: res.originalAmount,
        discountAmount: res.discountAmount,
        finalAmount: res.finalAmount,
      });
      setCouponInput(res.coupon.code);
      setCouponStatus('idle');
      setShowCoupons(false);
    } catch (err) {
      setCoupon(null);
      setCouponStatus('error');
      setCouponError(getCouponErrorMessage(err));
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponInput('');
    setCouponStatus('idle');
    setCouponError('');
    setShowCoupons(false);
  };

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

      const desiredCode = coupon?.code ?? '';
      const currentCode = session.couponCode || '';
      const payable = coupon ? coupon.finalAmount : session.finalAmount;

      let orderId = session.orderId;
      let keyId = session.keyId;
      let amount = payable;
      let currency = session.currency;
      let paymentId = session.paymentId;

      // The server froze this session's amount. If the user picked a different
      // coupon on this page, start a new server-side session so the order is
      // always priced by the backend.
      if (desiredCode !== currentCode && session.planId) {
        await failPayment(session.paymentId);
        const next = await purchasePlan(
          session.planId,
          session.vaultId ?? undefined,
          desiredCode || undefined,
        );
        orderId = next.orderId || null;
        keyId = next.keyId;
        amount = next.amount;
        currency = next.currency;
        paymentId = next.paymentId;
        setSession((prev) =>
          prev
            ? {
                ...prev,
                paymentId,
                orderId,
                keyId,
                amount,
                currency,
                couponCode: desiredCode || null,
                originalAmount: coupon?.originalAmount ?? prev.originalAmount,
                discountAmount: coupon?.discountAmount ?? 0,
                finalAmount: amount,
              }
            : prev,
        );
      }

      if (!(window as any).Razorpay) {
        throw new Error('Failed to load Razorpay checkout');
      }
      if (!orderId && !(session.razorpaySubscriptionId || (session as any).subscriptionId)) {
        throw new Error('Missing payment details');
      }

      let checkoutCompleted = false;
      const rzpOptions: any = {
        key: keyId,
        amount: Math.round(amount * 100),
        currency,
        name: 'Gravitas Edge',
        description: `${session.planName ?? 'Plan'} - ${session.vaultName ?? ''}`,
        ...(orderId ? { order_id: orderId } : {}),
        ...(session.razorpaySubscriptionId || (session as any).subscriptionId ? { subscription_id: session.razorpaySubscriptionId || (session as any).subscriptionId } : {}),
        handler: async (response: any) => {
          checkoutCompleted = true;
          try {
            if (!session.recurring && !session.razorpaySubscriptionId && response.razorpay_order_id && response.razorpay_signature) {
              await verifyPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                paymentId,
              });
              await refreshAccess();
              setPhase('success');
              redirectAfterSuccess();
            } else if (
              (session.recurring || session.razorpaySubscriptionId) &&
              response.razorpay_subscription_id &&
              response.razorpay_signature
            ) {
              const res = await verifySubscriptionPayment({
                paymentId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              });

              if (res.status === 'SUCCESS') {
                await refreshAccess();
                setPhase('success');
                redirectAfterSuccess();
              } else {
                // Payment is authorized but capture is still in flight (e.g. UPI mandate settlement)
                setPhase('processing');
                let confirmed = false;
                for (let attempt = 0; attempt < 5; attempt++) {
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                  try {
                    const refreshed = await fetchPaymentSession(paymentId);
                    if (refreshed.status === 'SUCCESS') {
                      confirmed = true;
                      await refreshAccess();
                      setPhase('success');
                      redirectAfterSuccess();
                      break;
                    }
                  } catch {
                    // continue polling
                  }
                }
                if (!confirmed) {
                  setPhaseError(
                    'Your mandate was authorized, but Razorpay has not confirmed the payment yet. We will activate access after confirmation.',
                  );
                }
              }
            } else {
              throw new Error('Invalid payment response');
            }
          } catch (err: any) {
            setPhase('failure');
            setPhaseError(getErrorMessage(err));
          }
        },
        modal: {
          ondismiss: async () => {
            if (checkoutCompleted) return;
            setPhase('processing');
            try {
              await cancelCheckout(paymentId, failPayment);
              setSession((prev) => prev ? { ...prev, status: 'FAILED' } : prev);
              setPhase('failure');
            } catch (err) {
              try {
                const refreshed = await fetchPaymentSession(paymentId);
                setSession(refreshed);
                if (refreshed.status === 'SUCCESS') {
                  await refreshAccess();
                  setPhase('success');
                  redirectAfterSuccess();
                  return;
                }
              } catch {
                // Retry must still complete cleanup before purchase.
              }
              setPhaseError(getErrorMessage(err));
              setPhase('failure');
            }
          },
        },
        theme: { color: '#5F43F2' },
        retry: { enabled: true },
      };
      const rzp = new (window as any).Razorpay(rzpOptions);
      (rzp as any).open();
    } catch (err: any) {
      setPhase('form');
      setPhaseError(getErrorMessage(err));
    }
  };

  const startOver = async () => {
    if (!session || retrying) return;
    setRetrying(true);
    setPhaseError('');
    try {
      const next = await retryCheckout(session, { failPayment, purchasePlan });
      router.replace(
        `/checkout/${next.paymentId}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`,
      );
    } catch (err) {
      setPhaseError(getErrorMessage(err));
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="grid items-start gap-6 lg:grid-cols-5">
          <div className="order-2 lg:order-1 lg:col-span-3">
            <Skeleton className="h-[26rem] rounded-3xl" />
          </div>
          <div className="order-1 lg:order-2 lg:col-span-2">
            <Skeleton className="h-[26rem] rounded-3xl" />
          </div>
        </div>
      </Shell>
    );
  }

  if (error || !session) {
    return (
      <Shell>
        <div className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-6 shadow-card dark:bg-surface-elevated">
          <ErrorState message={error || 'Payment session not found'} onRetry={loadSession} />
        </div>
      </Shell>
    );
  }

  const currency = session.currency;
  const originalAmount = coupon ? coupon.originalAmount : session.originalAmount;
  const discountAmount = coupon ? coupon.discountAmount : 0;
  const finalAmount = coupon ? coupon.finalAmount : session.finalAmount;
  const usesCoupon = discountAmount > 0;

  if (phase === 'success') {
    return (
      <Shell>
        <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-line bg-surface shadow-card dark:bg-surface-elevated">
          <div className="relative overflow-hidden bg-navy px-6 py-9 text-center dark:bg-brand-950">
            <div
              className="pointer-events-none absolute -top-24 left-1/2 h-44 w-80 -translate-x-1/2 rounded-full opacity-40"
              style={{
                background: 'radial-gradient(circle, rgba(200,148,62,0.5), transparent 70%)',
              }}
            />
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/40">
              <CheckIcon className="h-8 w-8" />
            </div>
            <h1 className="relative mt-4 text-2xl font-extrabold tracking-tight text-white">
              Payment successful
            </h1>
            <p className="relative mt-1.5 text-sm text-white/70">
              Your subscription is active. Welcome aboard!
            </p>
          </div>

          <div className="px-6 py-6">
            <div className="rounded-2xl border border-line bg-surface-muted p-4 dark:bg-surface">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-content">
                    {session.planName ?? 'Plan'}
                  </p>
                  <p className="truncate text-xs text-content-muted">
                    {session.vaultName ?? 'Your vault'} · {durationLabel(session.durationDays)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-extrabold tracking-tight text-content">
                    {formatMoney(session.finalAmount, currency)}
                  </p>
                  <p className="text-xs text-content-faint">
                    Order {session.orderId ?? session.paymentId}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                className="group w-full !py-3.5 !text-base"
                onClick={() => router.push(returnTo || '/dashboard')}
              >
                {returnTo ? 'Go to your unlocked Vault' : 'Go to my dashboard'}
                <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push('/plans')}>
                Back to plans
              </Button>
            </div>

            <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-content-faint">
              <ShieldIcon className="h-3.5 w-3.5" /> Your Vault is now unlocked from the dashboard.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === 'failure') {
    return (
      <Shell>
        <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-line bg-surface shadow-card dark:bg-surface-elevated">
          <div className="relative overflow-hidden bg-navy px-6 py-9 text-center dark:bg-brand-950">
            <div
              className="pointer-events-none absolute -top-24 left-1/2 h-44 w-80 -translate-x-1/2 rounded-full opacity-30"
              style={{
                background: 'radial-gradient(circle, rgba(239,68,68,0.5), transparent 70%)',
              }}
            />
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-400 ring-1 ring-red-400/40">
              <CrossIcon className="h-8 w-8" />
            </div>
            <h1 className="relative mt-4 text-2xl font-extrabold tracking-tight text-white">
              Payment failed
            </h1>
            <p className="relative mt-1.5 text-sm text-white/70">
              The payment was not completed and your subscription was not activated.
            </p>
          </div>

          <div className="px-6 py-6">
            <div className="rounded-2xl border border-line bg-surface-muted p-4 dark:bg-surface">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-content">
                    {session.planName ?? 'Plan'}
                  </p>
                  <p className="truncate text-xs text-content-muted">
                    {session.vaultName ?? 'Your vault'} · {durationLabel(session.durationDays)}
                  </p>
                </div>
                <p className="shrink-0 text-lg font-extrabold tracking-tight text-content">
                  {formatMoney(session.finalAmount, currency)}
                </p>
              </div>
            </div>

            {phaseError && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {phaseError}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <Button className="w-full !py-3.5 !text-base" onClick={startOver} loading={retrying}>
                Try again
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(returnTo || '/plans')}
              >
                {returnTo ? 'Back to your Vault' : 'Back to plans'}
              </Button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === 'processing' && phaseError) {
    return (
      <Shell>
        <div className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-6 text-center shadow-card dark:bg-surface-elevated">
          <Spinner className="mx-auto h-8 w-8" />
          <h1 className="mt-4 text-xl font-extrabold text-content">
            Payment confirmation in progress
          </h1>
          <p className="mt-2 text-sm text-content-muted">
            Your mandate may be authorized, but access is activated only after Razorpay confirms a
            captured payment.
          </p>
          {phaseError && (
            <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">{phaseError}</p>
          )}
          <Button className="mt-6" onClick={checkPendingStatus}>
            Check payment status
          </Button>
        </div>
      </Shell>
    );
  }

  const forbiddenStates = ['CANCELLED', 'REFUNDED'];
  if (forbiddenStates.includes(session.status)) {
    return (
      <Shell>
        <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-line bg-surface shadow-card dark:bg-surface-elevated">
          <div className="px-6 py-9 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <ShieldIcon className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-xl font-extrabold tracking-tight text-content">
              This payment session can no longer be completed
            </h1>
            <p className="mt-2 text-sm text-content-muted">
              Status: <span className="font-semibold">{session.status.toLowerCase()}</span>. Please
              choose a plan again.
            </p>
            <div className="mt-6">
              <Button onClick={() => router.push('/plans')}>Back to plans</Button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid items-start gap-6 lg:grid-cols-5">
        {/* Payment — main column */}
        <div className="order-2 lg:order-1 lg:col-span-3">
          <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card dark:bg-surface-elevated">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-gold dark:bg-brand-950 dark:text-brand-400">
                  <TagIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-content">
                    {session.planName ?? 'Subscription plan'}
                  </p>
                  <p className="truncate text-xs text-content-muted">
                    {session.vaultName ?? 'Vault access'} · {durationLabel(session.durationDays)}
                  </p>
                </div>
              </div>
              <p className="text-lg font-extrabold tracking-tight text-content">
                {formatMoney(originalAmount, currency)}
              </p>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm font-semibold text-content">What&rsquo;s included</p>
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {[
                  `Full Vault access — ${durationLabel(session.durationDays)}`,
                  'New opportunities added during your plan',
                  'Recruiter & company details where provided',
                  'Instant activation after successful payment',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-content-muted">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <Button
                  className="group relative w-full overflow-hidden !py-4 !text-base font-bold"
                  onClick={pay}
                  loading={phase === 'processing'}
                  disabled={phase === 'processing'}
                >
                  <span className="btn-shine pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                  {phase === 'processing' ? (
                    'Opening Razorpay…'
                  ) : (
                    <span className="flex items-center gap-2">
                      Pay {formatMoney(finalAmount, currency)}
                      <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => router.push(returnTo || '/plans')}
                  className="mt-3 w-full text-center text-xs font-medium text-content-faint transition-colors hover:text-content"
                >
                  Cancel and return
                </button>
              </div>

              {phaseError && (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  {phaseError}
                </p>
              )}

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-content-faint">
                  Accepted payment methods
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallets', 'EMI'].map(
                    (m) => (
                      <span
                        key={m}
                        className="rounded-lg border border-line bg-surface-muted px-2.5 py-1 text-xs font-medium text-content-muted dark:bg-surface"
                      >
                        {m}
                      </span>
                    ),
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-line bg-surface-muted px-4 py-3.5 dark:bg-surface">
                <ShieldIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-500 dark:text-brand-400" />
                <p className="text-xs leading-relaxed text-content-muted">
                  Your card and UPI details go directly to Razorpay&rsquo;s PCI-DSS compliant
                  checkout — they never touch our servers. Access is activated only after our server
                  verifies the payment.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/plans"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" /> Choose a different plan
            </Link>
          </div>
        </div>

        {/* Order summary — sticky on desktop, first on mobile */}
        <div className="order-1 lg:order-2 lg:col-span-2">
          <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card lg:sticky lg:top-24 dark:bg-surface-elevated">
            <div className="relative overflow-hidden bg-navy px-6 py-5 dark:bg-brand-950">
              <div
                className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full opacity-40"
                style={{
                  background: 'radial-gradient(circle, rgba(200,148,62,0.45), transparent 70%)',
                }}
              />
              <div className="relative flex items-center justify-between gap-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
                  Order summary
                </h2>
                <Badge variant="premium">{durationLabel(session.durationDays)}</Badge>
              </div>
            </div>

            <div className="px-6 py-5">
              <dl className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-content-muted">Plan</dt>
                  <dd className="text-right font-semibold text-content">
                    {session.planName ?? 'Subscription'}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-content-muted">Vault</dt>
                  <dd className="text-right font-semibold text-content">
                    {session.vaultName ?? '—'}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-content-muted">Duration</dt>
                  <dd className="text-right font-semibold text-content">
                    {durationLabel(session.durationDays)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3 border-t border-line pt-3">
                  <dt className="text-content-muted">Subtotal</dt>
                  <dd className="text-right font-semibold text-content">
                    {formatMoney(originalAmount, currency)}
                  </dd>
                </div>
              </dl>

              {/* Coupon */}
              <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface-muted/70 p-3.5 dark:bg-surface">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-content-muted">
                    <TagIcon className="h-3.5 w-3.5 text-brand-500 dark:text-brand-400" /> Coupon
                  </p>
                  {coupon && (
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-xs font-semibold text-content-muted underline-offset-2 hover:text-content hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {coupon ? (
                  <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
                    <span className="flex items-center gap-2">
                      <Badge variant="success">{coupon.code}</Badge>
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Applied
                      </span>
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      −{formatMoney(coupon.discountAmount, currency)}
                    </span>
                  </div>
                ) : (
                  <div className="mt-2.5 flex gap-2">
                    <Input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      disabled={couponStatus === 'applying'}
                      className="!py-2"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyCoupon();
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      className="shrink-0 !px-4"
                      loading={couponStatus === 'applying'}
                      disabled={!couponInput.trim() || couponStatus === 'applying'}
                      onClick={() => applyCoupon()}
                    >
                      Apply
                    </Button>
                  </div>
                )}

                {couponStatus === 'error' && couponError && (
                  <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                    {couponError}
                  </p>
                )}

                {availableCoupons.length > 0 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowCoupons((v) => !v)}
                      aria-expanded={showCoupons}
                      className="flex w-full items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-brand-600 transition-colors hover:text-brand-500 dark:text-brand-400"
                    >
                      <span className="flex items-center gap-1.5">
                        <TagIcon className="h-3.5 w-3.5" /> See coupons ({availableCoupons.length})
                      </span>
                      <ChevronDownIcon
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${
                          showCoupons ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {showCoupons && (
                      <div className="scrollbar-thin mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                        {availableCoupons.map(({ coupon: available, discountAmount: save }) => {
                          const isApplied = coupon?.code === available.code;
                          const label =
                            available.discountType === 'PERCENTAGE'
                              ? `${available.discountValue}% off`
                              : `${formatMoney(available.discountValue, currency)} off`;
                          return (
                            <button
                              key={available.id}
                              type="button"
                              onClick={() => applyCoupon(available.code)}
                              disabled={isApplied || couponStatus === 'applying'}
                              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-all disabled:cursor-default ${
                                isApplied
                                  ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-500/10'
                                  : 'border-line bg-surface hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-sm dark:bg-surface-elevated'
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-bold text-content">
                                  {available.code}
                                </span>
                                <span className="block truncate text-[11px] text-content-muted">
                                  {available.description || label}
                                </span>
                              </span>
                              <span
                                className={`shrink-0 text-[11px] font-bold ${
                                  isApplied
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-brand-600 dark:text-brand-400'
                                }`}
                              >
                                {isApplied ? 'Applied' : `Save ${formatMoney(save, currency)}`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {couponsLoading && availableCoupons.length === 0 && (
                  <p className="mt-2 flex items-center gap-2 text-[11px] text-content-faint">
                    <Spinner className="h-3 w-3" /> Checking offers…
                  </p>
                )}
              </div>

              {/* Totals */}
              <div className="mt-4 space-y-2.5 border-t border-line pt-4">
                {usesCoupon && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Coupon {coupon?.code ?? session.couponCode ?? ''}
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      −{formatMoney(discountAmount, currency)}
                    </span>
                  </div>
                )}
                <div className="flex items-end justify-between gap-3">
                  <span className="text-sm font-semibold text-content">Total due today</span>
                  <span className="text-3xl font-extrabold tracking-tight text-content">
                    {formatMoney(finalAmount, currency)}
                  </span>
                </div>
                {usesCoupon ? (
                  <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    You&rsquo;re saving {formatMoney(discountAmount, currency)} with this offer.
                  </p>
                ) : (
                  availableCoupons.length > 0 && (
                    <p className="text-xs text-content-faint">
                      You have {availableCoupons.length} offer
                      {availableCoupons.length > 1 ? 's' : ''} available — apply one above.
                    </p>
                  )
                )}
              </div>
            </div>

            <div className="border-t border-line bg-surface-muted/60 px-6 py-4 dark:bg-surface">
              <p className="flex items-center gap-2 text-xs text-content-faint">
                <ShieldIcon className="h-3.5 w-3.5" />
                Secure payment · Final amount is always calculated on our server.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[70vh] bg-surface-muted py-8 sm:py-12 dark:bg-surface">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-6">
          <Link
            href="/plans"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-content-muted transition-colors hover:text-content"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Back to plans
          </Link>

          <div className="relative mt-3 overflow-hidden rounded-3xl bg-navy px-6 py-6 shadow-card sm:px-8 sm:py-7 dark:bg-brand-950">
            <div
              className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-40"
              style={{
                background: 'radial-gradient(circle, rgba(200,148,62,0.4), transparent 70%)',
              }}
            />
            <div
              className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full opacity-25"
              style={{
                background: 'radial-gradient(circle, rgba(120,160,255,0.35), transparent 70%)',
              }}
            />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white ring-1 ring-inset ring-white/20">
                <ShieldIcon className="h-3.5 w-3.5 text-gold dark:text-brand-400" /> Secure checkout
              </span>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Complete your purchase
              </h1>
              <p className="mt-1.5 text-sm text-white/70">
                Pay with UPI, cards, net banking or wallets via Razorpay.
              </p>
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
