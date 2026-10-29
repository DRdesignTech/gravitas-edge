import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
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

  describe('create', () => {
    it('hashes the password with bcrypt when creating a user (never stores plaintext)', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
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

    it('rejects creating a user whose email is used by an active account', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'active-1', email: 'taken@example.com' });

      await expect(
        service.create(
          { email: 'taken@example.com', password: 'SuperSecret123!', role: 'USER' },
          { id: 'admin-1', email: 'admin@example.com', roles: ['ADMIN'] },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('allows creating a user whose email was only used by a (previously) deleted account', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockImplementation(
        async (args: { data: { email: string; passwordHash: string; status: string } }) => ({
          id: 'user-2',
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
        { email: 'reused@example.com', password: 'SuperSecret123!', role: 'USER' },
        { id: 'admin-1', email: 'admin@example.com', roles: ['ADMIN'] },
      );

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: { equals: 'reused@example.com', mode: 'insensitive' },
          }),
        }),
      );
      expect(prisma.user.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
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

  describe('remove (permanent delete)', () => {
    const actor = { id: 'admin-1', email: 'admin@example.com', roles: ['ADMIN'] };

    it('permanently deletes the user (hard delete, not soft delete)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'target-1', email: 'target@example.com' });
      prisma.user.delete.mockResolvedValue({ id: 'target-1', email: 'target@example.com' });

      const result = await service.remove('target-1', actor);

      // delete is called instead of any update() with deletedAt / status=INACTIVE.
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'target-1' } });
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'User permanently deleted' });
    });

    it('does not set deletedAt or INACTIVE status as the delete mechanism', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'target-1', email: 'target@example.com' });
      prisma.user.delete.mockResolvedValue({ id: 'target-1' });

      await service.remove('target-1', actor);

      expect(prisma.user.update).not.toHaveBeenCalled();
      const deleteArg = prisma.user.delete.mock.calls[0][0];
      expect(deleteArg.data).toBeUndefined();
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-1', actor)).rejects.toThrow(NotFoundException);
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('prevents an admin from deleting their own account', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', email: 'a@b.com' });

      await expect(service.remove('admin-1', actor)).rejects.toThrow(
        'Cannot delete your own account',
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('only deletes the targeted user (unrelated users untouched)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'target-1', email: 'target@example.com' });
      prisma.user.delete.mockResolvedValue({ id: 'target-1' });

      await service.remove('target-1', actor);

      expect(prisma.user.delete).toHaveBeenCalledTimes(1);
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'target-1' } });
    });

    it('propagates a deletion failure so nothing is committed (atomic rollback)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'target-1', email: 'target@example.com' });
      prisma.user.delete.mockRejectedValue(
        Object.assign(new Error('FK violation'), {
          code: 'P2003',
        }),
      );

      await expect(service.remove('target-1', actor)).rejects.toThrow('FK violation');
      // The error propagates; the surrounding delete is atomic at the DB level.
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'target-1' } });
    });
  });

  describe('list', () => {
    it('does not exclusively hide users via a deletedAt: null filter', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.list({ page: 1, limit: 20 });

      const whereArg = prisma.user.findMany.mock.calls[0][0].where;
      expect(whereArg).not.toHaveProperty('deletedAt');
    });
  });
});
