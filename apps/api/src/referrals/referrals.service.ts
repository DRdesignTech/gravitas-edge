import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommissionStatus, Prisma, ReferralStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { buildReferralLink, generateReferralCode } from './referral.utils';
import {
  PaginationParams,
  buildPaginationMeta,
  buildPaginationParams,
} from '../common/pagination/pagination.util';

const { Decimal } = Prisma;

export interface GetUserReferralCodeResult {
  referralCode: string;
  referralLink: string;
}

interface ListQuery {
  page?: number;
  limit?: number;
  status?: ReferralStatus;
}

interface CommissionListQuery {
  page?: number;
  limit?: number;
  status?: CommissionStatus;
}

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  getReferralBaseUrl(): string {
    return this.config.get<string>('REFERRAL_BASE_URL') ?? 'http://localhost:3000';
  }

  /**
   * Ensure the user has a unique referral code (created on first call / signup)
   * and return it alongside the shareable link. Idempotent: never regenerates
   * an existing code so already-shared links keep working.
   */
  async ensureReferralCode(userId: string): Promise<GetUserReferralCodeResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let code = user.referralCode;
    if (!code) {
      code = await this.generateUniqueCode();
      await this.prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
    }

    return {
      referralCode: code,
      referralLink: buildReferralLink(this.getReferralBaseUrl(), code),
    };
  }

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = generateReferralCode();
      const existing = await this.prisma.user.findUnique({ where: { referralCode: candidate } });
      if (!existing) {
        return candidate;
      }
    }
    throw new Error('Failed to generate a unique referral code');
  }

  /**
   * Validate and attach the referral inside the signup transaction. Reuses the
   * caller's transaction so attribution and user creation commit atomically.
   */
  async attributeReferralInTx(
    tx: Prisma.TransactionClient,
    referralCode: string,
    referredUserId: string,
  ) {
    const normalized = referralCode?.trim();
    if (!normalized) {
      return null;
    }

    const referrer = await tx.user.findUnique({
      where: { referralCode: normalized },
      select: { id: true, status: true, deletedAt: true },
    });

    if (!referrer || referrer.deletedAt || referrer.status !== 'ACTIVE') {
      throw new BadRequestException('Invalid referral code');
    }
    if (referrer.id === referredUserId) {
      throw new BadRequestException('Cannot refer yourself');
    }

    const referralLink = buildReferralLink(this.getReferralBaseUrl(), normalized);

    return tx.referral.create({
      data: {
        referrerId: referrer.id,
        referredUserId,
        code: normalized,
        referralLink,
        status: 'PENDING',
      },
    });
  }

  /**
   * Called at the confirmed-success point (subscription becomes ACTIVE and is
   * within its validity window with no failed/refunded payments). Marks the
   * user's PENDING referral as SUCCESSFUL and creates a PENDING commission for
   * the referrer based on the active slab that matches the referrer's total
   * successful referrals AFTER the current referral becomes successful.
   *
   * Idempotent: a referral/subscription can only produce ONE commission.
   */
  async handleSubscriptionActivated(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: { select: { id: true, name: true, price: true, currency: true } },
        payments: { select: { status: true } },
        commissions: { take: 1 },
      },
    });
    if (!subscription) {
      return;
    }

    if (!this.qualifiesForCommission(subscription)) {
      return;
    }

    // Only one commission per subscription (schema guarantees via unique index).
    if (subscription.commissions.length > 0) {
      return;
    }

    const referral = await this.prisma.referral.findFirst({
      where: {
        referredUserId: subscription.userId,
        referrer: { id: { not: subscription.userId } },
        status: 'PENDING',
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      include: { referrer: { select: { id: true, email: true } } },
    });
    if (!referral) {
      return;
    }

    const price = new Decimal(subscription.plan.price);

    const outcome: {
      slab: { id: string; commissionPercentage: Prisma.Decimal } | null;
      commission: { id: string; commissionAmount: Prisma.Decimal } | null;
    } = await this.prisma.$transaction(async (tx) => {
      const successfulCountAfter =
        (
          await tx.referral.count({
            where: {
              referrerId: referral.referrerId,
              status: 'SUCCESSFUL',
              deletedAt: null,
            },
          })
        ).valueOf() + 1;

      // Decision #7: apply the slab based on the total successful referrals
      // AFTER the current referral becomes successful (includes this one).
      const slab = await tx.referralSlab.findFirst({
        where: { isActive: true, minReferrals: { lte: successfulCountAfter } },
        orderBy: { minReferrals: 'desc' },
      });

      await tx.referral.update({
        where: { id: referral.id },
        data: { status: 'SUCCESSFUL', successfulDate: new Date() },
      });

      if (!slab) {
        return { slab: null, commission: null };
      }

      const percentage = new Decimal(slab.commissionPercentage);
      const commission = await tx.referralCommission.create({
        data: {
          referralId: referral.id,
          subscriptionId: subscription.id,
          commissionPercentage: percentage,
          commissionAmount: price.mul(percentage).div(100),
          subscriptionAmount: price,
          status: 'PENDING',
        },
      });

      return { slab, commission };
    });

    const { slab, commission } = outcome;
    await this.audit.record({
      action: commission ? 'REFERRAL_COMMISSION_CREATED' : 'REFERRAL_SUCCESS_NO_SLAB',
      entityType: 'ReferralCommission',
      actorUserId: referral.referrerId,
      details: {
        referralId: referral.id,
        subscriptionId: subscription.id,
        commissionAmount: commission?.commissionAmount.toString() ?? null,
        slabId: slab?.id ?? null,
      },
    });
  }

  private qualifiesForCommission(subscription: {
    status: SubscriptionStatus;
    startDate: Date | string;
    endDate: Date | string | null;
    payments: { status: string }[];
  }): boolean {
    if (subscription.status !== 'ACTIVE') {
      return false;
    }
    const now = new Date();
    if (new Date(subscription.startDate) > now) {
      return false;
    }
    if (subscription.endDate && new Date(subscription.endDate) < now) {
      return false;
    }
    // Decision #5: never commission failed / refunded / cancelled events.
    const blocked = subscription.payments.some((p) =>
      ['FAILED', 'REFUNDED', 'CANCELLED'].includes(p.status),
    );
    return !blocked;
  }

  /**
   * Deposit a new referral code for the user (explicit generate action).
   * Regenerates only when the user has no code yet; otherwise returns existing.
   */
  async generateReferralCode(userId: string): Promise<GetUserReferralCodeResult> {
    return this.ensureReferralCode(userId);
  }

  async getReferralSummary(userId: string) {
    const codeData = await this.ensureReferralCode(userId);
    const [
      totalReferrals,
      successfulReferrals,
      pendingReferrals,
      invalidReferrals,
      suspendedReferrals,
      transaction,
    ] = await this.prisma.$transaction([
      this.prisma.referral.count({ where: { referrerId: userId, deletedAt: null } }),
      this.prisma.referral.count({
        where: { referrerId: userId, status: 'SUCCESSFUL', deletedAt: null },
      }),
      this.prisma.referral.count({
        where: { referrerId: userId, status: 'PENDING', deletedAt: null },
      }),
      this.prisma.referral.count({
        where: { referrerId: userId, status: 'INVALID', deletedAt: null },
      }),
      this.prisma.referral.count({
        where: { referrerId: userId, status: 'SUSPENDED', deletedAt: null },
      }),
      this.prisma.referralCommission.aggregate({
        where: {
          referral: { referrerId: userId },
          status: { notIn: ['CANCELLED', 'REJECTED'] },
        },
        _sum: { commissionAmount: true },
      }),
    ]);

    return {
      ...codeData,
      counts: {
        totalReferrals,
        successfulReferrals,
        pendingReferrals,
        invalidReferrals,
        suspendedReferrals,
      },
      commissionTotalAmount: transaction._sum.commissionAmount?.toString() ?? '0',
    };
  }

  async listMyReferrals(userId: string, query: ListQuery) {
    const params: PaginationParams = buildPaginationParams(query.page, query.limit);
    const where: Prisma.ReferralWhereInput = { referrerId: userId, deletedAt: null };
    if (query.status) {
      where.status = query.status;
    }

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.referral.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.limit,
        include: {
          referredUser: { select: { id: true, email: true, status: true } },
          commissions: { select: { id: true, status: true, commissionAmount: true } },
        },
      }),
      this.prisma.referral.count({ where }),
    ]);

    return buildPaginationMeta(items, totalItems, params);
  }

  async listMyCommissions(userId: string, query: CommissionListQuery) {
    const params: PaginationParams = buildPaginationParams(query.page, query.limit);
    const where: Prisma.ReferralCommissionWhereInput = { referral: { referrerId: userId } };
    if (query.status) {
      where.status = query.status;
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
              referredUser: { select: { id: true, email: true } },
              successfulDate: true,
            },
          },
          subscription: { select: { id: true, plan: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.referralCommission.count({ where }),
    ]);

    return buildPaginationMeta(items, totalItems, params);
  }

  async getCommissionStatistics(userId: string) {
    const where: Prisma.ReferralCommissionWhereInput = { referral: { referrerId: userId } };

    const [total, pending, approved, paid, rejected, cancelled, sum] =
      await this.prisma.$transaction([
        this.prisma.referralCommission.count({ where }),
        this.prisma.referralCommission.count({ where: { ...where, status: 'PENDING' } }),
        this.prisma.referralCommission.count({ where: { ...where, status: 'APPROVED' } }),
        this.prisma.referralCommission.count({ where: { ...where, status: 'PAID' } }),
        this.prisma.referralCommission.count({ where: { ...where, status: 'REJECTED' } }),
        this.prisma.referralCommission.count({ where: { ...where, status: 'CANCELLED' } }),
        this.prisma.referralCommission.aggregate({
          where: { ...where, status: { notIn: ['CANCELLED', 'REJECTED'] } },
          _sum: { commissionAmount: true },
        }),
      ]);

    return {
      counts: { total, pending, approved, paid, rejected, cancelled },
      totalCommissionAmount: sum._sum.commissionAmount?.toString() ?? '0',
    };
  }
}
