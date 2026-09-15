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
    const { email, password, role = 'USER', status = 'ACTIVE' } = dto;

    const existing = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    const newUser = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        status,
        roles: role ? { create: { role: { connect: { name: role } } } } : undefined,
      },
      select: USER_SELECT,
    });

    await this.audit.record({
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: newUser.id,
      adminUserId: actor.id,
      ipAddress,
      details: { email, role, status },
    });

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
