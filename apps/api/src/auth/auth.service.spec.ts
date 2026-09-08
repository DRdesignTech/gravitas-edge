import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReferralsService } from '../referrals/referrals.service';
import { JwtPayload } from '../common/types/auth.types';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;
  let audit: any;
  let referrals: any;

  const userId = 'user-1';
  const email = 'user@example.com';
  const passwordHash = 'hashed-pass';

  const mockJwtService = () => ({
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  });

  const mockAuditService = () => ({
    record: jest.fn().mockResolvedValue(undefined),
  });

  const mockConfigService = () => ({
    get: jest.fn((key: string) => {
      const map: any = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return map[key];
    }),
    getOrThrow: jest.fn((key: string) => {
      const map: any = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
      };
      if (!map[key]) throw new Error(`Missing ${key}`);
      return map[key];
    }),
  });

  const mockReferralsService = () => ({
    attributeReferralInTx: jest.fn().mockResolvedValue(null),
  });

  const mockPrismaService = () => {
    const store: any = {};
    return {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userRole: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      role: {
        findUnique: jest.fn(),
      },
      userProfile: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => {
        return typeof fn === 'function' ? fn(store) : fn;
      }),
    };
  };

  beforeEach(async () => {
    prisma = mockPrismaService();
    jwt = mockJwtService();
    audit = mockAuditService();
    referrals = mockReferralsService();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: mockConfigService() },
        { provide: AuditService, useValue: audit },
        { provide: ReferralsService, useValue: referrals },
      ],
    }).compile();

    service = moduleRef.get(AuthService);

    // Default mocks
    (bcrypt.hash as jest.Mock).mockResolvedValue(passwordHash);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwt.signAsync.mockResolvedValue('access-token-1').mockResolvedValueOnce('access-token-1');
    jwt.verifyAsync.mockImplementation((_token: string) => {
      throw new Error('result must be set per test');
    });
  });

  describe('register', () => {
    it('registers a new user with default USER role and returns tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 'role-user', name: 'USER' });
      prisma.$transaction.mockImplementation((fn: any) =>
        fn({
          user: {
            create: async (d: any) => ({ id: userId, email: d.email, ...d }),
            update: jest.fn(),
            findUnique: async () => null,
          },
          role: { findUnique: async () => ({ id: 'role-user', name: 'USER' }) },
          userRole: { create: jest.fn() },
          userProfile: { create: jest.fn() },
        }),
      );
      prisma.userRole.findMany.mockResolvedValue([{ role: { name: 'USER' } }]);
      jwt.signAsync.mockResolvedValue('access').mockResolvedValueOnce('access');

      const result = await service.register(
        { email: '  USER@example.com ', password: 'StrongPass123!', fullName: 'Aman' },
        '127.0.0.1',
      );

      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(bcrypt.hash).toHaveBeenCalledWith('StrongPass123!', 12);
    });

    it('attributes a referral when registration includes a referral code', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 'role-user', name: 'USER' });
      prisma.$transaction.mockImplementation((fn: any) =>
        fn({
          user: {
            create: async (d: any) => ({ id: userId, email: d.email, ...d }),
            update: jest.fn(),
            findUnique: async () => null,
          },
          role: { findUnique: async () => ({ id: 'role-user', name: 'USER' }) },
          userRole: { create: jest.fn() },
          userProfile: { create: jest.fn() },
        }),
      );
      prisma.userRole.findMany.mockResolvedValue([{ role: { name: 'USER' } }]);
      jwt.signAsync.mockResolvedValue('access').mockResolvedValueOnce('access');
      (referrals.attributeReferralInTx as jest.Mock).mockResolvedValue({ id: 'referral-1' });

      await service.register(
        { email, password: 'StrongPass123!', referralCode: 'REF-6Q3MX7K2TY' },
        '127.0.0.1',
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REFERRAL_ATTRIBUTED', entityType: 'Referral' }),
      );
    });

    it('rejects duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'x', email });
      await expect(
        service.register({ email, password: 'StrongPass123!' }, '127.0.0.1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('logs in valid user and returns tokens', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        passwordHash,
        status: 'ACTIVE',
        deletedAt: null,
      });
      prisma.userRole.findMany.mockResolvedValue([{ role: { name: 'USER' } }]);

      const result = await service.login({ email, password: 'StrongPass123!' }, '127.0.0.1');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(bcrypt.compare).toHaveBeenCalledWith('StrongPass123!', passwordHash);
    });

    it('rejects wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        passwordHash,
        status: 'ACTIVE',
        deletedAt: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login({ email, password: 'wrong' }, 'ip')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email, password: 'x' }, 'ip')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects suspended user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        passwordHash,
        status: 'SUSPENDED',
        deletedAt: null,
      });
      await expect(service.login({ email, password: 'x' }, 'ip')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('rotates a valid refresh token', async () => {
      const sub = userId;
      const jti = 'jti-1';
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        status: 'ACTIVE',
        deletedAt: null,
        refreshTokenHash: 'some-hash',
      });
      prisma.userRole.findMany.mockResolvedValue([{ role: { name: 'USER' } }]);

      // Mock the replay check: issueTokens calls hashRefreshSession(userId, jti)
      // which calls bcrypt.hash. The stored hash must equal it.
      const expectedHash = await bcrypt.hash(`${userId}:${jti}`, 10);
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        status: 'ACTIVE',
        deletedAt: null,
        refreshTokenHash: expectedHash,
      });

      jwt.verifyAsync.mockResolvedValue({
        sub,
        jti,
        email,
        roles: ['USER'],
        type: 'refresh',
      } as JwtPayload);

      const result = await service.refresh('valid-refresh-token', 'ip');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('rejects a revoked refresh token', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        email,
        status: 'ACTIVE',
        deletedAt: null,
        refreshTokenHash: 'different-hash',
      });
      jwt.verifyAsync.mockResolvedValue({
        sub: userId,
        jti: 'jti-X',
        type: 'refresh',
      } as JwtPayload);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refresh('stale-token', 'ip')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired/invalid refresh token', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('expired'));
      await expect(service.refresh('expired-token', 'ip')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('clears the refresh token hash and returns a message', async () => {
      prisma.user.update.mockResolvedValue({ id: userId });
      const result = await service.logout(userId, 'ip');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
      });
      expect(result.message).toBe('Logged out successfully');
    });
  });
});
