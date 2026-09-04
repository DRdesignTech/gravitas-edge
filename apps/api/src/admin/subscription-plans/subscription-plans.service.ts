import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  async list(query: QueryPlansDto): Promise<PaginatedResult<any>> {
    const params = buildPaginationParams(query.page, query.limit);
    const where: Prisma.SubscriptionPlanWhereInput = { deletedAt: null };

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
    if (dto.price < 0) {
      throw new BadRequestException('Price cannot be negative');
    }
    if (dto.durationDays <= 0) {
      throw new BadRequestException('Duration must be greater than 0');
    }

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
          price: dto.price,
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
          price: dto.price,
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
      details: { name: plan.name, price: plan.price, durationDays: plan.durationDays },
    });

    return this.findOne(plan.id);
  }

  async update(id: string, dto: UpdatePlanDto, adminUserId: string, ipAddress?: string) {
    await this.findPlan(id);

    if (dto.currency) {
      this.assertCurrency(dto.currency);
    }
    if (dto.name) {
      const dup = await this.prisma.subscriptionPlan.findUnique({ where: { name: dto.name } });
      if (dup && dup.id !== id) {
        throw new ConflictException('Plan with this name already exists');
      }
    }

    const plan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
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

    return this.findOne(plan.id);
  }

  /**
   * Archive/deactivate a plan. Hard deletion is forbidden if it is referenced
   * by any subscription so historical entitlements stay auditable.
   */
  async remove(id: string, adminUserId: string, ipAddress?: string) {
    await this.findPlan(id);

    const subCount = await this.prisma.subscription.count({ where: { planId: id } });
    if (subCount > 0) {
      throw new BadRequestException(
        'Cannot delete plan with existing subscriptions; deactivate it instead',
      );
    }

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
    });

    return { id: plan.id, archived: true, isActive: false };
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
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id, deletedAt: null },
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
