import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RecruitmentVendorCoupon } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RvaValidateCouponDto } from './dto/rva-validate-coupon.dto';
import {
  computeCouponAmounts,
  COUNTED_PAYMENT_STATUSES,
  CouponAmounts,
  couponError,
  CouponSummary,
  normalizeCouponCode,
  serializeCouponSummary,
} from '../coupons/coupon.util';

export interface RvaAvailableCoupon extends CouponAmounts {
  coupon: CouponSummary;
}

export interface RvaAvailableCouponsResult {
  planId: string;
  currency: string;
  originalAmount: number;
  coupons: RvaAvailableCoupon[];
}

/**
 * Minimal Prisma surface the helpers need - works for the client and for a
 * `$transaction` handle. Scoped to the RVA coupon tables so nothing here can
 * ever touch the Opportunity Vault coupon tables.
 */
export type RvaCouponExecutor = Pick<
  Prisma.TransactionClient,
  'recruitmentVendorCoupon' | 'recruitmentVendorCouponUsage' | '$queryRaw'
>;

export type RvaCouponWithRules = RecruitmentVendorCoupon & {
  plans: { planId: string }[];
  users: { userId: string }[];
};

export interface RvaCouponValidationResult extends CouponAmounts {
  coupon: CouponSummary;
  planId: string;
  planName: string;
  currency: string;
}

/**
 * RVA-only coupon validation and the shared eligibility/limit rules used by the
 * checkout validation endpoint and by the RVA purchase flow.
 *
 * This service only ever reads/writes the `RecruitmentVendor*` coupon tables;
 * it shares the pure discount/status/error helpers with the vault coupon
 * service (they contain no data coupling) so both vaults behave identically
 * without sharing any coupon rows.
 */
@Injectable()
export class RvaCouponsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate an RVA coupon for a user + RVA plan and return the server-
   * calculated price breakdown. Never trusts client prices.
   */
  async validateForUser(
    userId: string,
    dto: RvaValidateCouponDto,
  ): Promise<RvaCouponValidationResult> {
    const plan = await this.prisma.recruitmentVendorPlan.findFirst({
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

  /**
   * List every RVA coupon the given user can currently redeem against an RVA
   * plan, with the server-calculated discount for that plan. Applies the exact
   * same eligibility + limit rules used by validation and the purchase flow.
   */
  async listAvailableForUser(userId: string, planId: string): Promise<RvaAvailableCouponsResult> {
    const plan = await this.prisma.recruitmentVendorPlan.findFirst({
      where: { id: planId, deletedAt: null, isActive: true },
      select: { id: true, price: true, currency: true },
    });
    if (!plan) {
      throw new NotFoundException('Plan is not available for purchase');
    }

    const now = new Date();
    const candidates = await this.prisma.recruitmentVendorCoupon.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      include: { plans: { select: { planId: true } }, users: { select: { userId: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const coupons: RvaAvailableCoupon[] = [];
    for (const coupon of candidates) {
      try {
        this.assertEligible(coupon, userId, plan.id, now);
        await this.assertLimits(this.prisma, coupon, userId);
      } catch {
        // Skip coupons this user can't use for this plan right now.
        continue;
      }
      const amounts = computeCouponAmounts(
        coupon.discountType,
        Number(coupon.discountValue),
        Number(plan.price),
      );
      coupons.push({ coupon: serializeCouponSummary(coupon), ...amounts });
    }

    return {
      planId: plan.id,
      currency: plan.currency,
      originalAmount: Number(plan.price),
      coupons,
    };
  }

  /** Look up an RVA coupon by its normalized (trimmed, upper-cased) code. */
  async resolve(executor: RvaCouponExecutor, rawCode: string): Promise<RvaCouponWithRules> {
    const code = normalizeCouponCode(rawCode);
    if (!code) {
      throw couponError('COUPON_NOT_FOUND');
    }
    const coupon = await executor.recruitmentVendorCoupon.findFirst({
      where: { code: { equals: code, mode: 'insensitive' }, deletedAt: null },
      include: { plans: { select: { planId: true } }, users: { select: { userId: true } } },
    });
    if (!coupon) {
      throw couponError('COUPON_NOT_FOUND');
    }
    return coupon;
  }

  /** Re-read an RVA coupon by id (used after the row lock is acquired). */
  async reload(executor: RvaCouponExecutor, id: string): Promise<RvaCouponWithRules | null> {
    return executor.recruitmentVendorCoupon.findFirst({
      where: { id, deletedAt: null },
      include: { plans: { select: { planId: true } }, users: { select: { userId: true } } },
    });
  }

  /**
   * Serialize concurrent redemptions: lock the RVA coupon row so simultaneous
   * requests re-check the usage limits against each other's commits instead of
   * reading a stale count.
   */
  async lock(executor: RvaCouponExecutor, couponId: string): Promise<void> {
    await executor.$queryRaw<
      unknown[]
    >`SELECT "id" FROM "RecruitmentVendorCoupon" WHERE "id" = ${couponId} FOR UPDATE`;
  }

  /** Status/eligibility rules that do not depend on usage counts. */
  assertEligible(
    coupon: RvaCouponWithRules,
    userId: string,
    planId: string,
    now: Date = new Date(),
  ) {
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
  async assertLimits(executor: RvaCouponExecutor, coupon: RvaCouponWithRules, userId: string) {
    const counted = {
      couponId: coupon.id,
      payment: { status: { in: COUNTED_PAYMENT_STATUSES } },
    };
    const [totalUsed, usedByUser] = await Promise.all([
      executor.recruitmentVendorCouponUsage.count({ where: counted }),
      executor.recruitmentVendorCouponUsage.count({ where: { ...counted, userId } }),
    ]);

    if (coupon.usageLimit != null && totalUsed >= coupon.usageLimit) {
      throw couponError('COUPON_LIMIT_REACHED');
    }
    if (usedByUser >= coupon.perUserUsageLimit) {
      throw couponError('COUPON_USER_LIMIT_REACHED');
    }
  }

  /** Server-side discount math for a coupon against an RVA plan's charged price. */
  computeAmounts(coupon: { discountType: string; discountValue: unknown }, originalAmount: number) {
    return computeCouponAmounts(coupon.discountType, Number(coupon.discountValue), originalAmount);
  }
}
