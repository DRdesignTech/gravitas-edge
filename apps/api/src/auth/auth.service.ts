import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReferralsService } from '../referrals/referrals.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../common/types/auth.types';
import type { StringValue } from 'ms';
import { Resend } from 'resend';

const ACCESS_TOKEN_TYPE = 'access';
const REFRESH_TOKEN_TYPE = 'refresh';

// Resend is only used for transactional email (password reset).
// In production or local dev, set RESEND_API_KEY in .env.
const RESET_EMAIL_FROM = 'onboarding@resend.dev';

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
    const phone = dto.phone?.trim() || undefined;
    const fullName = dto.fullName?.trim() || undefined;
    const location = dto.location?.trim() || undefined;
    const currentJobTitle = dto.currentJobTitle?.trim() || undefined;
    const currentCompany = dto.currentCompany?.trim() || undefined;
    const cleanedSkills = Array.isArray(dto.skills)
      ? [
          ...new Set(
            dto.skills.map((s) => s.trim()).filter((s) => s.length > 0 && s.length <= 80),
          ),
        ].slice(0, 30)
      : undefined;

    // Only an account that is NOT soft-deleted occupies the email. A soft-deleted
    // (deletedAt IS NOT NULL) user no longer blocks re-registration.
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
    });
    if (existing) {
      await this.audit.record({
        action: 'AUTH_REGISTER_FAILED',
        entityType: 'User',
        ipAddress,
        details: { reason: 'EMAIL_IN_USE', email },
      });
      throw new ConflictException('Email already registered');
    }

    if (phone) {
      const phoneTaken = await this.prisma.user.findFirst({
        where: { phone, deletedAt: null },
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
            phone: phone ?? null,
            passwordHash,
            status: 'ACTIVE',
          },
        });

        const userRole = await tx.role.findUnique({ where: { name: 'USER' } });
        if (userRole) {
          await tx.userRole.create({ data: { userId: created.id, roleId: userRole.id } });
        }

        const hasProfileData =
          Boolean(fullName || phone || location || currentJobTitle || currentCompany) ||
          dto.yearsExperience != null ||
          dto.monthsExperience != null ||
          (cleanedSkills !== undefined && cleanedSkills.length > 0);

        if (hasProfileData) {
          await tx.userProfile.create({
            data: {
              userId: created.id,
              fullName: fullName ?? null,
              phone: phone ?? null,
              location: location ?? null,
              ...(dto.yearsExperience != null ? { yearsExperience: dto.yearsExperience } : {}),
              ...(dto.monthsExperience != null ? { monthsExperience: dto.monthsExperience } : {}),
              ...(currentJobTitle ? { currentJobTitle } : {}),
              ...(currentCompany ? { currentCompany } : {}),
              ...(cleanedSkills && cleanedSkills.length > 0
                ? { skills: cleanedSkills as unknown as Prisma.InputJsonValue }
                : {}),
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

    const exactUser = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        status: true,
        deletedAt: true,
      },
    });
    const user =
      exactUser ??
      (await this.prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          status: true,
          deletedAt: true,
        },
      }));

    if (!user || user.deletedAt) {
      // The account does not exist (or was deleted). The UI uses this to offer
      // a "Create an account" path. This intentionally reveals account existence
      // so the sign-in page can guide new users; the password path below stays
      // enumeration-safe.
      await this.audit.record({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        ipAddress,
        details: { reason: 'ACCOUNT_NOT_FOUND', email },
      });
      throw new UnauthorizedException({
        message: 'No account found with this email. Please create an account to continue.',
        code: 'ACCOUNT_NOT_FOUND',
      });
    }

    if (!user.passwordHash) {
      await this.audit.record({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        ipAddress,
        details: { reason: 'INVALID_CREDENTIALS', email },
      });
      throw new UnauthorizedException({
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (user.status !== 'ACTIVE') {
      await this.audit.record({
        action: 'AUTH_LOGIN_BLOCKED',
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        details: { reason: 'ACCOUNT_NOT_ACTIVE', status: user.status },
      });
      throw new UnauthorizedException({
        message: 'Account is not active',
        code: 'ACCOUNT_NOT_ACTIVE',
      });
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
      throw new UnauthorizedException({
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
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
            profileImg: true,
            skills: true,
            education: true,
            workExperience: true,
            certifications: true,
            careerPreferences: true,
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
    const {
      passwordHash,
      refreshTokenHash,
      refreshTokenExpiresAt,
      passwordResetToken,
      passwordResetExpiresAt,
      ...safe
    } = user;
    return safe;
  }

  async forgotPassword(dto: { email: string }, ipAddress?: string) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, email: true },
    });

    if (!user) {
      // Do not reveal whether an account exists (anti-account-enumeration).
      // Always answer with the same generic message whether or not the email
      // matches a real account.
      await this.audit.record({
        action: 'AUTH_FORGOT_PASSWORD',
        entityType: 'User',
        ipAddress,
        details: { reason: 'ACCOUNT_NOT_FOUND', email },
      });
      return { message: 'If an account exists, a password reset link has been sent.' };
    }

    const token = randomUUID();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: tokenHash, passwordResetExpiresAt: expiresAt },
    });

    const appUrl = (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000').replace(
      /\/+$/,
      '',
    );
    const resetUrl = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    const resendApiKey = this.config.get<string>('RESEND_API_KEY');
    if (!resendApiKey) {
      return { message: 'If an account exists, a password reset link has been sent.' };
    }

    try {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: this.config.get<string>('RESEND_EMAIL_FROM') ?? RESET_EMAIL_FROM,
        to: email,
        subject: 'Reset your Gravitas Edge password',
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <div style="background: #061b36; padding: 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #fff; margin: 0; font-size: 24px;">Reset your password</h1>
            </div>
            <div style="background: #fff; padding: 24px; border: 1px solid #e9e7df; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #042b6e; font-size: 16px; line-height: 1.6;">You requested to reset your password. Click the button below to create a new one:</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="background: #c8943e; color: #061b36; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password</a>
              </div>
              <a href="${resetUrl}" style="display:block; text-align:center; color:#5b6c85; font-size:13px; margin-top:8px;">${resetUrl}</a>
              <p style="color: #3a5791; font-size: 14px; line-height: 1.6;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #e9e7df; margin: 24px 0;">
              <p style="color: #768cb6; font-size: 12px;">Gravitas Edge Consulting</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send reset email:', error);
    }

    await this.audit.record({
      action: 'AUTH_FORGOT_PASSWORD',
      entityType: 'User',
      entityId: user.id,
      actorUserId: user.id,
      ipAddress,
      details: { email },
    });

    return { message: 'If an account exists, a password reset link has been sent.' };
  }

  async resetPassword(dto: { token: string; password: string }, ipAddress?: string) {
    const { token, password } = dto;

    // The token is stored as a deterministic SHA-256 hash, so the matching
    // account can be fetched directly instead of bcrypt-comparing it against
    // every account.
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
      },
      select: { id: true, email: true },
    });

    if (!user) {
      await this.audit.record({
        action: 'AUTH_RESET_PASSWORD_FAILED',
        entityType: 'User',
        ipAddress,
        details: { reason: 'INVALID_OR_EXPIRED_TOKEN' },
      });
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });

    await this.audit.record({
      action: 'AUTH_RESET_PASSWORD',
      entityType: 'User',
      entityId: user.id,
      actorUserId: user.id,
      ipAddress,
    });

    return { message: 'Password has been reset successfully. You can now log in.' };
  }
}
