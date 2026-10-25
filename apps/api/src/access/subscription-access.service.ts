import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralsService } from '../referrals/referrals.service';

export interface VaultAccessEntry {
  vaultId: string;
  subscriptionId: string;
}

export interface VaultAccessCheckResult {
  authorized: boolean;
  reason?: string;
  subscriptionId?: string;
}

export type EffectiveSubscriptionStatus = SubscriptionStatus | 'ACTIVE';

/**
 * Central, reusable service for subscription entitlement and vault access
 * decisions. All premium/entitlement authorization flows must go through this
 * service so that rules stay consistent and are not duplicated in controllers.
 *
 * A subscription is considered "effective-ACTIVE" only when:
 *   - its stored status is ACTIVE, AND
 *   - now is within [startDate, endDate]
 *
 * We never mutate the historical status simply because a date has passed;
 * instead we compute the effective status on the fly (server-side) and expose
 * it alongside the stored status.
 */
@Injectable()
export class SubscriptionAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referrals: ReferralsService,
  ) {}

  /**
   * Compute the effective status of a subscription without mutating the row.
   * Expired / cancelled / pending / failed stored statuses are never treated as
   * active, and an ACTIVE subscription whose endDate has passed is treated as
   * expired for access purposes.
   */
  effectiveStatus(sub: {
    status: SubscriptionStatus;
    startDate: Date | string;
    endDate: Date | string;
    cancelledAt?: Date | string | null;
  }): EffectiveSubscriptionStatus {
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

  /**
   * Returns the subscriptions that are currently valid (status ACTIVE and within
   * date range). Callers must not trust a client-provided status.
   */
  async getActiveSubscriptions(userId: string) {
    const now = new Date();
    const subs = await this.prisma.subscription.findMany({
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
   * All vaults the user can currently access, as a set of unique vault ids,
   * derived ONLY from active subscriptions' snapshot (SubscriptionVaultAccess).
   */
  async getAccessibleVaultIds(userId: string): Promise<string[]> {
    const active = await this.getActiveSubscriptions(userId);
    if (active.length === 0) return [];

    const rows = await this.prisma.subscriptionVaultAccess.findMany({
      where: { subscriptionId: { in: active.map((s) => s.id) } },
      select: { vaultId: true },
    });
    return [...new Set(rows.map((r) => r.vaultId))];
  }

  /**
   * Detailed vault access for the user (vaultId -> subscription that granted it).
   */
  async getUserVaultAccess(userId: string): Promise<VaultAccessEntry[]> {
    const active = await this.getActiveSubscriptions(userId);
    if (active.length === 0) return [];

    const rows = await this.prisma.subscriptionVaultAccess.findMany({
      where: { subscriptionId: { in: active.map((s) => s.id) } },
      select: { vaultId: true, subscriptionId: true },
    });
    return rows.map((r) => ({ vaultId: r.vaultId, subscriptionId: r.subscriptionId }));
  }

  async hasVaultAccess(userId: string, vaultId: string): Promise<boolean> {
    const vaultIds = await this.getAccessibleVaultIds(userId);
    return vaultIds.includes(vaultId);
  }

  /**
   * Full, reusable authorization check used by future premium modules
   * (e.g. opportunities). Never relies on frontend-provided state.
   */
  async requireVaultAccess(userId: string, vaultId: string): Promise<VaultAccessCheckResult> {
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

    const access = await this.prisma.subscriptionVaultAccess.findFirst({
      where: {
        subscriptionId: { in: active.map((s) => s.id) },
        vaultId,
      },
      select: { subscriptionId: true },
    });

    if (!access) {
      return { authorized: false, reason: 'VAULT_NOT_IN_ENTITLEMENTS' };
    }

    return { authorized: true, subscriptionId: access.subscriptionId };
  }

  /**
   * Create a subscription and snapshot the plan's current vault access into
   * SubscriptionVaultAccess within a single transaction. This guarantees
   * historical consistency: later plan changes never rewrite an existing
   * subscription's snapshot; only new subscriptions pick up current plan links.
   *
   * Payment/Razorpay integration is out of scope for this phase; this reusable
   * method is the gateway the payment phase will call, and it is exercised by
   * the entitlement snapshot tests.
   */
  async createSubscriptionWithSnapshot(
    userId: string,
    planId: string,
    options: {
      status?: SubscriptionStatus;
      startDate?: Date;
      endDate?: Date;
      paymentReference?: string;
    } = {},
  ) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: { vaults: true },
    });
    if (!plan || plan.deletedAt || !plan.isActive) {
      throw new Error('PLAN_NOT_AVAILABLE');
    }

    const startDate = options.startDate ?? new Date();
    const endDate =
      options.endDate ?? new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const subscription = await this.prisma.$transaction(async (tx) => {
      const created = await tx.subscription.create({
        data: {
          userId,
          planId,
          startDate,
          endDate,
          status: options.status ?? 'ACTIVE',
          paymentReference: options.paymentReference ?? null,
        },
      });

      if (plan.vaults.length > 0) {
        await tx.subscriptionVaultAccess.createMany({
          data: plan.vaults.map((v) => ({
            subscriptionId: created.id,
            vaultId: v.vaultId,
          })),
        });
      }

      return tx.subscription.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          vaultAccess: { include: { vault: { select: { id: true, name: true } } } },
          plan: true,
        },
      });
    });

    // Confirmed-success point: a newly activated (paid) subscription triggers
    // referral commission accrual for the referrer (best-effort, non-blocking).
    if (this.effectiveStatus(subscription) === 'ACTIVE') {
      await this.referrals.handleSubscriptionActivated(subscription.id);
    }

    return subscription;
  }

  /**
   * Extend an existing subscription by the plan's duration.
   * Used when a recurring payment succeeds.
   */
  async extendSubscription(subscriptionId: string, planDurationDays: number): Promise<void> {
    const sub = await this.prisma.subscription.findUniqueOrThrow({
      where: { id: subscriptionId },
      select: { endDate: true },
    });
    const newEndDate = new Date(sub.endDate.getTime() + planDurationDays * 24 * 60 * 60 * 1000);
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { endDate: newEndDate },
    });
  }

  /**
   * Cancel a subscription (both local and optionally via Razorpay).
   * Sets status to CANCELLED, disables auto-renewal.
   */
  async cancelSubscription(subscriptionId: string, cancellationReason?: string): Promise<void> {
    await this.prisma.subscription.update({
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
