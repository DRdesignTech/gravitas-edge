'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, ErrorState, Input, Skeleton, Spinner } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { getCouponErrorMessage, getErrorMessage } from '@/lib/errors';
import {
  failRvaPayment,
  fetchAvailableRvaCoupons,
  fetchRvaPaymentSession,
  purchaseRvaPlan,
  validateRvaCoupon,
  verifyRvaPayment,
  verifyRvaSubscription,
} from '@/lib/services';
import { AvailableCoupon, RvaPaymentSession } from '@/lib/types';

type Phase = 'form' | 'processing' | 'success' | 'failure' | 'pending';

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

export default function RvaCheckoutPage() {
  const params = useParams<{ paymentId: string }>();
  const paymentId = String(params?.paymentId ?? '');

  return <RvaCheckout key={paymentId} paymentId={paymentId} />;
}

function RvaCheckout({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const { refreshAccess } = useAuth();
  const [session, setSession] = useState<RvaPaymentSession | null>(null);
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

  const loadSession = useCallback(() => {
    setLoading(true);
    setError('');
    fetchRvaPaymentSession(paymentId)
      .then((s) => {
        setSession(s);
        if (s.status === 'SUCCESS') setPhase('success');
        else if (['FAILED', 'CANCELLED', 'REFUNDED'].includes(s.status)) setPhase('failure');
        else if (s.status === 'PENDING' && s.razorpaySubscriptionId) setPhase('pending');
        else setPhase('form');
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [paymentId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (phase === 'success') void refreshAccess();
  }, [phase, refreshAccess]);

  useEffect(() => {
    if (phase !== 'pending') return;
    const interval = window.setInterval(() => {
      fetchRvaPaymentSession(paymentId)
        .then((next) => {
          setSession(next);
          if (next.status === 'SUCCESS') setPhase('success');
          else if (['CANCELLED', 'FAILED', 'REFUNDED'].includes(next.status)) setPhase('failure');
        })
        .catch(() => {});
    }, 3000);
    return () => window.clearInterval(interval);
  }, [paymentId, phase]);

  const recurring = Boolean(session?.razorpaySubscriptionId);

  // Reflect any RVA coupon already frozen on the server session.
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

  // Load the RVA coupons this user can apply to the session's plan.
  useEffect(() => {
    const planId = session?.planId;
    if (!planId || recurring) return;
    let cancelled = false;
    setCouponsLoading(true);
    fetchAvailableRvaCoupons(planId)
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
  }, [session?.planId, recurring]);

  const applyCoupon = async (raw?: string) => {
    const planId = session?.planId;
    if (!planId) return;
    const code = (raw ?? couponInput).trim();
    if (!code) return;
    setCouponStatus('applying');
    setCouponError('');
    try {
      const res = await validateRvaCoupon(code, planId);
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
      const currentCode = session.couponCode ?? '';

      let orderId = session.orderId;
      let keyId = session.keyId;
      let amount = coupon ? coupon.finalAmount : session.finalAmount;
      let currency = session.currency;
      let payId = session.paymentId;

      // The server froze this session's amount. If the user picked a different
      // coupon on this page, start a new server-side RVA session so the order is
      // always priced by the backend.
      if (!recurring && desiredCode !== currentCode && session.planId) {
        const next = await purchaseRvaPlan(session.planId, desiredCode || undefined);
        failRvaPayment(session.paymentId).catch(() => {});
        orderId = next.orderId;
        keyId = next.keyId;
        amount = next.amount;
        currency = next.currency;
        payId = next.paymentId;
        setSession((prev) =>
          prev
            ? {
                ...prev,
                paymentId: payId,
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

      if (!(window as any).Razorpay || (!orderId && !session.razorpaySubscriptionId)) {
        throw new Error('Failed to load Razorpay checkout');
      }

      const rzp = new (window as any).Razorpay({
        key: keyId,
        ...(session.razorpaySubscriptionId
          ? { subscription_id: session.razorpaySubscriptionId }
          : { amount: Math.round(amount * 100), currency, order_id: orderId }),
        name: 'Gravitas Edge',
        description: `${session.planName ?? 'Recruitment Vendor Access'} - ${durationLabel(
          session.durationDays,
        )}`,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_subscription_id: string;
          razorpay_signature: string;
        }) => {
          try {
            if (recurring) {
              const result = await verifyRvaSubscription({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                paymentId: payId,
              });
              if (result.status === 'PENDING') {
                setPhase('pending');
                return;
              }
            } else {
              await verifyRvaPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                paymentId: payId,
              });
            }
            setPhase('success');
            if (payId !== session.paymentId) {
              router.replace(`/recruitment-vendor/checkout/${payId}`);
            } else {
              loadSession();
            }
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

  const startOver = async () => {
    if (!session || retrying) return;
    setRetrying(true);
    setPhaseError('');
    try {
      const next = await purchaseRvaPlan(
        session.planId ?? '',
        session.couponCode ?? undefined,
        recurring,
      );
      router.replace(`/recruitment-vendor/checkout/${next.paymentId}`);
    } catch (err) {
      setPhaseError(getErrorMessage(err));
      setRetrying(false);
    }
  };

  const cancelSession = async () => {
    if (phase === 'processing') return;
    setPhase('processing');
    try {
      await failRvaPayment(paymentId);
      router.push('/recruitment-vendor');
    } catch (err) {
      setPhaseError(getErrorMessage(err));
      setPhase('form');
    }
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
  const originalAmount = coupon ? coupon.originalAmount : session.originalAmount;
  const discountAmount = coupon ? coupon.discountAmount : 0;
  const finalAmount = coupon ? coupon.finalAmount : session.finalAmount;
  const usesCoupon = discountAmount > 0;

  if (phase === 'pending') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-content">Payment confirmation pending</h1>
        <p className="mt-3 text-content-muted">
          Your access will unlock after Razorpay confirms the charge. This page updates
          automatically.
        </p>
      </div>
    );
  }

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
                <div className="shrink-0 text-right">
                  <p className="text-xl font-extrabold tracking-tight text-content">
                    {formatMoney(session.finalAmount, currency)}
                  </p>
                  {session.discountAmount > 0 && (
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Saved {formatMoney(session.discountAmount, currency)}
                      {session.couponCode ? ` · ${session.couponCode}` : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                className="w-full !py-3.5 !text-base"
                onClick={() => router.push('/recruitment-vendor/jobs')}
              >
                Browse RVA opportunities
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
              <Button className="w-full !py-3.5 !text-base" onClick={startOver} loading={retrying}>
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
              <dt className="text-content-muted">Subtotal</dt>
              <dd className="text-right font-semibold text-content">
                {formatMoney(originalAmount, currency)}
              </dd>
            </div>
          </dl>

          {/* Coupon */}
          {!recurring && (
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
          )}

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
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-content">Total due today</span>
              <span className="text-right text-2xl font-extrabold tracking-tight text-content">
                {formatMoney(finalAmount, currency)}
              </span>
            </div>
          </div>

          {recurring && (
            <p className="mt-4 text-sm text-content-muted">
              AutoPay renews at {formatMoney(finalAmount, currency)} every{' '}
              {session.durationDays === 30
                ? 'month'
                : `${Number(session.durationDays) / 30} months`}{' '}
              while enabled.
            </p>
          )}
          <Button
            className="mt-6 w-full !py-4 !text-base font-bold"
            loading={phase === 'processing'}
            disabled={phase === 'processing'}
            onClick={pay}
          >
            {phase === 'processing'
              ? 'Opening Razorpay…'
              : `${recurring ? 'Set up AutoPay ·' : 'Pay'} ${formatMoney(finalAmount, currency)}`}
          </Button>
          <button
            type="button"
            disabled={phase === 'processing'}
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
