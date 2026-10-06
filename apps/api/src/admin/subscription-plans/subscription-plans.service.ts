import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { calculateDiscountPercentage } from '@job-portal/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  buildPaginationMeta,
  buildPaginationParams,
  PaginatedResult,
} from '../../common/pagination/pagination.util';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { QueryPlansDto } from './dto/query-plans.dto';

const CURRENCY_REGEX = /^[A-Z]{3}$/;

@Injectable()
export class SubscriptionPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private assertCurrency(currency: string) {
    if (!CURRENCY_REGEX.test(currency)) {
      throw new BadRequestException('Currency must be a 3-letter ISO code (e.g. INR)');
    }
  }

  // ---------------------------------------------------------------------------
  // Pricing validation. `price` is the ACTUAL amount charged; `regularPrice` is
  // the list price used only for display.
  //
  // The discount percentage is ALWAYS derived from the two prices rather than
  // trusted from the request, so the "% OFF" badge rendered on the website is
  // always consistent with the prices next to it. A client-supplied
  // `discountPercentage` is still accepted (and validated) for backwards
  // compatibility, but it is never stored.
  // ---------------------------------------------------------------------------

  private resolvePricing(
    price?: number,
    regularPrice?: number,
    discountPercentage?: number,
    current?: { price: number; regularPrice: number },
  ) {
    const discounted = price ?? current?.price ?? 0;
    const regular = regularPrice ?? current?.regularPrice ?? discounted;

    if (discounted < 0) {
      throw new BadRequestException('Price cannot be negative');
    }
    if (regular < 0) {
      throw new BadRequestException('Regular price cannot be negative');
    }
    if (discounted > regular) {
      throw new BadRequestException('Discounted price cannot exceed regular price');
    }
    // Backwards compatibility: a bad discount still 400s exactly as before, it
    // just never reaches the database. Clients that no longer send it are fine.
    if (discountPercentage !== undefined) {
      if (
        !Number.isInteger(discountPercentage) ||
        discountPercentage < 0 ||
        discountPercentage > 100
      ) {
        throw new BadRequestException('Discount percentage must be an integer between 0 and 100');
      }
    }
    return {
      price: discounted,
      regularPrice: regular,
      discountPercentage: calculateDiscountPercentage(regular, discounted),
    };
  }

  async list(query: QueryPlansDto): Promise<PaginatedResult<any>> {
    const params = buildPaginationParams(query.page, query.limit);
    const where: Prisma.SubscriptionPlanWhereInput =
      query.archived === true ? { deletedAt: { not: null } } : { deletedAt: null };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.subscriptionPlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.limit,
        include: {
          vaults: {
            select: { vault: { select: { id: true, name: true, type: true, status: true } } },
          },
          _count: { select: { subscriptions: true } },
        },
      }),
      this.prisma.subscriptionPlan.count({ where }),
    ]);

    const normalized = items.map((p) => ({
      ...p,
      status: p.deletedAt ? 'ARCHIVED' : p.isActive ? 'ACTIVE' : 'INACTIVE',
      vaults: p.vaults.map((v) => v.vault),
    }));

    return buildPaginationMeta(normalized, totalItems, params);
  }

  async findOne(id: string) {
    const plan = await this.findPlan(id);
    return { ...plan, vaults: plan.vaults.map((v) => v.vault) };
  }

  async create(dto: CreatePlanDto, adminUserId: string, ipAddress?: string) {
    this.assertCurrency(dto.currency);
    if (dto.durationDays <= 0) {
      throw new BadRequestException('Duration must be greater than 0');
    }
    const pricing = this.resolvePricing(dto.price, dto.regularPrice, dto.discountPercentage);

    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { name: dto.name },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException('Plan with this name already exists');
    }

    let plan;
    if (existing && existing.deletedAt) {
      plan = await this.prisma.subscriptionPlan.update({
        where: { id: existing.id },
        data: {
          name: dto.name,
          description: dto.description ?? null,
          price: pricing.price,
          regularPrice: pricing.regularPrice,
          discountPercentage: pricing.discountPercentage,
          currency: dto.currency.toUpperCase(),
          durationDays: dto.durationDays,
          isActive: dto.isActive ?? true,
          deletedAt: null,
        },
      });
    } else {
      plan = await this.prisma.subscriptionPlan.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          price: pricing.price,
          regularPrice: pricing.regularPrice,
          discountPercentage: pricing.discountPercentage,
          currency: dto.currency.toUpperCase(),
          durationDays: dto.durationDays,
          isActive: dto.isActive ?? true,
        },
      });
    }

    await this.audit.record({
      action: 'PLAN_CREATED',
      entityType: 'SubscriptionPlan',
      entityId: plan.id,
      adminUserId,
      ipAddress,
      details: {
        name: plan.name,
        price: plan.price,
        regularPrice: plan.regularPrice,
        discountPercentage: plan.discountPercentage,
        durationDays: plan.durationDays,
      },
    });

    if (dto.vaultId) {
      await this.addVault(plan.id, dto.vaultId, adminUserId, ipAddress);
    }

    return this.findOne(plan.id);
  }

  async update(id: string, dto: UpdatePlanDto, adminUserId: string, ipAddress?: string) {
    const current = await this.findPlan(id);

    if (dto.currency) {
      this.assertCurrency(dto.currency);
    }
    if (dto.name) {
      const dup = await this.prisma.subscriptionPlan.findUnique({ where: { name: dto.name } });
      if (dup && dup.id !== id) {
        throw new ConflictException('Plan with this name already exists');
      }
    }

    const pricing = this.resolvePricing(dto.price, dto.regularPrice, dto.discountPercentage, {
      price: Number(current.price),
      regularPrice: Number(current.regularPrice),
    });

    // The stored discount is derived, so it has to be rewritten whenever either
    // price changes - not only when the client happens to send the percentage.
    const pricingChanged = dto.price !== undefined || dto.regularPrice !== undefined;

    const plan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price !== undefined ? pricing.price : undefined,
        regularPrice: dto.regularPrice !== undefined ? pricing.regularPrice : undefined,
        discountPercentage:
          pricingChanged || dto.discountPercentage !== undefined
            ? pricing.discountPercentage
            : undefined,
        currency: dto.currency ? dto.currency.toUpperCase() : undefined,
        durationDays: dto.durationDays,
        isActive: dto.isActive,
      },
    });

    await this.audit.record({
      action: 'PLAN_UPDATED',
      entityType: 'SubscriptionPlan',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { changes: dto as Prisma.InputJsonObject },
    });

    if (dto.vaultId) {
      await this.addVault(id, dto.vaultId, adminUserId, ipAddress);
    }

    return this.findOne(plan.id);
  }

  /**
   * Archive/deactivate a plan. Always a soft archive regardless of existing
   * subscriptions - the plan stays referenceable by subscriptions/payments but
   * is excluded from the public catalog. Existing entitlements are untouched.
   */
  async remove(id: string, adminUserId: string, ipAddress?: string) {
    await this.findPlan(id);

    const [subCount, paymentCount] = await this.prisma.$transaction([
      this.prisma.subscription.count({ where: { planId: id } }),
      this.prisma.payment.count({ where: { subscription: { planId: id } } }),
    ]);

    const plan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });

    await this.audit.record({
      action: 'PLAN_ARCHIVED',
      entityType: 'SubscriptionPlan',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { references: { subscriptions: subCount, payments: paymentCount } },
    });

    return {
      id: plan.id,
      archived: true,
      isActive: false,
      status: 'ARCHIVED',
      references: { subscriptions: subCount, payments: paymentCount },
    };
  }

  /** Restore an archived plan back into the active catalog. */
  async restore(id: string, adminUserId: string, ipAddress?: string) {
    await this.findPlan(id);

    const plan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: true, deletedAt: null },
    });

    await this.audit.record({
      action: 'PLAN_RESTORED',
      entityType: 'SubscriptionPlan',
      entityId: id,
      adminUserId,
      ipAddress,
    });

    return this.findOne(plan.id);
  }

  /** Permanently delete a plan (hard delete) when no subscriptions/payments reference it. */
  async hardDelete(id: string, adminUserId: string, ipAddress?: string) {
    await this.findPlan(id);

    const subCount = await this.prisma.subscription.count({ where: { planId: id } });
    if (subCount > 0) {
      throw new ConflictException(
        `Cannot permanently delete this plan: ${subCount} subscription(s) still reference it. Archive it instead.`,
      );
    }

    await this.prisma.subscriptionPlan.delete({ where: { id } });

    await this.audit.record({
      action: 'PLAN_DELETED',
      entityType: 'SubscriptionPlan',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { hardDeleted: true },
    });

    return { id, deleted: true };
  }

  // ---- Plan-vault access linking ----

  async listVaults(planId: string) {
    await this.findPlan(planId);
    const rows = await this.prisma.planVault.findMany({
      where: { planId },
      include: { vault: true },
      orderBy: { vault: { sortOrder: 'asc' } },
    });
    return rows.map((r) => r.vault);
  }

  async addVault(planId: string, vaultId: string, adminUserId: string, ipAddress?: string) {
    await this.findPlan(planId);
    const vault = await this.prisma.vault.findFirst({ where: { id: vaultId, deletedAt: null } });
    if (!vault) {
      throw new NotFoundException('Vault not found');
    }

    const existing = await this.prisma.planVault.findUnique({
      where: { planId_vaultId: { planId, vaultId } },
    });
    if (existing) {
      throw new ConflictException('Vault is already linked to this plan');
    }

    await this.prisma.planVault.create({ data: { planId, vaultId } });

    await this.audit.record({
      action: 'PLAN_VAULT_ADDED',
      entityType: 'SubscriptionPlan',
      entityId: planId,
      adminUserId,
      ipAddress,
      details: { vaultId, vaultName: vault.name },
    });

    return this.listVaults(planId);
  }

  async removeVault(planId: string, vaultId: string, adminUserId: string, ipAddress?: string) {
    await this.findPlan(planId);
    await this.prisma.planVault.deleteMany({ where: { planId, vaultId } });

    await this.audit.record({
      action: 'PLAN_VAULT_REMOVED',
      entityType: 'SubscriptionPlan',
      entityId: planId,
      adminUserId,
      ipAddress,
      details: { vaultId },
    });

    return this.listVaults(planId);
  }

  private async findPlan(id: string) {
    // Admin context: archived plans stay visible so they can be audited/restored.
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id },
      include: {
        vaults: {
          select: { vault: { select: { id: true, name: true, type: true, status: true } } },
        },
      },
    });
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }
    return plan;
  }
}
