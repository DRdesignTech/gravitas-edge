import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { durationLabel } from '../subscriptions/pricing-catalog';

/**
 * Public Recruitment Vendor Access plan catalog. Plans and prices are entirely
 * database-driven (admin-managed); nothing is hardcoded here.
 */
@Injectable()
export class RvaPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicPlans() {
    const plans = await this.prisma.recruitmentVendorPlan.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { durationDays: 'asc' }, { price: 'asc' }],
    });

    return plans.map((p) => this.serialize(p));
  }

  async findPublicPlan(id: string) {
    const plan = await this.prisma.recruitmentVendorPlan.findFirst({
      where: { id, deletedAt: null, isActive: true },
    });
    return plan ? this.serialize(plan) : null;
  }

  private serialize(plan: {
    id: string;
    name: string;
    description: string | null;
    price: unknown;
    regularPrice: unknown;
    discountPercentage: number;
    currency: string;
    durationDays: number;
    sortOrder: number;
  }) {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: Number(plan.price),
      regularPrice: Number(plan.regularPrice),
      discountedPrice: Number(plan.price),
      discountPercentage: plan.discountPercentage,
      currency: plan.currency,
      durationDays: plan.durationDays,
      durationLabel: durationLabel(plan.durationDays),
      vault: 'recruitment-vendor-access',
    };
  }
}
