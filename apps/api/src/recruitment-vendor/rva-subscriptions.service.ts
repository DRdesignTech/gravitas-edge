import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RvaAccessService } from './rva-access.service';
import { durationLabel } from '../subscriptions/pricing-catalog';

/**
 * Read models for a user's own Recruitment Vendor Access subscriptions and
 * entitlements. Always scoped to `RecruitmentVendorSubscription` so results are
 * never mixed with Opportunity Vault subscriptions.
 */
@Injectable()
export class RvaSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: RvaAccessService,
  ) {}

  async listMine(userId: string) {
    const subs = await this.prisma.recruitmentVendorSubscription.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    return subs.map((s) => this.serialize(s));
  }

  async listActive(userId: string) {
    const active = await this.access.getActiveSubscriptions(userId);
    if (active.length === 0) return [];
    const subs = await this.prisma.recruitmentVendorSubscription.findMany({
      where: { id: { in: active.map((s) => s.id) } },
      include: { plan: true },
      orderBy: { endDate: 'asc' },
    });
    return subs.map((s) => this.serialize(s));
  }

  async findMine(userId: string, id: string) {
    const sub = await this.prisma.recruitmentVendorSubscription.findFirst({
      where: { id, userId },
      include: { plan: true },
    });
    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }
    return this.serialize(sub);
  }

  /** Lightweight entitlement summary for the current user. */
  async getMyAccess(userId: string) {
    const entitlement = await this.access.getActiveEntitlement(userId);
    if (!entitlement) {
      return { hasAccess: false, vault: 'recruitment-vendor-access', subscription: null };
    }
    return {
      hasAccess: true,
      vault: 'recruitment-vendor-access',
      subscription: this.serialize(entitlement),
    };
  }

  private serialize(s: any) {
    const effectiveStatus = this.access.effectiveStatus(s);
    return {
      id: s.id,
      status: s.status,
      effectiveStatus,
      paymentReference: s.paymentReference,
      startDate: s.startDate,
      endDate: s.endDate,
      cancelledAt: s.cancelledAt,
      createdAt: s.createdAt,
      vault: 'recruitment-vendor-access',
      plan: s.plan
        ? {
            id: s.plan.id,
            name: s.plan.name,
            price: Number(s.plan.price),
            regularPrice: Number(s.plan.regularPrice),
            discountedPrice: Number(s.plan.price),
            discountPercentage: s.plan.discountPercentage,
            currency: s.plan.currency,
            durationDays: s.plan.durationDays,
            durationLabel: durationLabel(s.plan.durationDays),
          }
        : null,
    };
  }
}
