import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getMe(userId: string) {
    const user = await this.findUserWithProfile(userId);
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      status: user.status,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      roles: user.roles.map((r) => r.role.name),
      profile: user.profile ?? null,
    };
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.findUserWithProfile(userId);

    if (dto.phone && dto.phone !== user.phone) {
      const taken = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (taken && taken.id !== userId) {
        throw new ConflictException('Phone already registered');
      }
    }

    const data: any = {
      phone: dto.phone ?? undefined,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data });

      const profileData: any = {
        fullName: dto.fullName ?? undefined,
        phone: dto.phone ?? undefined,
        location: dto.location ?? undefined,
        yearsExperience: dto.yearsExperience ?? undefined,
        monthsExperience: dto.monthsExperience ?? undefined,
        currentJobTitle: dto.currentJobTitle ?? undefined,
        currentCompany: dto.currentCompany ?? undefined,
      };

      const existingProfile = await tx.userProfile.findUnique({ where: { userId } });
      if (existingProfile) {
        await tx.userProfile.update({ where: { userId }, data: profileData });
      } else if (Object.values(profileData).some((v) => v !== undefined)) {
        await tx.userProfile.create({ data: { userId, ...profileData } });
      }
    });

    await this.audit.record({
      action: 'USER_PROFILE_UPDATED',
      entityType: 'UserProfile',
      entityId: userId,
      actorUserId: userId,
    });

    return this.getMe(userId);
  }

  async getProfile(userId: string) {
    const user = await this.findUserWithProfile(userId);
    return user.profile ?? null;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.updateMe(userId, dto);
  }

  private async findUserWithProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        roles: { select: { role: { select: { name: true } } } },
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
