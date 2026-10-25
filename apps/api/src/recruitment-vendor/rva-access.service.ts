import { Injectable } from '@nestjs/common';
import { RecruitmentVendorSubscription, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type RvaEffectiveStatus = SubscriptionStatus | 'ACTIVE';

export interface RvaAccessCheckResult {
  authorized: boolean;
  reason?: 'UNAUTHENTICATED' | 'USER_NOT_FOUND' | 'NO_ACTIVE_SUBSCRIPTION';
  subscriptionId?: string;
}

/**
 * Entitlement/access decisions for the Recruitment Vendor Access vault.
 *
 * IMPORTANT — vault isolation: this service ONLY ever reads
 * `RecruitmentVendorSubscription`. It never consults `Subscription` or
 * `SubscriptionVaultAccess`, so an existing Opportunity Vault subscription can
 * never grant RVA access, and vice-versa. All RVA premium/entitlement flows
 * must go through this service (never the generic SubscriptionAccessService).
 *
 * A RVA subscription is effective-ACTIVE only when its stored status is ACTIVE
 * AND now is within [startDate, endDate] (server-computed, never trusts client
 * state and never mutates the stored status).
 */
@Injectable()
export class RvaAccessService {
  constructor(private readonly prisma: PrismaService) {}

  effectiveStatus(sub: {
    status: SubscriptionStatus;
    startDate: Date | string;
    endDate: Date | string;
    cancelledAt?: Date | string | null;
  }): RvaEffectiveStatus {
    if (sub.status !== 'ACTIVE') {
      return sub.status;
    }
    const now = new Date();
    const start = new Date(sub.startDate);
    const end = new Date(sub.endDate);
    if (now < start) return 'PENDING';
    if (now > end || (sub.cancelledAt && new Date(sub.cancelledAt) <= now)) {
      return 'EXPIRED';
    }
    return 'ACTIVE';
  }

  /** Active (ACTIVE + within date range) RVA subscriptions for a user. */
  async getActiveSubscriptions(userId: string): Promise<RecruitmentVendorSubscription[]> {
    const now = new Date();
    const subs = await this.prisma.recruitmentVendorSubscription.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { endDate: 'asc' },
    });
    return subs.filter((s) => this.effectiveStatus(s) === 'ACTIVE');
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subs = await this.getActiveSubscriptions(userId);
    return subs.length > 0;
  }

  /**
   * The single best entitlement for a user (latest-ending active subscription),
   * including its plan, or null when the user has no active RVA access.
   */
  async getActiveEntitlement(userId: string) {
    const active = await this.getActiveSubscriptions(userId);
    if (active.length === 0) return null;
    const withPlan = await this.prisma.recruitmentVendorSubscription.findFirst({
      where: { id: active[active.length - 1].id },
      include: { plan: true },
    });
    return withPlan;
  }

  /**
   * Full reusable authorization check for premium RVA content. Returns the
   * granting subscription id when authorized. Never relies on frontend state.
   */
  async requireAccess(userId: string | undefined | null): Promise<RvaAccessCheckResult> {
    if (!userId) {
      return { authorized: false, reason: 'UNAUTHENTICATED' };
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      return { authorized: false, reason: 'USER_NOT_FOUND' };
    }
    const active = await this.getActiveSubscriptions(userId);
    if (active.length === 0) {
      return { authorized: false, reason: 'NO_ACTIVE_SUBSCRIPTION' };
    }
    return { authorized: true, subscriptionId: active[active.length - 1].id };
  }

  /**
   * Extend an existing RVA subscription by the plan's duration.
   * Used when a recurring payment succeeds.
   */
  async extendSubscription(subscriptionId: string, planDurationDays: number): Promise<void> {
    const sub = await this.prisma.recruitmentVendorSubscription.findUniqueOrThrow({
      where: { id: subscriptionId },
      select: { endDate: true },
    });
    const newEndDate = new Date(sub.endDate.getTime() + planDurationDays * 24 * 60 * 60 * 1000);
    await this.prisma.recruitmentVendorSubscription.update({
      where: { id: subscriptionId },
      data: { endDate: newEndDate },
    });
  }

  /**
   * Cancel an RVA subscription.
   * Sets status to CANCELLED, disables auto-renewal.
   */
  async cancelSubscription(subscriptionId: string, cancellationReason?: string): Promise<void> {
    await this.prisma.recruitmentVendorSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: cancellationReason ?? 'Cancelled by user',
        autoRenew: false,
        nextBillingDate: null,
      },
    });
  }
}
