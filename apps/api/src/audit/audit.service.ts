import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditParams {
  action: string;
  entityType: string;
  entityId?: string;
  actorUserId?: string;
  adminUserId?: string;
  details?: Prisma.InputJsonObject;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: AuditParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? null,
          userId: params.actorUserId ?? null,
          adminUserId: params.adminUserId ?? null,
          details: params.details ?? undefined,
          ipAddress: params.ipAddress ?? null,
        },
      });
    } catch (error) {
      // Audit failures must never break the primary request flow.
      console.error('Audit log write failed:', error);
    }
  }
}
