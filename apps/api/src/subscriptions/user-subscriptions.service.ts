import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionAccessService } from '../access/subscription-access.service';
import { RazorpayService } from '../payments/razorpay.service';

/**
 * Serializes a subscription for the owning user - never leaks internal/security
 * fields such as payment references or processor ids.
 */
function serializeUserSubscription(sub: any) {
  return {
    id: sub.id,
    plan: {
      id: sub.plan?.id,
      name: sub.plan?.name,
      description: sub.plan?.description,
      price: sub.plan?.price,
      regularPrice: sub.plan?.regularPrice,
      discountPercentage: sub.plan?.discountPercentage,
      currency: sub.plan?.currency,
      durationDays: sub.plan?.durationDays,
    },
    status: sub.status,
    startDate: sub.startDate,
    endDate: sub.endDate,
    createdAt: sub.createdAt,
    cancelledAt: sub.cancelledAt ?? null,
    vaultAccess: (sub.vaultAccess ?? []).map((va: any) => ({
      vaultId: va.vaultId,
      vaultName: va.vault?.name ?? null,
    })),
  };
}

@Injectable()
export class UserSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SubscriptionAccessService,
    private readonly razorpayService: RazorpayService,
  ) {}

  private baseInclude() {
    return {
      plan: {
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          regularPrice: true,
          discountPercentage: true,
          currency: true,
          durationDays: true,
        },
      },
      vaultAccess: {
        select: { vaultId: true, vault: { select: { id: true, name: true } } },
      },
    };
  }

  /** List the authenticated user's own subscriptions (no security fields). */
  async listMine(userId: string) {
    const subs = await this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: this.baseInclude(),
    });
    return subs.map(serializeUserSubscription);
  }

  /** Get one of the user's own subscriptions. Enforces ownership (no IDOR). */
  async findMine(userId: string, subscriptionId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, userId },
      include: this.baseInclude(),
    });
    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }
    return serializeUserSubscription(sub);
  }

  /**
   * Public subscription-plan catalog: active plans with the vaults they grant.
   * Used by the website pricing page. Exposes only safe public fields.
   */
  async listPublicPlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { price: 'asc' },
      include: {
        vaults: {
          where: { vault: { deletedAt: null } },
          include: { vault: { select: { id: true, name: true } } },
        },
      },
    });
    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      regularPrice: p.regularPrice,
      discountPercentage: p.discountPercentage,
      currency: p.currency,
      durationDays: p.durationDays,
      vaults: p.vaults.map((v) => v.vault),
    }));
  }

  /**
   * Return the user's currently active subscriptions, determined server-side.
   * A subscription whose stored status is ACTIVE but whose endDate has passed
   * is reported with effective status EXPIRED and excluded.
   */
  async listActive(userId: string) {
    const now = new Date();
    const subs = await this.prisma.subscription.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { endDate: 'asc' },
      include: this.baseInclude(),
    });

    return subs
      .map((s) => ({
        // effectiveStatus never mutates the row - it only computes for this response.
        ...serializeUserSubscription(s),
        effectiveStatus: this.access.effectiveStatus(s),
        isActive: this.access.effectiveStatus(s) === 'ACTIVE',
      }))
      .filter((s) => s.isActive && s.startDate <= now && s.endDate >= now);
  }

  async cancelSubscription(userId: string, subscriptionId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, userId },
    });
    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }
    if (sub.razorpaySubscriptionId) {
      try {
        await this.razorpayService.cancelSubscription(sub.razorpaySubscriptionId, true);
      } catch (e) {
        // Continue with local cancellation even if Razorpay call fails
      }
    }
    await this.access.cancelSubscription(sub.id, 'Cancelled by user');
    return { success: true, message: 'Subscription cancelled. Access remains until end date.' };
  }
}
