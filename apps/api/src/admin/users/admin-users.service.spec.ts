import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AdminUsersService } from './admin-users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

describe('AdminUsersService (security)', () => {
  let service: AdminUsersService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (fns: any[]) => {
        const results = [];
        for (const fn of fns) results.push(await fn);
        return results;
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { record: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = moduleRef.get(AdminUsersService);
  });

  it('hashes the password with bcrypt when creating a user (never stores plaintext)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(
      async (args: { data: { email: string; passwordHash: string; status: string } }) => ({
        id: 'user-1',
        email: args.data.email,
        phone: null,
        status: args.data.status,
        roles: [],
        profile: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    await service.create(
      { email: 'new@example.com', password: 'SuperSecret123!', role: 'USER' },
      { id: 'admin-1', email: 'admin@example.com', roles: ['ADMIN'] },
    );

    const [createArg] = prisma.user.create.mock.calls[0];
    const data = createArg.data;
    expect(data.passwordHash).not.toBe('SuperSecret123!');
    expect(data.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(bcrypt.compareSync('SuperSecret123!', data.passwordHash)).toBe(true);
  });

  it('prevents an admin from modifying their own account', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', email: 'a@b.com' });

    await expect(
      service.update(
        'admin-1',
        { status: 'INACTIVE' },
        { id: 'admin-1', email: 'a@b.com', roles: ['ADMIN'] },
      ),
    ).rejects.toThrow('Cannot modify your own account here');
  });
});
