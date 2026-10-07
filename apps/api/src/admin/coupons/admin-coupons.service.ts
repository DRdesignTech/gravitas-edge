import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CouponDiscountType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  buildPaginationMeta,
  buildPaginationParams,
  PaginatedResult,
} from '../../common/pagination/pagination.util';
import { computeCouponStatus, COUNTED_PAYMENT_STATUSES } from '../../coupons/coupon.util';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { QueryCouponsDto } from './dto/query-coupons.dto';
import { QueryCouponUsagesDto } from './dto/query-coupon-usages.dto';

type CouponWithRelations = Prisma.CouponGetPayload<{
  include: {
    plans: { include: { plan: true } };
    users: { include: { user: { include: { profile: true } } } };
  };
}>;

/**
 * Admin CRUD for coupon codes. Mirrors the subscription-plans module:
 * server-side validation, soft-archive with restore, hard delete refused while
 * redemptions reference the row, and an audit trail for every mutation.
 *
 * Usage numbers are counted against non-failed/non-refunded payments, matching
 * the limit checks in the checkout flow, so what the admin sees is exactly what
 * the customer is held to.
 */
@Injectable()
export class AdminCouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // Listing / lookup
  // ---------------------------------------------------------------------------

  async list(query: QueryCouponsDto): Promise<PaginatedResult<any>> {
    const params = buildPaginationParams(query.page, query.limit);
    const now = new Date();
    const status = query.status && query.status !== 'ALL' ? query.status : undefined;

    const where: Prisma.CouponWhereInput =
      status === 'ARCHIVED' ? { deletedAt: { not: null } } : { deletedAt: null };

    if (status === 'DISABLED') where.isActive = false;
    if (status === 'SCHEDULED') where.validFrom = { gt: now };
    if (status === 'EXPIRED') where.validUntil = { lt: now };
    if (status === 'ACTIVE' || status === 'USAGE_LIMIT_REACHED') {
      where.isActive = true;
      where.validFrom = { lte: now };
      where.validUntil = { gte: now };
    }
    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (status === 'USAGE_LIMIT_REACHED' || status === 'ACTIVE') {
      const reached = await this.findLimitReachedIds(where);
      if (status === 'USAGE_LIMIT_REACHED') {
        where.id = { in: reached };
      } else {
        where.id = { notIn: reached };
      }
    }

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.limit,
        include: COUPON_INCLUDE,
      }),
      this.prisma.coupon.count({ where }),
    ]);

    const usageCounts = await this.usageCounts(items.map((c) => c.id));
    const normalized = items.map((c) => this.toView(c, usageCounts.get(c.id) ?? 0, now));

    return buildPaginationMeta(normalized, totalItems, params);
  }

  async findOne(id: string) {
    const coupon = await this.findCoupon(id);
    const usageCounts = await this.usageCounts([id]);
    return this.toView(coupon, usageCounts.get(id) ?? 0);
  }

  async listUsages(id: string, query: QueryCouponUsagesDto) {
    await this.findCoupon(id);
    const params = buildPaginationParams(query.page, query.limit);
    const where = { couponId: id };

    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.couponUsage.findMany({
        where,
        orderBy: { usedAt: 'desc' },
        skip: params.skip,
        take: params.limit,
        include: {
          user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
          plan: { select: { id: true, name: true } },
          payment: { select: { id: true, status: true } },
          subscription: { select: { id: true, status: true } },
        },
      }),
      this.prisma.couponUsage.count({ where }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      usedAt: r.usedAt,
      originalAmount: Number(r.originalAmount),
      discountAmount: Number(r.discountAmount),
      finalAmount: Number(r.finalAmount),
      currency: r.currency,
      user: { id: r.user.id, email: r.user.email, name: r.user.profile?.fullName ?? null },
      plan: { id: r.plan.id, name: r.plan.name },
      payment: { id: r.payment.id, status: r.payment.status },
      subscription: r.subscription
        ? { id: r.subscription.id, status: r.subscription.status }
        : null,
    }));

    return buildPaginationMeta(items, totalItems, params);
  }

  // ---------------------------------------------------------------------------
  // Create / update
  // ---------------------------------------------------------------------------

  async create(dto: CreateCouponDto, adminUserId: string, ipAddress?: string) {
    const discountType = dto.discountType;
    const discountValue = Number(dto.discountValue);
    this.assertDiscount(discountType, discountValue);
    const validFrom = new Date(dto.validFrom);
    const validUntil = new Date(dto.validUntil);
    this.assertWindow(validFrom, validUntil);

    const appliesToAllUsers = dto.availability === 'ALL';
    const userIds = dto.userIds ?? [];
    if (!appliesToAllUsers && userIds.length === 0) {
      throw new BadRequestException('Select at least one user for a specific-users coupon');
    }
    const planIds = dto.planIds ?? [];
    await this.assertTargetsExist(planIds, appliesToAllUsers ? [] : userIds);

    const existing = await this.prisma.coupon.findFirst({
      where: { code: { equals: dto.code, mode: 'insensitive' } },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException('A coupon with this code already exists');
    }

    const coupon = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.CouponCreateInput = {
        code: dto.code,
        description: dto.description ?? null,
        discountType,
        discountValue,
        validFrom,
        validUntil,
        usageLimit: dto.usageLimit ?? null,
        perUserUsageLimit: dto.perUserUsageLimit ?? 1,
        appliesToAllUsers,
        isActive: dto.isActive ?? true,
        deletedAt: null,
      };

      // Reuse an archived row with the same code (mirrors plan-name reuse).
      const saved = existing
        ? await tx.coupon.update({ where: { id: existing.id }, data })
        : await tx.coupon.create({ data });

      await this.setPlans(tx, saved.id, planIds);
      await this.setUsers(tx, saved.id, appliesToAllUsers ? [] : userIds);
      return saved;
    });

    await this.audit.record({
      action: 'COUPON_CREATED',
      entityType: 'Coupon',
      entityId: coupon.id,
      adminUserId,
      ipAddress,
      details: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        usageLimit: coupon.usageLimit,
        appliesToAllUsers: coupon.appliesToAllUsers,
        planIds,
      },
    });

    return this.findOne(coupon.id);
  }

  async update(id: string, dto: UpdateCouponDto, adminUserId: string, ipAddress?: string) {
    const current = await this.findCoupon(id);

    const discountType = dto.discountType ?? current.discountType;
    const discountValue =
      dto.discountValue !== undefined ? Number(dto.discountValue) : Number(current.discountValue);
    this.assertDiscount(discountType, discountValue);

    const validFrom = dto.validFrom ? new Date(dto.validFrom) : current.validFrom;
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : current.validUntil;
    this.assertWindow(validFrom, validUntil);

    if (dto.code && dto.code !== current.code) {
      const dup = await this.prisma.coupon.findFirst({
        where: { code: { equals: dto.code, mode: 'insensitive' } },
      });
      if (dup && dup.id !== id) {
        throw new ConflictException('A coupon with this code already exists');
      }
    }

    let appliesToAllUsers = current.appliesToAllUsers;
    let replaceUsers: string[] | undefined;
    if (dto.availability === 'ALL') {
      appliesToAllUsers = true;
      replaceUsers = [];
    } else if (dto.availability === 'SPECIFIC') {
      replaceUsers = dto.userIds ?? [];
      appliesToAllUsers = false;
    } else if (dto.userIds !== undefined) {
      replaceUsers = dto.userIds;
      appliesToAllUsers = false;
    }
    if (replaceUsers && replaceUsers.length === 0 && appliesToAllUsers === false) {
      throw new BadRequestException('Select at least one user for a specific-users coupon');
    }

    await this.assertTargetsExist(dto.planIds ?? [], replaceUsers ?? []);

    const coupon = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.coupon.update({
        where: { id },
        data: {
          code: dto.code ?? undefined,
          description: dto.description !== undefined ? (dto.description ?? null) : undefined,
          discountType,
          discountValue,
          validFrom,
          validUntil,
          usageLimit: dto.usageLimit !== undefined ? (dto.usageLimit ?? null) : undefined,
          perUserUsageLimit: dto.perUserUsageLimit,
          isActive: dto.isActive,
          appliesToAllUsers,
        },
      });
      if (dto.planIds !== undefined) {
        await this.setPlans(tx, id, dto.planIds ?? []);
      }
      if (replaceUsers !== undefined) {
        await this.setUsers(tx, id, replaceUsers);
      }
      return saved;
    });

    await this.audit.record({
      action: 'COUPON_UPDATED',
      entityType: 'Coupon',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { code: coupon.code, changes: dto as Prisma.InputJsonObject },
    });

    return this.findOne(coupon.id);
  }

  // ---------------------------------------------------------------------------
  // Archive / restore / delete
  // ---------------------------------------------------------------------------

  /**
   * Archive a coupon (soft). Existing redemptions stay intact for auditing, but
   * the code immediately stops validating at checkout.
   */
  async remove(id: string, adminUserId: string, ipAddress?: string) {
    const coupon = await this.findCoupon(id);
    const usageCount = await this.prisma.couponUsage.count({ where: { couponId: id } });

    await this.prisma.coupon.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });

    await this.audit.record({
      action: 'COUPON_ARCHIVED',
      entityType: 'Coupon',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { code: coupon.code, references: { usages: usageCount } },
    });

    return { id, code: coupon.code, archived: true, isActive: false, status: 'ARCHIVED' };
  }

  async restore(id: string, adminUserId: string, ipAddress?: string) {
    const coupon = await this.findCoupon(id);

    await this.prisma.coupon.update({
      where: { id },
      data: { isActive: true, deletedAt: null },
    });

    await this.audit.record({
      action: 'COUPON_RESTORED',
      entityType: 'Coupon',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { code: coupon.code },
    });

    return this.findOne(id);
  }

  async hardDelete(id: string, adminUserId: string, ipAddress?: string) {
    const coupon = await this.findCoupon(id);
    const usageCount = await this.prisma.couponUsage.count({ where: { couponId: id } });
    if (usageCount > 0) {
      throw new ConflictException(
        `Cannot permanently delete this coupon: ${usageCount} redemption(s) reference it. Archive it instead.`,
      );
    }

    await this.prisma.coupon.delete({ where: { id } });

    await this.audit.record({
      action: 'COUPON_DELETED',
      entityType: 'Coupon',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { code: coupon.code, hardDeleted: true },
    });

    return { id, code: coupon.code, deleted: true };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private assertDiscount(type: CouponDiscountType, value: number) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException('Discount must be greater than 0');
    }
    if (type === 'PERCENTAGE' && value > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }
  }

  private assertWindow(validFrom: Date, validUntil: Date) {
    if (!(validUntil.getTime() > validFrom.getTime())) {
      throw new BadRequestException('The end date must be after the start date');
    }
  }

  private async assertTargetsExist(planIds: string[], userIds: string[]) {
    const uniquePlans = [...new Set(planIds)];
    if (uniquePlans.length > 0) {
      const found = await this.prisma.subscriptionPlan.count({
        where: { id: { in: uniquePlans }, deletedAt: null },
      });
      if (found !== uniquePlans.length) {
        throw new BadRequestException('One or more selected plans do not exist or are archived');
      }
    }
    const uniqueUsers = [...new Set(userIds)];
    if (uniqueUsers.length > 0) {
      const found = await this.prisma.user.count({ where: { id: { in: uniqueUsers } } });
      if (found !== uniqueUsers.length) {
        throw new BadRequestException('One or more selected users do not exist');
      }
    }
  }

  private async setPlans(tx: Prisma.TransactionClient, couponId: string, planIds: string[]) {
    await tx.couponPlan.deleteMany({ where: { couponId } });
    const unique = [...new Set(planIds)];
    if (unique.length > 0) {
      await tx.couponPlan.createMany({ data: unique.map((planId) => ({ couponId, planId })) });
    }
  }

  private async setUsers(tx: Prisma.TransactionClient, couponId: string, userIds: string[]) {
    await tx.couponUser.deleteMany({ where: { couponId } });
    const unique = [...new Set(userIds)];
    if (unique.length > 0) {
      await tx.couponUser.createMany({ data: unique.map((userId) => ({ couponId, userId })) });
    }
  }

  /** Redemption counts used for status + display (failed payments release the slot). */
  private async usageCounts(couponIds: string[]): Promise<Map<string, number>> {
    if (couponIds.length === 0) return new Map();
    const groups = await this.prisma.couponUsage.groupBy({
      by: ['couponId'],
      where: {
        couponId: { in: couponIds },
        payment: { status: { in: COUNTED_PAYMENT_STATUSES } },
      },
      _count: { _all: true },
    });
    return new Map(groups.map((g) => [g.couponId, g._count._all]));
  }

  private async findLimitReachedIds(where: Prisma.CouponWhereInput): Promise<string[]> {
    const candidates = await this.prisma.coupon.findMany({
      where,
      select: { id: true, usageLimit: true },
    });
    const withLimit = candidates.filter((c) => c.usageLimit != null);
    if (withLimit.length === 0) return [];

    const counts = await this.usageCounts(withLimit.map((c) => c.id));
    return withLimit
      .filter((c) => (counts.get(c.id) ?? 0) >= (c.usageLimit as number))
      .map((c) => c.id);
  }

  private async findCoupon(id: string): Promise<CouponWithRelations> {
    // Admin context: archived coupons stay visible so they can be audited/restored.
    const coupon = await this.prisma.coupon.findFirst({ where: { id }, include: COUPON_INCLUDE });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  private toView(coupon: CouponWithRelations, usageCount: number, now: Date = new Date()) {
    return {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      usageLimit: coupon.usageLimit,
      perUserUsageLimit: coupon.perUserUsageLimit,
      appliesToAllUsers: coupon.appliesToAllUsers,
      isActive: coupon.isActive,
      status: computeCouponStatus(coupon, usageCount, now),
      usageCount,
      remainingUsage:
        coupon.usageLimit == null ? null : Math.max(0, coupon.usageLimit - usageCount),
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
      deletedAt: coupon.deletedAt,
      plans: coupon.plans.map((p) => ({ id: p.plan.id, name: p.plan.name })),
      users: coupon.users.map((u) => ({
        id: u.user.id,
        email: u.user.email,
        name: u.user.profile?.fullName ?? null,
      })),
    };
  }
}

const COUPON_INCLUDE = {
  plans: { include: { plan: true } },
  users: { include: { user: { include: { profile: true } } } },
};
