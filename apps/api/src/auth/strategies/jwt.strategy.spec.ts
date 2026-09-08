import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

describe('JwtStrategy (security)', () => {
  let strategy: JwtStrategy;
  let prisma: { user: { findUnique: jest.Mock } };

  const config = {
    getOrThrow: (key: string) => (key === 'JWT_ACCESS_SECRET' ? 'test-access-secret' : ''),
  } as any;

  const activeUser = {
    id: 'user-1',
    email: 'u@example.com',
    status: 'ACTIVE',
    deletedAt: null,
    roles: [{ role: { name: 'USER' } }],
  };

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    strategy = new JwtStrategy(config, prisma as unknown as PrismaService);
  });

  it('rejects a refresh-type token even if it verifies (defense in depth)', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser);
    await expect(
      strategy.validate({
        sub: 'user-1',
        email: 'u@example.com',
        roles: ['USER'],
        type: 'refresh',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('accepts an access-type token', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser);
    const user = await strategy.validate({
      sub: 'user-1',
      email: 'u@example.com',
      roles: ['USER'],
      type: 'access',
    });
    expect(user.id).toBe('user-1');
    expect(user.roles).toContain('USER');
  });

  it('rejects a suspended user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...activeUser,
      status: 'SUSPENDED',
    });
    await expect(
      strategy.validate({ sub: 'user-1', email: 'u@example.com', roles: ['USER'], type: 'access' }),
    ).rejects.toThrow('Account is not active');
  });

  it('rejects a missing sub claim', async () => {
    await expect(
      strategy.validate({ sub: '', email: 'u@example.com', roles: ['USER'], type: 'access' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
