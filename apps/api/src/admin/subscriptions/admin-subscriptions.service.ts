import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionAccessService } from '../../access/subscription-access.service';

@Injectable()
export class AdminSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: SubscriptionAccessService,
  ) {}

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
          plan: { select: { id: true, name: true, price: true, currency: true } },
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

  async create(userId: string, planId: string, startDate?: string, endDate?: string, _actor?: { id: string }, _ipAddress?: string) {
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
        plan: { select: { id: true, name: true, price: true, currency: true } },
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

    return this.findOne(id);
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