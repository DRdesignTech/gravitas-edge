import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VaultStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  buildPaginationMeta,
  buildPaginationParams,
  PaginatedResult,
} from '../../common/pagination/pagination.util';
import { CreateVaultDto } from './dto/create-vault.dto';
import { UpdateVaultDto } from './dto/update-vault.dto';
import { QueryVaultsDto } from './dto/query-vaults.dto';

@Injectable()
export class AdminVaultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: QueryVaultsDto): Promise<PaginatedResult<any>> {
    const params = buildPaginationParams(query.page, query.limit);
    const where: Prisma.VaultWhereInput =
      query.status === 'ARCHIVED' ? { deletedAt: { not: null } } : { deletedAt: null };

    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.vault.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: params.skip,
        take: params.limit,
        include: {
          experienceLevels: { select: { experienceLevel: true } },
          plans: { select: { plan: { select: { id: true, name: true, isActive: true } } } },
          _count: { select: { subscriptionAccess: true } },
        },
      }),
      this.prisma.vault.count({ where }),
    ]);

    const normalized = items.map((v) => ({
      ...v,
      experienceLevels: v.experienceLevels.map((el) => el.experienceLevel),
      plans: v.plans.map((p) => p.plan),
    }));

    return buildPaginationMeta(normalized, totalItems, params);
  }

  async findOne(id: string) {
    const vault = await this.findVault(id);
    return {
      ...vault,
      experienceLevels: vault.experienceLevels.map((el) => el.experienceLevel),
      plans: vault.plans.map((p) => p.plan),
    };
  }

  async create(dto: CreateVaultDto, adminUserId: string, ipAddress?: string) {
    const existing = await this.prisma.vault.findUnique({
      where: { name: dto.name },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException('Vault with this name already exists');
    }

    let vault;
    if (existing && existing.deletedAt) {
      vault = await this.prisma.vault.update({
        where: { id: existing.id },
        data: {
          name: dto.name,
          description: dto.description ?? null,
          type: dto.type ?? 'OTHER',
          status: (dto.status ?? 'ACTIVE') as VaultStatus,
          sortOrder: dto.sortOrder ?? 0,
          deletedAt: null,
        },
      });
    } else {
      vault = await this.prisma.vault.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          type: dto.type ?? 'OTHER',
          status: (dto.status ?? 'ACTIVE') as VaultStatus,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    }

    await this.audit.record({
      action: 'VAULT_CREATED',
      entityType: 'Vault',
      entityId: vault.id,
      adminUserId,
      ipAddress,
      details: { name: vault.name },
    });

    return this.findOne(vault.id);
  }

  async update(id: string, dto: UpdateVaultDto, adminUserId: string, ipAddress?: string) {
    await this.findVault(id);

    if (dto.name) {
      const dup = await this.prisma.vault.findUnique({ where: { name: dto.name } });
      if (dup && dup.id !== id) {
        throw new ConflictException('Vault with this name already exists');
      }
    }

    const updated = await this.prisma.vault.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        status: dto.status as VaultStatus | undefined,
        sortOrder: dto.sortOrder,
      },
    });

    await this.audit.record({
      action: 'VAULT_UPDATED',
      entityType: 'Vault',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { changes: dto as Prisma.InputJsonObject },
    });

    return this.findOne(updated.id);
  }

  /**
   * Archive or delete a vault. Hard deletion is forbidden if the vault is still
   * referenced by plans, subscriptions, or opportunities; otherwise it is
   * archived (soft delete) to protect foreign-key references.
   */
  async remove(id: string, adminUserId: string, ipAddress?: string) {
    await this.findVault(id);

    const refCount = await this.prisma.$transaction([
      this.prisma.planVault.count({ where: { vaultId: id } }),
      this.prisma.subscriptionVaultAccess.count({ where: { vaultId: id } }),
      this.prisma.opportunityVault.count({ where: { vaultId: id } }),
    ]);
    const [planRefs, subRefs, oppRefs] = refCount;

    const archived = await this.prisma.vault.update({
      where: { id },
      data: { status: VaultStatus.ARCHIVED, deletedAt: new Date() },
    });

    await this.audit.record({
      action: 'VAULT_ARCHIVED',
      entityType: 'Vault',
      entityId: id,
      adminUserId,
      ipAddress,
      details: {
        references: { plans: planRefs, subscriptions: subRefs, opportunities: oppRefs },
      },
    });

    return {
      id: archived.id,
      status: archived.status,
      archived: true,
      references: { plans: planRefs, subscriptions: subRefs, opportunities: oppRefs },
    };
  }

  /** Restore an archived vault to the active business set. */
  async restore(id: string, adminUserId: string, ipAddress?: string) {
    await this.findVault(id);

    const restored = await this.prisma.vault.update({
      where: { id },
      data: { status: VaultStatus.ACTIVE, deletedAt: null },
    });

    await this.audit.record({
      action: 'VAULT_RESTORED',
      entityType: 'Vault',
      entityId: id,
      adminUserId,
      ipAddress,
    });

    return this.findOne(restored.id);
  }

  /**
   * Permanently delete a vault (hard delete) after confirming nothing still
   * references it. Referenced vaults are refused so live subscription grants,
   * plan links, and opportunity links are never silently removed.
   */
  async hardDelete(id: string, adminUserId: string, ipAddress?: string) {
    await this.findVault(id);

    const [planRefs, subRefs, oppRefs] = await this.prisma.$transaction([
      this.prisma.planVault.count({ where: { vaultId: id } }),
      this.prisma.subscriptionVaultAccess.count({ where: { vaultId: id } }),
      this.prisma.opportunityVault.count({ where: { vaultId: id } }),
    ]);

    if (planRefs > 0 || subRefs > 0 || oppRefs > 0) {
      throw new ConflictException(
        `Cannot permanently delete this vault: it is still referenced by ${planRefs} plans, ${subRefs} subscription grants, and ${oppRefs} opportunities. Archive it instead.`,
      );
    }

    await this.prisma.vault.delete({ where: { id } });

    await this.audit.record({
      action: 'VAULT_DELETED',
      entityType: 'Vault',
      entityId: id,
      adminUserId,
      ipAddress,
      details: { hardDeleted: true },
    });

    return { id, deleted: true };
  }

  // ---- Experience level linking -----------------------------------------

  async listExperienceLevels(vaultId: string) {
    await this.findVault(vaultId);
    const rows = await this.prisma.vaultExperienceLevel.findMany({
      where: { vaultId },
      include: { experienceLevel: true },
      orderBy: { experienceLevel: { sortOrder: 'asc' } },
    });
    return rows.map((r) => r.experienceLevel);
  }

  async addExperienceLevel(
    vaultId: string,
    experienceLevelId: string,
    adminUserId: string,
    ipAddress?: string,
  ) {
    await this.findVault(vaultId);
    const level = await this.prisma.experienceLevel.findUnique({
      where: { id: experienceLevelId },
    });
    if (!level) {
      throw new NotFoundException('Experience level not found');
    }

    const existing = await this.prisma.vaultExperienceLevel.findUnique({
      where: {
        vaultId_experienceLevelId: { vaultId, experienceLevelId },
      },
    });
    if (existing) {
      throw new ConflictException('Experience level already linked to this vault');
    }

    await this.prisma.vaultExperienceLevel.create({
      data: { vaultId, experienceLevelId },
    });

    await this.audit.record({
      action: 'VAULT_EXPERIENCE_LEVEL_ADDED',
      entityType: 'Vault',
      entityId: vaultId,
      adminUserId,
      ipAddress,
      details: { experienceLevelId, experienceLevelName: level.name },
    });

    return this.listExperienceLevels(vaultId);
  }

  async removeExperienceLevel(
    vaultId: string,
    experienceLevelId: string,
    adminUserId: string,
    ipAddress?: string,
  ) {
    await this.findVault(vaultId);
    await this.prisma.vaultExperienceLevel.deleteMany({
      where: { vaultId, experienceLevelId },
    });

    await this.audit.record({
      action: 'VAULT_EXPERIENCE_LEVEL_REMOVED',
      entityType: 'Vault',
      entityId: vaultId,
      adminUserId,
      ipAddress,
      details: { experienceLevelId },
    });

    return this.listExperienceLevels(vaultId);
  }

  private async findVault(id: string) {
    // Admin context: archived vaults stay visible so they can be audited/restored.
    const vault = await this.prisma.vault.findFirst({
      where: { id },
      include: {
        experienceLevels: { select: { experienceLevel: true } },
        plans: { select: { plan: { select: { id: true, name: true, isActive: true } } } },
      },
    });
    if (!vault) {
      throw new NotFoundException('Vault not found');
    }
    return vault;
  }
}
