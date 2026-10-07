import { BadRequestException } from '@nestjs/common';
import { CouponDiscountType, PaymentStatus } from '@prisma/client';

/**
 * Pure coupon helpers: code normalization, discount math, status derivation
 * and the stable error codes surfaced to clients.
 *
 * Discount math always runs on the SERVER. The final payable price is derived
 * from the plan price stored in the database - never from anything a client
 * sends - so a coupon can only reduce the amount, never push it below zero,
 * and a percentage discount is capped at 100%.
 */

export type CouponErrorCode =
  | 'COUPON_NOT_FOUND'
  | 'COUPON_DISABLED'
  | 'COUPON_NOT_STARTED'
  | 'COUPON_EXPIRED'
  | 'COUPON_NOT_ELIGIBLE'
  | 'COUPON_WRONG_PLAN'
  | 'COUPON_LIMIT_REACHED'
  | 'COUPON_USER_LIMIT_REACHED';

/** User-facing copy for every coupon failure. Never leaks internals. */
export const COUPON_ERROR_MESSAGES: Record<CouponErrorCode, string> = {
  COUPON_NOT_FOUND: 'Invalid coupon code.',
  COUPON_DISABLED: 'This coupon is no longer available.',
  COUPON_NOT_STARTED: 'This coupon is not active yet.',
  COUPON_EXPIRED: 'This coupon has expired.',
  COUPON_NOT_ELIGIBLE: 'This coupon is not available for your account.',
  COUPON_WRONG_PLAN: 'This coupon cannot be used for this plan.',
  COUPON_LIMIT_REACHED: 'This coupon has reached its usage limit.',
  COUPON_USER_LIMIT_REACHED: 'You have already used this coupon.',
};

/** Throws a 400 carrying both friendly copy and a stable machine code. */
export function couponError(code: CouponErrorCode): BadRequestException {
  return new BadRequestException({ message: COUPON_ERROR_MESSAGES[code], code });
}

/**
 * Coupons are case-insensitive and whitespace-safe: stored trimmed/upper-cased
 * and looked up the same way, so "  save20 " === "SAVE20".
 */
export function normalizeCouponCode(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\s+/g, '').toUpperCase();
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface CouponAmounts {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
}

/**
 * Server-authoritative price breakdown for a coupon applied to `originalAmount`.
 *
 * - PERCENTAGE: capped at 100% (discount can never exceed the original amount)
 * - FIXED:      capped at the original amount (final price never below 0)
 */
export function computeCouponAmounts(
  discountType: CouponDiscountType | string,
  discountValue: number,
  originalAmount: number,
): CouponAmounts {
  const original = roundMoney(Math.max(0, originalAmount));
  const value = Number.isFinite(discountValue) ? discountValue : 0;

  let discount =
    discountType === 'PERCENTAGE'
      ? roundMoney((original * Math.min(100, Math.max(0, value))) / 100)
      : roundMoney(Math.max(0, value));

  discount = Math.min(discount, original);
  const finalAmount = Math.max(0, roundMoney(original - discount));

  return { originalAmount: original, discountAmount: discount, finalAmount };
}

/** Payment states whose redemptions still count towards the usage limits. */
export const COUNTED_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.CREATED,
  PaymentStatus.PENDING,
  PaymentStatus.SUCCESS,
];

export type CouponStatus =
  'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'DISABLED' | 'USAGE_LIMIT_REACHED' | 'ARCHIVED';

/**
 * Derived status badge. Precedence: archived > disabled > schedule window >
 * global usage limit > active.
 */
export function computeCouponStatus(
  coupon: {
    isActive: boolean;
    validFrom: Date;
    validUntil: Date;
    usageLimit: number | null;
    deletedAt: Date | null;
  },
  usageCount: number,
  now: Date = new Date(),
): CouponStatus {
  if (coupon.deletedAt) return 'ARCHIVED';
  if (!coupon.isActive) return 'DISABLED';
  if (now < coupon.validFrom) return 'SCHEDULED';
  if (now > coupon.validUntil) return 'EXPIRED';
  if (coupon.usageLimit != null && usageCount >= coupon.usageLimit) {
    return 'USAGE_LIMIT_REACHED';
  }
  return 'ACTIVE';
}

/** Stable shape returned whenever a coupon is echoed back to a client. */
export interface CouponSummary {
  id: string;
  code: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  validFrom: Date | string;
  validUntil: Date | string;
  usageLimit: number | null;
  perUserUsageLimit: number;
  appliesToAllUsers: boolean;
  isActive: boolean;
}

export function serializeCouponSummary(
  coupon:
    | CouponSummary
    | {
        id: string;
        code: string;
        description?: string | null;
        discountType: CouponDiscountType;
        discountValue: unknown;
        validFrom: Date;
        validUntil: Date;
        usageLimit: number | null;
        perUserUsageLimit: number;
        appliesToAllUsers: boolean;
        isActive: boolean;
      },
): CouponSummary {
  return {
    id: coupon.id,
    code: coupon.code,
    description: coupon.description ?? null,
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue),
    validFrom: coupon.validFrom,
    validUntil: coupon.validUntil,
    usageLimit: coupon.usageLimit,
    perUserUsageLimit: coupon.perUserUsageLimit,
    appliesToAllUsers: coupon.appliesToAllUsers,
    isActive: coupon.isActive,
  };
}
