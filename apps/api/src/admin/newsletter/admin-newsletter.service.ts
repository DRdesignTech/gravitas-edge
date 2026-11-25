import { Injectable, NotFoundException } from '@nestjs/common';
import { NewsletterStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  buildPaginationMeta,
  buildPaginationParams,
  PaginatedResult,
} from '../../common/pagination/pagination.util';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { QueryNewsletterSubscribersDto } from './dto/query-newsletter-subscribers.dto';
import { UpdateNewsletterStatusDto } from './dto/update-newsletter-status.dto';

const SUBSCRIBER_SELECT = {
  id: true,
  email: true,
  status: true,
  subscribedAt: true,
  unsubscribedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.NewsletterSubscriberSelect;

export type AdminNewsletterSubscriberRow = Prisma.NewsletterSubscriberGetPayload<{
  select: typeof SUBSCRIBER_SELECT;
}>;

@Injectable()
export class AdminNewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    query: QueryNewsletterSubscribersDto,
  ): Promise<PaginatedResult<AdminNewsletterSubscriberRow>> {
    const params = buildPaginationParams(query.page, query.limit);
    const where: Prisma.NewsletterSubscriberWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      where.email = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        where,
        select: SUBSCRIBER_SELECT,
        orderBy: [{ subscribedAt: 'desc' }, { createdAt: 'desc' }],
        skip: params.skip,
        take: params.limit,
      }),
      this.prisma.newsletterSubscriber.count({ where }),
    ]);

    return buildPaginationMeta(items, total, params);
  }

  async stats() {
    const [total, subscribed, unsubscribed] = await Promise.all([
      this.prisma.newsletterSubscriber.count(),
      this.prisma.newsletterSubscriber.count({
        where: { status: NewsletterStatus.SUBSCRIBED },
      }),
      this.prisma.newsletterSubscriber.count({
        where: { status: NewsletterStatus.UNSUBSCRIBED },
      }),
    ]);

    return {
      total,
      subscribed,
      unsubscribed,
    };
  }

  async updateStatus(
    id: string,
    dto: UpdateNewsletterStatusDto,
    actor: AuthenticatedUser,
    ipAddress?: string,
  ): Promise<AdminNewsletterSubscriberRow> {
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { id },
      select: SUBSCRIBER_SELECT,
    });

    if (!existing) {
      throw new NotFoundException(`Newsletter subscriber "${id}" not found.`);
    }

    if (existing.status === dto.status) {
      return existing;
    }

    const now = new Date();
    const data: Prisma.NewsletterSubscriberUpdateInput =
      dto.status === NewsletterStatus.SUBSCRIBED
        ? {
            status: NewsletterStatus.SUBSCRIBED,
            subscribedAt: now,
            unsubscribedAt: null,
            unsubscribeToken: randomBytes(32).toString('hex'),
          }
        : {
            status: NewsletterStatus.UNSUBSCRIBED,
            unsubscribedAt: now,
          };

    const updated = await this.prisma.newsletterSubscriber.update({
      where: { id },
      data,
      select: SUBSCRIBER_SELECT,
    });

    await this.audit.record({
      action: 'ADMIN_UPDATE_NEWSLETTER_STATUS',
      entityType: 'NewsletterSubscriber',
      entityId: id,
      actorUserId: actor.id,
      adminUserId: actor.id,
      details: {
        email: existing.email,
        from: existing.status,
        to: dto.status,
      },
      ipAddress,
    });

    return updated;
  }
}
