'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { purchasePlan, validateCoupon } from '@/lib/services';
import { CouponValidationResult, PricingPlan } from '@/lib/types';
import { Badge, Button, Input, Modal, Spinner, useToast } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { getCouponErrorMessage, getErrorMessage } from '@/lib/errors';

const STORAGE_KEY_PREFIX = 'ge_checkout_coupon_';

function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, '');
}

function storageKey(planId: string): string {
  return `${STORAGE_KEY_PREFIX}${planId}`;
}

export default function PlanCheckoutModal({
  plan,
  vaultName,
  vaultId,
  open,
  onClose,
  returnTo,
}: {
  plan: PricingPlan;
  vaultName: string;
  vaultId: string;
  open: boolean;
  onClose: () => void;
  /** Where the user should land after completing (or aborting) payment. */
  returnTo?: string;
}) {
  const { showToast } = useToast();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState<CouponValidationResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'applying' | 'applied' | 'error'>('idle');
  const [couponError, setCouponError] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  const key = storageKey(plan.id);
  const basePrice = plan.discountedPrice ?? plan.price;
  const currency = plan.currency;

  useEffect(() => {
    if (!open) return;
    setCode('');
    setCoupon(null);
    setStatus('idle');
    setCouponError('');
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        setCode(saved);
        applyCode(saved);
      }
    } catch {
      // ignore storage access errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  const applyCode = async (raw?: string) => {
    const c = normalizeCode(raw ?? code);
    if (!c) return;
    setStatus('applying');
    setCouponError('');
    try {
      const result = await validateCoupon(c, plan.id);
      setCoupon(result);
      setStatus('applied');
      try {
        sessionStorage.setItem(key, c);
      } catch {
        // ignore storage access errors
      }
    } catch (err) {
      setCoupon(null);
      setStatus('error');
      setCouponError(getCouponErrorMessage(err));
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCode('');
    setStatus('idle');
    setCouponError('');
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore storage access errors
    }
  };

  const confirm = async () => {
    setPurchasing(true);
    try {
      const started = await purchasePlan(plan.id, vaultId, coupon?.coupon.code);
      removeCoupon();
      onClose();
      router.push(
        `/checkout/${started.paymentId}${
          returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''
        }`,
      );
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setPurchasing(false);
    }
  };

  const finalPrice = coupon ? coupon.finalAmount : basePrice;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Checkout"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-content-muted">
            Total
            <span className="ml-2 text-2xl font-extrabold tracking-tight text-content">
              {formatMoney(finalPrice, currency)}
            </span>
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={purchasing}
              disabled={status === 'applying'}
              onClick={confirm}
            >
              Continue to Payment
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-line bg-surface-muted p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-content-muted">{vaultName}</p>
              <h3 className="text-lg font-bold text-content">
                {plan.durationLabel} plan
              </h3>
            </div>
            <div className="text-right">
              {plan.regularPrice > basePrice && (
                <p className="text-sm text-content-faint line-through">
                  {formatMoney(plan.regularPrice, currency)}
                </p>
              )}
              <p className="text-xl font-extrabold text-content">{formatMoney(basePrice, currency)}</p>
            </div>
          </div>
        </div>

        {coupon ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950">
              <div className="flex items-center gap-2">
                <Badge variant="success">{coupon.coupon.code}</Badge>
                <p className="text-sm text-content-muted">
                  −{formatMoney(coupon.discountAmount, currency)}
                </p>
              </div>
              <button
                onClick={removeCoupon}
                className="text-xs font-semibold text-content-muted underline-offset-2 hover:text-content hover:underline"
              >
                Remove
              </button>
            </div>
            <div className="flex items-center justify-between border-b border-line pb-2 text-sm">
              <p className="text-content-muted">Base price</p>
              <p className="font-medium text-content">{formatMoney(coupon.originalAmount, currency)}</p>
            </div>
            <div className="flex items-center justify-between border-b border-line pb-2 text-sm">
              <p className="text-emerald-600 dark:text-emerald-400">Coupon discount</p>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">
                −{formatMoney(coupon.discountAmount, currency)}
              </p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <p className="font-medium text-content">Total after coupon</p>
              <p className="font-extrabold text-content">{formatMoney(coupon.finalAmount, currency)}</p>
            </div>
            <p className="text-xs text-content-faint">
              Your final amount is recalculated on our server when you confirm — the price cannot be
              altered by editing the page.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                label="Have a coupon code?"
                placeholder="e.g. SAVE20"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={status === 'applying'}
              />
              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  loading={status === 'applying'}
                  disabled={!code.trim()}
                  onClick={() => applyCode()}
                >
                  Apply
                </Button>
              </div>
            </div>
            {status === 'applying' && (
              <p className="flex items-center gap-2 text-sm text-content-muted">
                <Spinner className="h-3.5 w-3.5" /> Checking coupon...
              </p>
            )}
            {status === 'error' && (
              <p className="text-sm text-red-600 dark:text-red-400">{couponError}</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}