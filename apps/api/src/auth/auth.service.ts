import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReferralsService } from '../referrals/referrals.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../common/types/auth.types';
import type { StringValue } from 'ms';

const ACCESS_TOKEN_TYPE = 'access';
const REFRESH_TOKEN_TYPE = 'refresh';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly referrals: ReferralsService,
  ) {}

  private get accessExpiresIn(): StringValue {
    return (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as StringValue;
  }

  private get refreshExpiresIn(): StringValue {
    return (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as StringValue;
  }

  async register(dto: RegisterDto, ipAddress?: string) {
    const email = dto.email.trim().toLowerCase();

    // Only an account that is NOT soft-deleted occupies the email. A soft-deleted
    // (deletedAt IS NOT NULL) user no longer blocks re-registration.
    const existing = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (existing) {
      await this.audit.record({
        action: 'AUTH_REGISTER_FAILED',
        entityType: 'User',
        ipAddress,
        details: { reason: 'EMAIL_IN_USE', email },
      });
      throw new ConflictException('Email already registered');
    }

    if (dto.phone) {
      const phoneTaken = await this.prisma.user.findFirst({
        where: { phone: dto.phone, deletedAt: null },
      });
      if (phoneTaken) {
        await this.audit.record({
          action: 'AUTH_REGISTER_FAILED',
          entityType: 'User',
          ipAddress,
          details: { reason: 'PHONE_IN_USE', email },
        });
        throw new ConflictException('Phone already registered');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Race condition guard: two concurrent registrations with the same email can
    // both pass the findFirst check above and race on the DB insert. The partial
    // unique index (deletedAt IS NULL) catches the second insert as P2002; here
    // we translate that into a clean ConflictException so the client still gets
    // a meaningful error instead of an opaque 500.
    let user: any;
    let attributedReferral: any;
    try {
      ({ user, attributedReferral } = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email,
            phone: dto.phone ?? null,
            passwordHash,
            status: 'ACTIVE',
          },
        });

        const userRole = await tx.role.findUnique({ where: { name: 'USER' } });
        if (userRole) {
          await tx.userRole.create({ data: { userId: created.id, roleId: userRole.id } });
        }

        if (dto.fullName || dto.phone || dto.location) {
          await tx.userProfile.create({
            data: {
              userId: created.id,
              fullName: dto.fullName ?? null,
              phone: dto.phone ?? null,
              location: dto.location ?? null,
            },
          });
        }

        const attribution = dto.referralCode
          ? await this.referrals.attributeReferralInTx(tx, dto.referralCode, created.id)
          : null;

        return { user: created, attributedReferral: attribution };
      }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(',')
          : String(error.meta?.target ?? '');

        const isPhone = target.toLowerCase().includes('phone');
        const reason = isPhone ? 'PHONE_IN_USE' : 'EMAIL_IN_USE';

        await this.audit.record({
          action: 'AUTH_REGISTER_FAILED',
          entityType: 'User',
          ipAddress,
          details: { reason, email },
        });

        throw new ConflictException(
          isPhone ? 'Phone already registered' : 'Email already registered',
        );
      }

      throw error;
    }

    if (attributedReferral) {
      // Recorded after commit: interactive transactions hold a DB connection,
      // and the audit write uses a separate one to avoid pool contention.
      await this.audit.record({
        action: 'REFERRAL_ATTRIBUTED',
        entityType: 'Referral',
        entityId: attributedReferral.id,
        actorUserId: user.id,
        ipAddress,
        details: { referralCode: dto.referralCode ?? null },
      });
    }

    const roles = await this.getUserRoles(user.id);
    const tokens = await this.issueTokens(user.id, user.email, roles);

    await this.audit.record({
      action: 'AUTH_REGISTER',
      entityType: 'User',
      entityId: user.id,
      actorUserId: user.id,
      ipAddress,
    });

    return {
      user: this.sanitizeUser({ ...user, roles }),
      ...tokens,
    };
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        status: true,
        deletedAt: true,
      },
    });

    // Generic failure to avoid user enumeration.
    if (!user || user.deletedAt || !user.passwordHash) {
      await this.audit.record({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        ipAddress,
        details: { reason: 'INVALID_CREDENTIALS', email },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      await this.audit.record({
        action: 'AUTH_LOGIN_BLOCKED',
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        details: { reason: 'ACCOUNT_NOT_ACTIVE', status: user.status },
      });
      throw new UnauthorizedException('Account is not active');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.audit.record({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        details: { reason: 'INVALID_PASSWORD' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = await this.getUserRoles(user.id);
    const tokens = await this.issueTokens(user.id, user.email, roles);

    await this.audit.record({
      action: 'AUTH_LOGIN',
      entityType: 'User',
      entityId: user.id,
      actorUserId: user.id,
      ipAddress,
    });

    return { user: { id: user.id, email: user.email, status: user.status, roles }, ...tokens };
  }

  async refresh(refreshToken: string, ipAddress?: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      await this.audit.record({
        action: 'AUTH_REFRESH_FAILED',
        entityType: 'User',
        ipAddress,
        details: { reason: 'INVALID_OR_EXPIRED_TOKEN' },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!payload.sub || payload.type !== REFRESH_TOKEN_TYPE) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, status: true, deletedAt: true, refreshTokenHash: true },
    });

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Replay protection: compare the raw session value against the stored bcrypt hash.
    const rawSession = `${user.id}:${payload.jti ?? ''}`;
    if (!user.refreshTokenHash || !(await bcrypt.compare(rawSession, user.refreshTokenHash))) {
      await this.audit.record({
        action: 'AUTH_REFRESH_REVOKED',
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        details: { reason: 'TOKEN_ROTATED_OR_REVOKED' },
      });
      throw new UnauthorizedException('Refresh token is no longer valid');
    }

    const roles = await this.getUserRoles(user.id);
    const tokens = await this.issueTokens(user.id, user.email, roles);

    await this.audit.record({
      action: 'AUTH_REFRESH',
      entityType: 'User',
      entityId: user.id,
      actorUserId: user.id,
      ipAddress,
    });

    return {
      user: { id: user.id, email: user.email, status: user.status, roles },
      ...tokens,
    };
  }

  async logout(userId: string, ipAddress?: string) {
    if (userId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
      });
      await this.audit.record({
        action: 'AUTH_LOGOUT',
        entityType: 'User',
        entityId: userId,
        actorUserId: userId,
        ipAddress,
      });
    }
    return { message: 'Logged out successfully' };
  }

  private async issueTokens(userId: string, email: string, roles: string[]) {
    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      roles,
      type: ACCESS_TOKEN_TYPE,
    };
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.accessExpiresIn,
    });

    const jti = randomUUID();
    const refreshPayload: JwtPayload = {
      sub: userId,
      email,
      roles,
      type: REFRESH_TOKEN_TYPE,
      jti,
    };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.refreshExpiresIn,
    });

    const refreshTokenHash = await this.hashRefreshSession(userId, jti);
    const expiresAt = new Date(Date.now() + this.parseDurationToMs(this.refreshExpiresIn));

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash, refreshTokenExpiresAt: expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private async hashRefreshSession(userId: string, jti?: string): Promise<string> {
    const value = `${userId}:${jti ?? ''}`;
    return bcrypt.hash(value, 10);
  }

  private parseDurationToMs(duration: StringValue): number {
    const match = /^(\d+)([smhd])$/.exec(duration.trim());
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = Number(match[1]);
    const unit = match[2];
    const multiplier =
      unit === 's' ? 1000 : unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;
    return value * multiplier;
  }

  private async getUserRoles(userId: string): Promise<string[]> {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      select: { role: { select: { name: true } } },
    });
    return roles.map((r) => r.role.name);
  }

  async getMe(userId: string) {
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

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

  private sanitizeUser(user: any) {
    const { passwordHash, refreshTokenHash, refreshTokenExpiresAt, ...safe } = user;
    return safe;
  }
}
