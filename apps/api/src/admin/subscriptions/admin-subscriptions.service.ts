import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionAccessService } from '../../access/subscription-access.service';
import { ReferralsService } from '../../referrals/referrals.service';
import { RazorpayService } from '../../payments/razorpay.service';
import { AuditService } from '../../audit/audit.service';
import {
  assertLocalPaymentEvidence,
  assertSubscriptionEvidence,
  isCapturedPayment,
} from '../../payments/autopay-evidence';
import { GrantVaultAccessDto } from './dto/grant-vault-access.dto';
import { AdminManualVaultGrantDto } from './dto/admin-manual-vault-grant.dto';

@Injectable()
export class AdminSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SubscriptionAccessService,
    private readonly referrals: ReferralsService,
    private readonly razorpay: RazorpayService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Recovery grant for a verified captured checkout whose original local
   * subscription is still pending. The original payment/subscription history
   * remains untouched; this creates a separately audited, one-vault grant.
   */
  async grantVaultAccess(dto: GrantVaultAccessDto, actor: { id: string }, ipAddress?: string) {
    const pending = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: {
        plan: { include: { vaults: { select: { vaultId: true } } } },
        payments: {
          where: { status: { in: ['CREATED', 'PENDING'] } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!pending) throw new NotFoundException('Subscription not found');
    if (pending.status !== 'PENDING') {
      throw new ConflictException('Only a pending checkout can be recovered');
    }
    if (pending.endDate <= new Date()) {
      throw new BadRequestException(
        'The pending checkout validity period has expired; review the access dates before granting',
      );
    }
    if (pending.payments.length !== 1) {
      throw new ConflictException('Pending checkout must have exactly one unpaid payment record');
    }

    const localPayment = pending.payments[0];
    const gatewayPayment = await this.razorpay.fetchPayment(dto.razorpayPaymentId);
    if (
      gatewayPayment.id !== dto.razorpayPaymentId ||
      !isCapturedPayment(gatewayPayment) ||
      Number(gatewayPayment.amount_refunded ?? 0) !== 0
    ) {
      throw new BadRequestException('Razorpay payment is not a captured, unrefunded payment');
    }
    if (localPayment.razorpayPaymentId && localPayment.razorpayPaymentId !== gatewayPayment.id) {
      throw new BadRequestException('Gateway payment does not match this checkout');
    }
    if (
      localPayment.userId !== pending.userId ||
      localPayment.subscriptionId !== pending.id ||
      Math.round(Number(localPayment.amount) * 100) !== Number(gatewayPayment.amount) ||
      localPayment.currency !== gatewayPayment.currency
    ) {
      throw new BadRequestException(
        'Captured payment does not match checkout user, amount, or currency',
      );
    }

    if (pending.razorpaySubscriptionId) {
      const gatewaySubscription = await this.razorpay.fetchSubscription(
        pending.razorpaySubscriptionId,
      );
      assertSubscriptionEvidence(pending, gatewaySubscription, gatewayPayment);
      assertLocalPaymentEvidence(localPayment, pending, gatewayPayment);
      if (gatewayPayment.subscription_id == null) {
        if (!gatewayPayment.invoice_id) {
          throw new BadRequestException(
            'Gateway invoice is required to verify this AutoPay charge',
          );
        }
        const invoice = (await this.razorpay.fetchInvoice(gatewayPayment.invoice_id)) as {
          id: string;
          payment_id?: string;
          subscription_id?: string;
        };
        if (
          invoice.id !== gatewayPayment.invoice_id ||
          invoice.payment_id !== gatewayPayment.id ||
          invoice.subscription_id !== gatewaySubscription.id
        ) {
          throw new BadRequestException(
            'Gateway invoice does not match the captured AutoPay charge',
          );
        }
      }
    } else if (
      !localPayment.razorpayOrderId ||
      gatewayPayment.order_id !== localPayment.razorpayOrderId ||
      gatewayPayment.subscription_id != null
    ) {
      throw new BadRequestException('Captured payment does not match the one-time checkout order');
    }

    const paymentReference = `admin-recovery:${gatewayPayment.id}`;
    const grant = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Subscription" WHERE "id" = ${pending.id} FOR UPDATE`,
      );
      const current = await tx.subscription.findUnique({
        where: { id: pending.id },
        include: { payments: { where: { id: localPayment.id } } },
      });
      if (!current || current.status !== 'PENDING') {
        throw new ConflictException('Checkout changed while the payment was being verified');
      }
      const currentPayment = current.payments[0];
      if (
        !currentPayment ||
        !['CREATED', 'PENDING'].includes(currentPayment.status) ||
        currentPayment.razorpayPaymentId !== localPayment.razorpayPaymentId ||
        currentPayment.userId !== localPayment.userId ||
        currentPayment.subscriptionId !== localPayment.subscriptionId ||
        currentPayment.razorpayOrderId !== localPayment.razorpayOrderId ||
        currentPayment.razorpaySubscriptionId !== localPayment.razorpaySubscriptionId ||
        Number(currentPayment.amount) !== Number(localPayment.amount) ||
        currentPayment.currency !== localPayment.currency ||
        current.userId !== pending.userId ||
        current.planId !== pending.planId ||
        current.razorpaySubscriptionId !== pending.razorpaySubscriptionId
      ) {
        throw new ConflictException('Payment record changed while the payment was being verified');
      }

      const plan = await tx.subscriptionPlan.findFirst({
        where: { id: current.planId, isActive: true, deletedAt: null },
        include: {
          vaults: {
            where: { vaultId: dto.vaultId, vault: { deletedAt: null, status: 'ACTIVE' } },
          },
        },
      });
      if (!plan || plan.vaults.length !== 1) {
        throw new BadRequestException(
          'Selected vault must be active and linked to the checkout plan',
        );
      }

      const existingGrant = await tx.subscription.findFirst({
        where: { paymentReference },
        include: {
          user: { select: { id: true, email: true } },
          plan: { select: { id: true, name: true, price: true, currency: true } },
          vaultAccess: { select: { vaultId: true } },
        },
      });
      if (existingGrant) {
        if (
          existingGrant.userId === current.userId &&
          existingGrant.planId === current.planId &&
          existingGrant.vaultAccess.length === 1 &&
          existingGrant.vaultAccess[0].vaultId === dto.vaultId
        ) {
          return { subscription: existingGrant, created: false };
        }
        throw new ConflictException(
          'This captured payment has already been used for an access grant',
        );
      }

      const created = await tx.subscription.create({
        data: {
          userId: current.userId,
          planId: current.planId,
          // Keep the recovery grant inside the original checkout's validity
          // window so a delayed webhook cannot stack an extra paid term.
          startDate: pending.startDate,
          endDate: pending.endDate,
          status: 'ACTIVE',
          autoRenew: false,
          paymentReference,
          vaultAccess: { create: { vaultId: dto.vaultId } },
        },
        include: {
          user: { select: { id: true, email: true } },
          plan: { select: { id: true, name: true, price: true, currency: true } },
          vaultAccess: { select: { vaultId: true } },
        },
      });
      return { subscription: created, created: true };
    });

    if (grant.created) {
      await this.audit.record({
        action: 'ADMIN_PAYMENT_RECOVERY_ACCESS_GRANTED',
        entityType: 'Subscription',
        entityId: grant.subscription.id,
        adminUserId: actor.id,
        ipAddress,
        details: {
          sourceSubscriptionId: pending.id,
          sourcePaymentId: localPayment.id,
          razorpayPaymentId: gatewayPayment.id,
          vaultId: dto.vaultId,
          planId: pending.planId,
          amount: localPayment.amount.toString(),
          currency: localPayment.currency,
        },
      });
    }
    return {
      id: grant.subscription.id,
      userId: grant.subscription.userId,
      user: grant.subscription.user,
      plan: grant.subscription.plan,
      status: grant.subscription.status,
      startDate: grant.subscription.startDate,
      endDate: grant.subscription.endDate,
      vaultAccess: grant.subscription.vaultAccess,
      alreadyGranted: !grant.created,
    };
  }

  /** Manual support grant. It creates a new audited entitlement and never writes payment data. */
  async manualVaultGrant(dto: AdminManualVaultGrantDto, actor: { id: string }, ipAddress?: string) {
    const paymentReference = `admin-manual:${dto.requestId}`;
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${dto.userId} FOR UPDATE`);
      const user = await tx.user.findFirst({
        where: { id: dto.userId, status: 'ACTIVE', deletedAt: null },
        select: { id: true, email: true },
      });
      if (!user) throw new NotFoundException('Active user not found');

      const existing = await tx.subscription.findFirst({
        where: { paymentReference },
        include: {
          user: { select: { id: true, email: true } },
          plan: { select: { id: true, name: true, price: true, currency: true } },
          vaultAccess: { select: { vaultId: true } },
        },
      });
      if (existing) {
        if (
          existing.userId === dto.userId &&
          existing.planId === dto.planId &&
          existing.vaultAccess.length === 1 &&
          existing.vaultAccess[0].vaultId === dto.vaultId
        ) {
          return { subscription: existing, created: false };
        }
        throw new ConflictException('This request ID was already used for a different grant');
      }

      const plan = await tx.subscriptionPlan.findFirst({
        where: { id: dto.planId, isActive: true, deletedAt: null },
        include: {
          vaults: {
            where: { vaultId: dto.vaultId, vault: { deletedAt: null, status: 'ACTIVE' } },
          },
        },
      });
      if (!plan || plan.vaults.length !== 1) {
        throw new BadRequestException(
          'Selected vault must be active and linked to the selected plan',
        );
      }

      const alreadyActive = await tx.subscription.findFirst({
        where: {
          userId: user.id,
          status: 'ACTIVE',
          startDate: { lte: now },
          endDate: { gte: now },
          vaultAccess: { some: { vaultId: dto.vaultId } },
        },
        include: {
          user: { select: { id: true, email: true } },
          plan: { select: { id: true, name: true, price: true, currency: true } },
          vaultAccess: { select: { vaultId: true } },
        },
      });
      if (alreadyActive) return { subscription: alreadyActive, created: false };

      const startDate = now;
      const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
      const subscription = await tx.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          startDate,
          endDate,
          status: 'ACTIVE',
          autoRenew: false,
          paymentReference,
          vaultAccess: { create: { vaultId: dto.vaultId } },
        },
        include: {
          user: { select: { id: true, email: true } },
          plan: { select: { id: true, name: true, price: true, currency: true } },
          vaultAccess: { select: { vaultId: true } },
        },
      });
      return { subscription, created: true };
    });

    if (result.created) {
      await this.audit.record({
        action: 'ADMIN_MANUAL_VAULT_ACCESS_GRANTED',
        entityType: 'Subscription',
        entityId: result.subscription.id,
        adminUserId: actor.id,
        ipAddress,
        details: {
          userId: dto.userId,
          planId: dto.planId,
          vaultId: dto.vaultId,
          reason: dto.reason,
          requestId: dto.requestId,
        },
      });
    }
    return {
      id: result.subscription.id,
      userId: result.subscription.userId,
      user: result.subscription.user,
      plan: result.subscription.plan,
      status: result.subscription.status,
      startDate: result.subscription.startDate,
      endDate: result.subscription.endDate,
      vaultAccess: result.subscription.vaultAccess,
      alreadyGranted: !result.created,
    };
  }

  async list(query: { page?: number; limit?: number; userId?: string; status?: string }) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {};
    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.status) {
      where.status = query.status as any;
    }

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true } },
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              regularPrice: true,
              discountPercentage: true,
              currency: true,
            },
          },
          vaultAccess: { select: { vaultId: true, vault: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    const normalized = items.map((s) => ({
      id: s.id,
      userId: s.userId,
      user: s.user,
      plan: s.plan,
      status: s.status,
      effectiveStatus: this.access.effectiveStatus(s),
      startDate: s.startDate,
      endDate: s.endDate,
      createdAt: s.createdAt,
      cancelledAt: s.cancelledAt,
      vaultAccessCount: s.vaultAccess.length,
    }));

    const totalPages = Math.ceil(totalItems / limit);
    return {
      items: normalized,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true } },
        plan: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            currency: true,
            durationDays: true,
          },
        },
        vaultAccess: {
          select: { vaultId: true, vault: { select: { id: true, name: true } } },
        },
      },
    });
    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }
    return {
      ...sub,
      effectiveStatus: this.access.effectiveStatus(sub),
    };
  }

  async create(
    userId: string,
    planId: string,
    startDate?: string,
    endDate?: string,
    _actor?: { id: string },
    _ipAddress?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (endDate && startDate && new Date(endDate) <= new Date(startDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status: 'PENDING',
      } as unknown as Prisma.SubscriptionCreateInput,
      include: {
        user: { select: { id: true, email: true } },
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            regularPrice: true,
            discountPercentage: true,
            currency: true,
          },
        },
        vaultAccess: { select: { vaultId: true } },
      },
    });

    return {
      id: subscription.id,
      userId: subscription.userId,
      user,
      plan,
      status: subscription.status,
      effectiveStatus: this.access.effectiveStatus(subscription),
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      createdAt: subscription.createdAt,
      vaultAccessCount: subscription.vaultAccess ? subscription.vaultAccess.length : 0,
    };
  }

  async update(id: string, status?: string, _actor?: { id: string }, _ipAddress?: string) {
    const existing = await this.prisma.subscription.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Subscription not found');
    }

    await this.prisma.subscription.update({
      where: { id },
      data: { status: status as any },
    });

    // Confirmed-success point: a subscription that becomes ACTIVE (or is
    // confirmed to be within its validity window) accrues the referral
    // commission if the user was referred.
    const updated = await this.findOne(id);
    if (this.access.effectiveStatus(updated) === 'ACTIVE') {
      await this.referrals.handleSubscriptionActivated(id);
    }

    return updated;
  }

  async remove(id: string, actor: { id: string }, _ipAddress?: string) {
    const existing = await this.prisma.subscription.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Subscription not found');
    }

    if (id === actor.id) {
      throw new BadRequestException('Cannot delete your own subscription');
    }

    await this.prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    return { message: 'Subscription archived successfully' };
  }
}
