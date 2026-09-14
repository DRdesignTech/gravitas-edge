import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionAccessService } from '../access/subscription-access.service';
import { BUSINESS_VAULT_NAMES, durationLabel } from './pricing-catalog';
import { PurchasePlanDto } from './dto/purchase-plan.dto';
import { ConfirmPurchaseDto } from './dto/confirm-purchase.dto';

/**
 * Server-side pricing, purchase and (interim, gateway-agnostic) payment flow.
 *
 * The price shown to a client is ALWAYS the server-controlled plan price from
 * the database - the client can only send a planId (+ optional vaultId). Never
 * trusts client-supplied prices. A payment session (status CREATED) must be
 * confirmed through /purchase/confirm before any subscription is activated, so
 * activation is a deliberate, server-side step (the Razorpay webhook can later
 * replace the confirm call without changing the data model).
 */
@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SubscriptionAccessService,
  ) {}

  /**
   * Public grouped pricing catalog: 6 business vaults x 3 duration offers.
   * Returns only active, non-archived plans over the catalog vaults.
   */
  async getPublicPricing() {
    const catalogNames = BUSINESS_VAULT_NAMES;

    const vaults = await this.prisma.vault.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        plans: {
          where: { plan: { deletedAt: null, isActive: true } },
          include: { plan: true },
        },
      },
    });

    const pricedVaults = vaults
      .filter((v) => catalogNames.includes(v.name))
      .map((v) => {
        const plans = v.plans
          .map((row) => row.plan)
          .sort((a, b) => a.durationDays - b.durationDays)
          .map((p) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            regularPrice: Number(p.regularPrice),
            discountedPrice: Number(p.price),
            discountPercentage: p.discountPercentage,
            currency: p.currency,
            durationDays: p.durationDays,
            durationLabel: durationLabel(p.durationDays),
          }));
        return {
          vault: { id: v.id, name: v.name, description: v.description },
          plans,
        };
      })
      .filter((v) => v.plans.length > 0);

    // Keep deterministic catalog order (sortOrder may not be maintained in dev).
    const vaultIndex = new Map(pricedVaults.map((v, i) => [v.vault.id, i]));
    return pricedVaults.sort((a, b) => {
      const vi = vaultIndex.get(a.vault.id) ?? 0;
      const vj = vaultIndex.get(b.vault.id) ?? 0;
      return vi - vj;
    });
  }

  /**
   * Start a purchase: validate plan availability and create a CREATED payment
   * session for the exact server-side plan price.
   */
  async purchase(userId: string, dto: PurchasePlanDto) {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id: dto.planId, deletedAt: null, isActive: true },
      include: {
        vaults: {
          where: { vault: { deletedAt: null, status: 'ACTIVE' } },
          include: { vault: { select: { id: true, name: true } } },
        },
      },
    });
    if (!plan) {
      throw new NotFoundException('Plan is not available for purchase');
    }

    const tokenVaults = plan.vaults.map((v) => v.vault);
    const target =
      tokenVaults.find((v) => v.id === dto.vaultId) ??
      (tokenVaults.length === 1 ? tokenVaults[0] : undefined);
    if (!target) {
      throw new BadRequestException(
        tokenVaults.length === 0
          ? 'This plan grants no vault access'
          : 'A vaultId belonging to this plan is required',
      );
    }

    const orderId = `order_${randomUUID().replace(/-/g, '')}`;
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: plan.price,
        currency: plan.currency,
        status: 'CREATED',
        razorpayOrderId: orderId,
        metadata: {
          planId: plan.id,
          planName: plan.name,
          vaultId: target.id,
          vaultName: target.name,
          durationDays: plan.durationDays,
        },
      },
    });

    return {
      paymentId: payment.id,
      orderId: payment.razorpayOrderId,
      amount: Number(payment.amount),
      currency: payment.currency,
      planId: plan.id,
      planName: plan.name,
      vaultId: target.id,
      vaultName: target.name,
      durationDays: plan.durationDays,
      status: payment.status,
    };
  }

  /**
   * Confirm a purchase: marks the owned CREATED payment as SUCCESS and only then
   * activates the subscription (with vault snapshot) for the user. Idempotent:
   * an already-confirmed payment returns its subscription instead of
   * double-activating.
   */
  async confirmPurchase(userId: string, dto: ConfirmPurchaseDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: { subscription: true },
    });
    if (!payment || payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === 'SUCCESS') {
      if (payment.subscriptionId) {
        const sub = await this.prisma.subscription.findUnique({
          where: { id: payment.subscriptionId },
          include: {
            plan: true,
            vaultAccess: { include: { vault: { select: { id: true, name: true } } } },
          },
        });
        return { subscription: sub, payment: serializePayment(payment) };
      }
      throw new ConflictException('Payment is already processed');
    }
    if (['FAILED', 'REFUNDED', 'CANCELLED'].includes(payment.status)) {
      throw new BadRequestException('Payment cannot be confirmed in its current state');
    }

    const meta = (payment.metadata ?? {}) as {
      planId?: string;
      vaultId?: string;
      planName?: string;
    };
    if (!meta.planId || !meta.vaultId) {
      throw new BadRequestException('Purchase session is missing required metadata');
    }

    let subscription;
    try {
      subscription = await this.access.createSubscriptionWithSnapshot(userId, meta.planId, {
        status: 'ACTIVE',
        paymentReference: payment.razorpayOrderId ?? undefined,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'PLAN_NOT_AVAILABLE') {
        throw new ConflictException('The plan is no longer available for purchase');
      }
      throw error;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        subscriptionId: subscription.id,
        razorpayPaymentId: `pay_${randomUUID().replace(/-/g, '')}`,
        webhookEvent: 'payment.confirmed',
      },
    });

    return {
      subscription: {
        id: subscription.id,
        plan: {
          id: subscription.plan?.id,
          name: subscription.plan?.name,
          price: Number(subscription.plan?.price),
          regularPrice: Number(subscription.plan?.regularPrice),
          discountedPrice: Number(subscription.plan?.price),
          discountPercentage: subscription.plan?.discountPercentage,
          currency: subscription.plan?.currency,
          durationDays: subscription.plan?.durationDays,
          durationLabel: durationLabel(subscription.plan?.durationDays ?? 0),
        },
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        createdAt: subscription.createdAt,
        cancelledAt: subscription.cancelledAt ?? null,
        vaultAccess: (subscription.vaultAccess ?? []).map((va: any) => ({
          vaultId: va.vaultId,
          vaultName: va.vault?.name ?? null,
        })),
      },
      payment: {
        id: payment.id,
        status: 'SUCCESS',
        orderId: payment.razorpayOrderId,
        amount: Number(payment.amount),
        currency: payment.currency,
      },
    };
  }
}

function serializePayment(payment: {
  id: string;
  status: string;
  razorpayOrderId: string | null;
  amount: unknown;
  currency: string;
}) {
  return {
    id: payment.id,
    status: payment.status,
    orderId: payment.razorpayOrderId,
    amount: Number(payment.amount),
    currency: payment.currency,
  };
}
