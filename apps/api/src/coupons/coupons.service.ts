import { Injectable, NotFoundException } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import {
  computeCouponAmounts,
  COUNTED_PAYMENT_STATUSES,
  CouponAmounts,
  couponError,
  CouponSummary,
  normalizeCouponCode,
  serializeCouponSummary,
} from './coupon.util';

/** Minimal Prisma surface the helpers need - works for the client and for a `$transaction` handle. */
export type CouponExecutor = Pick<Prisma.TransactionClient, 'coupon' | 'couponUsage' | '$queryRaw'>;

export type CouponWithRules = Coupon & {
  plans: { planId: string }[];
  users: { userId: string }[];
};

export interface CouponValidationResult extends CouponAmounts {
  coupon: CouponSummary;
  planId: string;
  planName: string;
  currency: string;
}

/**
 * User-facing coupon validation and the shared eligibility/limit rules used by
 * the checkout validation endpoint and by the purchase flow.
 *
 * Every check runs on the backend; clients only ever send a code + plan id.
 * Error responses always carry friendly copy plus a stable `code`
 * (COUPON_EXPIRED, COUPON_NOT_ELIGIBLE, ...) so UIs can render precise states
 * without parsing free-form text.
 */
@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate a coupon for a user + plan and return the server-calculated
   * price breakdown (original / discount / final). Never trusts client prices.
   */
  async validateForUser(userId: string, dto: ValidateCouponDto): Promise<CouponValidationResult> {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id: dto.planId, deletedAt: null, isActive: true },
      select: { id: true, name: true, price: true, currency: true },
    });
    if (!plan) {
      throw new NotFoundException('Plan is not available for purchase');
    }

    const coupon = await this.resolve(this.prisma, dto.couponCode);
    this.assertEligible(coupon, userId, plan.id, new Date());
    await this.assertLimits(this.prisma, coupon, userId);

    const amounts = computeCouponAmounts(
      coupon.discountType,
      Number(coupon.discountValue),
      Number(plan.price),
    );

    return {
      coupon: serializeCouponSummary(coupon),
      planId: plan.id,
      planName: plan.name,
      currency: plan.currency,
      ...amounts,
    };
  }

  /** Look up a coupon by its normalized (trimmed, upper-cased) code. */
  async resolve(executor: CouponExecutor, rawCode: string): Promise<CouponWithRules> {
    const code = normalizeCouponCode(rawCode);
    if (!code) {
      throw couponError('COUPON_NOT_FOUND');
    }
    const coupon = await executor.coupon.findFirst({
      where: { code: { equals: code, mode: 'insensitive' }, deletedAt: null },
      include: { plans: { select: { planId: true } }, users: { select: { userId: true } } },
    });
    if (!coupon) {
      throw couponError('COUPON_NOT_FOUND');
    }
    return coupon;
  }

  /** Re-read a coupon by id (used after the row lock is acquired). */
  async reload(executor: CouponExecutor, id: string): Promise<CouponWithRules | null> {
    return executor.coupon.findFirst({
      where: { id, deletedAt: null },
      include: { plans: { select: { planId: true } }, users: { select: { userId: true } } },
    });
  }

  /**
   * Serialize concurrent redemptions: lock the coupon row so simultaneous
   * requests re-check the usage limits against each other's commits instead of
   * reading a stale count.
   */
  async lock(executor: CouponExecutor, couponId: string): Promise<void> {
    await executor.$queryRaw<
      unknown[]
    >`SELECT "id" FROM "Coupon" WHERE "id" = ${couponId} FOR UPDATE`;
  }

  /** Status/eligibility rules that do not depend on usage counts. */
  assertEligible(coupon: CouponWithRules, userId: string, planId: string, now: Date = new Date()) {
    if (!coupon.isActive) {
      throw couponError('COUPON_DISABLED');
    }
    if (now < coupon.validFrom) {
      throw couponError('COUPON_NOT_STARTED');
    }
    if (now > coupon.validUntil) {
      throw couponError('COUPON_EXPIRED');
    }
    if (!coupon.appliesToAllUsers && !coupon.users.some((u) => u.userId === userId)) {
      throw couponError('COUPON_NOT_ELIGIBLE');
    }
    if (coupon.plans.length > 0 && !coupon.plans.some((p) => p.planId === planId)) {
      throw couponError('COUPON_WRONG_PLAN');
    }
    const value = Number(coupon.discountValue);
    if (!Number.isFinite(value) || value <= 0) {
      // Misconfigured discount: never hand out a broken coupon.
      throw couponError('COUPON_NOT_FOUND');
    }
    if (coupon.discountType === 'PERCENTAGE' && value > 100) {
      throw couponError('COUPON_NOT_FOUND');
    }
  }

  /**
   * Global + per-user usage limits. Redemptions whose payment failed, was
   * cancelled or refunded release their slot; everything else counts.
   */
  async assertLimits(executor: CouponExecutor, coupon: CouponWithRules, userId: string) {
    const counted = {
      couponId: coupon.id,
      payment: { status: { in: COUNTED_PAYMENT_STATUSES } },
    };
    const [totalUsed, usedByUser] = await Promise.all([
      executor.couponUsage.count({ where: counted }),
      executor.couponUsage.count({ where: { ...counted, userId } }),
    ]);

    if (coupon.usageLimit != null && totalUsed >= coupon.usageLimit) {
      throw couponError('COUPON_LIMIT_REACHED');
    }
    if (usedByUser >= coupon.perUserUsageLimit) {
      throw couponError('COUPON_USER_LIMIT_REACHED');
    }
  }

  /** Server-side discount math for a coupon against a plan's charged price. */
  computeAmounts(coupon: { discountType: string; discountValue: unknown }, originalAmount: number) {
    return computeCouponAmounts(coupon.discountType, Number(coupon.discountValue), originalAmount);
  }
}
