import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  buildPaginationMeta,
  buildPaginationParams,
  PaginatedResult,
} from '../../common/pagination/pagination.util';
import { AuthenticatedUser } from '../../common/types/auth.types';

const USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  status: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  roles: { select: { role: { select: { name: true } } } },
  profile: {
    select: {
      fullName: true,
      phone: true,
      location: true,
      yearsExperience: true,
      monthsExperience: true,
      currentJobTitle: true,
      currentCompany: true,
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: QueryUsersDto): Promise<PaginatedResult<any>> {
    const params = buildPaginationParams(query.page, query.limit);

    // Users are permanently deleted, so there is no soft-delete filter to apply.
    const where: Prisma.UserWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.role) {
      where.roles = { some: { role: { name: query.role } } };
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { profile: { fullName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const normalized = items.map((u) => ({
      ...u,
      roles: u.roles.map((r) => r.role.name),
    }));

    return buildPaginationMeta(normalized, totalItems, params);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_SELECT,
        subscriptions: { select: { id: true, status: true, plan: { select: { name: true } } } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      roles: user.roles.map((r) => r.role.name),
    };
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser, ipAddress?: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (id === actor.id) {
      // Prevent an admin from locking themselves out or changing their own roles via this route.
      throw new BadRequestException('Cannot modify your own account here');
    }

    const details: any = {};

    await this.prisma.$transaction(async (tx) => {
      if (dto.status !== undefined && dto.status !== existing.status) {
        await tx.user.update({ where: { id }, data: { status: dto.status } });
        details.statusChanged = { from: existing.status, to: dto.status };
        await this.audit.record({
          action:
            dto.status === UserStatus.SUSPENDED || dto.status === UserStatus.INACTIVE
              ? 'ACCOUNT_SUSPENDED'
              : 'ACCOUNT_REACTIVATED',
          entityType: 'User',
          entityId: id,
          adminUserId: actor.id,
          ipAddress,
          details: { from: existing.status, to: dto.status },
        });
      }

      if (dto.roles !== undefined) {
        const roleNames = dto.roles;
        const roles = await tx.role.findMany({
          where: { name: { in: roleNames } },
        });
        if (roles.length !== roleNames.length) {
          throw new BadRequestException('One or more roles do not exist');
        }

        await tx.userRole.deleteMany({ where: { userId: id } });
        if (roles.length > 0) {
          await tx.userRole.createMany({
            data: roles.map((role) => ({ userId: id, roleId: role.id })),
          });
        }
        details.rolesUpdated = roleNames;
        await this.audit.record({
          action: 'ROLE_MODIFIED',
          entityType: 'User',
          entityId: id,
          adminUserId: actor.id,
          ipAddress,
          details: { roles: roleNames },
        });
      }
    });

    return this.findOne(id);
  }

  async create(dto: CreateUserDto, actor: AuthenticatedUser, ipAddress?: string) {
    const { password, role = 'USER', status = 'ACTIVE' } = dto;
    const email = dto.email.trim().toLowerCase();

    if (Boolean(dto.planId) !== Boolean(dto.vaultId)) {
      throw new BadRequestException('Select both a plan and one vault, or leave both empty');
    }
    const planId = dto.planId;
    const vaultId = dto.vaultId;
    if (planId && status !== 'ACTIVE') {
      throw new BadRequestException('Initial vault access requires an ACTIVE user account');
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let newUser;
    let initialAccess: { subscriptionId: string; planId: string; vaultId: string } | undefined;

    try {
      if (planId && vaultId) {
        const result = await this.prisma.$transaction(async (tx) => {
          const plan = await tx.subscriptionPlan.findFirst({
            where: { id: planId, isActive: true, deletedAt: null },
            include: {
              vaults: {
                where: { vaultId, vault: { deletedAt: null, status: 'ACTIVE' } },
              },
            },
          });
          if (!plan || plan.vaults.length !== 1) {
            throw new BadRequestException(
              'Selected vault must be active and linked to the selected plan',
            );
          }

          const user = await tx.user.create({
            data: {
              email,
              passwordHash,
              status,
              roles: role ? { create: { role: { connect: { name: role } } } } : undefined,
            },
            select: USER_SELECT,
          });
          const startDate = new Date();
          const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
          const subscription = await tx.subscription.create({
            data: {
              userId: user.id,
              planId: plan.id,
              startDate,
              endDate,
              status: 'ACTIVE',
              autoRenew: false,
              paymentReference: `admin-create:${actor.id}:${user.id}`,
              vaultAccess: { create: { vaultId } },
            },
            select: { id: true },
          });
          return { user, subscription };
        });
        newUser = result.user;
        initialAccess = {
          subscriptionId: result.subscription.id,
          planId,
          vaultId,
        };
      } else {
        newUser = await this.prisma.user.create({
          data: {
            email,
            passwordHash,
            status,
            roles: role ? { create: { role: { connect: { name: role } } } } : undefined,
          },
          select: USER_SELECT,
        });
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(',')
          : String(error.meta?.target ?? '');
        if (target.toLowerCase().includes('email')) {
          throw new BadRequestException('User with this email already exists');
        }
      }
      throw error;
    }

    await this.audit.record({
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: newUser.id,
      adminUserId: actor.id,
      ipAddress,
      details: {
        email,
        role,
        status,
        ...(initialAccess ? { initialAccess } : {}),
      },
    });

    if (initialAccess) {
      await this.audit.record({
        action: 'ADMIN_INITIAL_VAULT_ACCESS_GRANTED',
        entityType: 'Subscription',
        entityId: initialAccess.subscriptionId,
        adminUserId: actor.id,
        ipAddress,
        details: {
          userId: newUser.id,
          planId: initialAccess.planId,
          vaultId: initialAccess.vaultId,
        },
      });
    }

    return {
      ...newUser,
      roles: newUser.roles.map((r) => r.role.name),
    };
  }

  async remove(id: string, actor: AuthenticatedUser, ipAddress?: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (id === actor.id) {
      throw new BadRequestException('Cannot delete your own account');
    }

    // Permanently delete the user. Dependent records are removed via the FK
    // cascade/SetNull behaviors declaratively configured in schema.prisma:
    //   Cascade:  UserRole, UserProfile, Subscription, Referral (both sides),
    //             Resume, CandidateProfile, Payment
    //   SetNull:  Opportunity.createdBy, GuestResume.linkedUserId,
    //             AuditLog.adminUserId, AuditLog.userId
    // The delete is atomic: either everything is removed or nothing is on error.
    await this.prisma.user.delete({ where: { id } });

    await this.audit.record({
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: id,
      adminUserId: actor.id,
      ipAddress,
      details: { reason: 'Admin permanent delete' },
    });

    return { message: 'User permanently deleted' };
  }
}
