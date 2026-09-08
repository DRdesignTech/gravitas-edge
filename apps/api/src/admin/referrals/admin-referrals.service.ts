import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  buildPaginationMeta,
  buildPaginationParams,
} from '../../common/pagination/pagination.util';
import {
  AdminQueryCommissionsDto,
  AdminQueryReferralsDto,
  AdminUpdateSlabDto,
  ApproveCommissionDto,
  CancelCommissionDto,
  PayCommissionDto,
  RejectCommissionDto,
  SuspendReferralDto,
} from './dto/admin-referral.dto';

@Injectable()
export class AdminReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listReferrals(query: AdminQueryReferralsDto) {
    const params = buildPaginationParams(query.page, query.limit);
    const where: Prisma.ReferralWhereInput = { deletedAt: null };
    if (query.status) {
      where.status = query.status;
    }
    if (query.code) {
      where.code = query.code.trim();
    }
    if (query.userId) {
      where.OR = [{ referrerId: query.userId }, { referredUserId: query.userId }];
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      const match = {
        OR: [
          { email: { contains: term, mode: 'insensitive' as const } },
          { profile: { is: { fullName: { contains: term, mode: 'insensitive' as const } } } },
        ],
      };
      where.OR = [
        ...(where.OR ?? []),
        { code: { contains: term, mode: 'insensitive' as const } },
        { referrer: match },
        { referredUser: match },
      ];
    }
    if (query.fromDate || query.toDate) {
      where.createdAt = {
        ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
        ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
      };
    }

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.referral.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.limit,
        include: {
          referrer: { select: { id: true, email: true, referralCode: true } },
          referredUser: { select: { id: true, email: true, status: true } },
          commissions: {
            select: { id: true, status: true, commissionAmount: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.referral.count({ where }),
    ]);

    return buildPaginationMeta(items, totalItems, params);
  }

  async findReferral(id: string) {
    const referral = await this.prisma.referral.findFirst({
      where: { id, deletedAt: null },
      include: {
        referrer: { select: { id: true, email: true, referralCode: true } },
        referredUser: { select: { id: true, email: true, status: true } },
        commissions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!referral) {
      throw new NotFoundException('Referral not found');
    }
    return referral;
  }

  /**
   * Suspend a referral (e.g. suspected fraud). Suspended referrals are excluded
   * from commission accrual and successful-count slab lookups.
   */
  async suspendReferral(
    id: string,
    dto: SuspendReferralDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const referral = await this.prisma.referral.findFirst({
      where: { id, deletedAt: null },
    });
    if (!referral) {
      throw new NotFoundException('Referral not found');
    }
    if (referral.status === 'SUCCESSFUL') {
      throw new BadRequestException('Cannot suspend a successful referral');
    }

    const updated = await this.prisma.referral.update({
      where: { id },
      data: { status: 'SUSPENDED', suspendedReason: dto.reason },
    });

    await this.audit.record({
      action: 'REFERRAL_SUSPENDED',
      entityType: 'Referral',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { reason: dto.reason },
    });

    return updated;
  }

  async listCommissions(query: AdminQueryCommissionsDto) {
    const params = buildPaginationParams(query.page, query.limit);
    const where: Prisma.ReferralCommissionWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      const match = {
        OR: [
          { email: { contains: term, mode: 'insensitive' as const } },
          { profile: { is: { fullName: { contains: term, mode: 'insensitive' as const } } } },
        ],
      };
      where.referral = {
        OR: [
          { code: { contains: term, mode: 'insensitive' as const } },
          { referrer: match },
          { referredUser: match },
        ],
      };
    }

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.referralCommission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.limit,
        include: {
          referral: {
            select: {
              id: true,
              code: true,
              referrer: { select: { id: true, email: true } },
              referredUser: { select: { id: true, email: true } },
              status: true,
              successfulDate: true,
            },
          },
          subscription: {
            select: {
              id: true,
              status: true,
              plan: { select: { id: true, name: true, price: true, currency: true } },
            },
          },
        },
      }),
      this.prisma.referralCommission.count({ where }),
    ]);

    return buildPaginationMeta(items, totalItems, params);
  }

  async findCommission(id: string) {
    const commission = await this.prisma.referralCommission.findUnique({
      where: { id },
      include: {
        referral: {
          select: {
            id: true,
            code: true,
            referrer: { select: { id: true, email: true } },
            referredUser: { select: { id: true, email: true } },
            status: true,
            successfulDate: true,
          },
        },
        subscription: {
          select: {
            id: true,
            status: true,
            plan: { select: { id: true, name: true, price: true, currency: true } },
          },
        },
      },
    });
    if (!commission) {
      throw new NotFoundException('Commission not found');
    }
    return commission;
  }

  async approveCommission(
    id: string,
    dto: ApproveCommissionDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const commission = await this.requireCommission(id);
    if (commission.status !== 'PENDING') {
      throw new BadRequestException(
        `Only PENDING commissions can be approved (current: ${commission.status})`,
      );
    }

    await this.prisma.referralCommission.update({
      where: { id },
      data: { status: 'APPROVED', approvedDate: new Date() },
    });

    await this.audit.record({
      action: 'COMMISSION_APPROVED',
      entityType: 'ReferralCommission',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { note: dto.note ?? null },
    });

    return this.findCommission(id);
  }

  async rejectCommission(
    id: string,
    dto: RejectCommissionDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const commission = await this.requireCommission(id);
    if (commission.status !== 'PENDING') {
      throw new BadRequestException(
        `Only PENDING commissions can be rejected (current: ${commission.status})`,
      );
    }

    await this.prisma.referralCommission.update({
      where: { id },
      data: { status: 'REJECTED', rejectedReason: dto.reason },
    });

    await this.audit.record({
      action: 'COMMISSION_REJECTED',
      entityType: 'ReferralCommission',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { reason: dto.reason },
    });

    return this.findCommission(id);
  }

  async payCommission(id: string, dto: PayCommissionDto, adminUserId: string, ipAddress?: string) {
    const commission = await this.requireCommission(id);
    if (commission.status === 'PAID') {
      throw new BadRequestException('Commission is already paid');
    }
    if (commission.status === 'REJECTED' || commission.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot pay a ${commission.status.toLowerCase()} commission`);
    }

    await this.prisma.referralCommission.update({
      where: { id },
      data: { status: 'PAID', paidDate: new Date(), payoutReference: dto.payoutReference ?? null },
    });

    await this.audit.record({
      action: 'COMMISSION_PAID',
      entityType: 'ReferralCommission',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { payoutReference: dto.payoutReference ?? null },
    });

    return this.findCommission(id);
  }

  async cancelCommission(
    id: string,
    dto: CancelCommissionDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const commission = await this.requireCommission(id);
    if (commission.status === 'PAID') {
      throw new BadRequestException('Cannot cancel a paid commission');
    }

    await this.prisma.referralCommission.update({
      where: { id },
      data: { status: 'CANCELLED', rejectedReason: dto.reason ?? null },
    });

    await this.audit.record({
      action: 'COMMISSION_CANCELLED',
      entityType: 'ReferralCommission',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { reason: dto.reason ?? null },
    });

    return this.findCommission(id);
  }

  async listSlabs() {
    const slabs = await this.prisma.referralSlab.findMany({
      orderBy: [{ isActive: 'desc' }, { minReferrals: 'asc' }],
    });
    return { items: slabs };
  }

  /**
   * Update a slab with range / overlap / percentage validation (decision #3):
   *   - minReferrals must be >= 0 and <= maxReferrals (when max provided)
   *   - no overlapping ranges between slabs (computed against current config)
   *   - commissionPercentage must be a valid non-negative number (0-100)
   */
  async updateSlab(id: string, dto: AdminUpdateSlabDto, adminUserId: string, ipAddress?: string) {
    const existing = await this.prisma.referralSlab.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Referral slab not found');
    }

    const minReferrals = dto.minReferrals ?? existing.minReferrals;
    const maxReferrals = dto.maxReferrals !== undefined ? dto.maxReferrals : existing.maxReferrals;
    const commissionPercentage = dto.commissionPercentage ?? Number(existing.commissionPercentage);

    if (minReferrals < 0) {
      throw new BadRequestException('minReferrals must be non-negative');
    }
    if (maxReferrals !== undefined && maxReferrals !== null && maxReferrals < minReferrals) {
      throw new BadRequestException('minReferrals must be less than or equal to maxReferrals');
    }
    if (commissionPercentage < 0 || commissionPercentage > 100) {
      throw new BadRequestException('commissionPercentage must be between 0 and 100');
    }

    await this.assertNoOverlap(id, minReferrals, maxReferrals);

    const updated = await this.prisma.referralSlab.update({
      where: { id },
      data: {
        minReferrals: dto.minReferrals,
        maxReferrals: dto.maxReferrals !== undefined ? dto.maxReferrals : undefined,
        commissionPercentage: dto.commissionPercentage,
        isActive: dto.isActive,
      },
    });

    await this.audit.record({
      action: 'REFERRAL_SLAB_UPDATED',
      entityType: 'ReferralSlab',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { changes: dto as Prisma.InputJsonObject },
    });

    return updated;
  }

  private async assertNoOverlap(
    excludeId: string,
    minReferrals: number,
    maxReferrals: number | null | undefined,
  ) {
    const others = await this.prisma.referralSlab.findMany({
      where: { id: { not: excludeId } },
    });

    const isOverlapping = (otherMin: number, otherMax: number | null) => {
      const lo = minReferrals;
      const hi = maxReferrals ?? Number.MAX_SAFE_INTEGER;
      const oLo = otherMin;
      const oHi = otherMax ?? Number.MAX_SAFE_INTEGER;
      return !(hi < oLo || lo > oHi);
    };

    const conflict = others.find((o) => isOverlapping(o.minReferrals, o.maxReferrals));
    if (conflict) {
      throw new BadRequestException(
        `Slab range overlaps with slab [${conflict.minReferrals}-${conflict.maxReferrals ?? '∞'}]`,
      );
    }
  }

  private async requireCommission(id: string) {
    const commission = await this.prisma.referralCommission.findUnique({ where: { id } });
    if (!commission) {
      throw new NotFoundException('Commission not found');
    }
    return commission;
  }
}
