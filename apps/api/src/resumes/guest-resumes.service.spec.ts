import { Test } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { GuestResumesService } from './guest-resumes.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage/storage.service';

describe('GuestResumesService', () => {
  let service: GuestResumesService;
  let prisma: any;
  let storage: any;

  const validFile = {
    originalName: 'resume.pdf',
    fileSize: 42,
    buffer: Buffer.from('%PDF-1.4 guest resume'),
  };

  const dto = { fullName: 'Jane Guest', email: 'jane@example.com', phone: '+919876543210' };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GuestResumesService,
        {
          provide: PrismaService,
          useValue: {
            guestResume: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            resume: { create: jest.fn() },
            $transaction: jest.fn((cb: any) => (Array.isArray(cb) ? Promise.all(cb) : cb(prisma))),
          },
        },
        {
          provide: StorageService,
          useValue: {
            saveGuestFile: jest.fn().mockReturnValue({
              storageName: 'guest-abc.pdf',
              storagePath: 'guest-resumes/guest-abc.pdf',
            }),
            deleteFile: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    service = module.get(GuestResumesService);
    prisma = module.get(PrismaService);
    storage = module.get(StorageService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('stores an opaque token hashed and returns safe metadata only', async () => {
      prisma.guestResume.create.mockResolvedValue({
        originalName: validFile.originalName,
        fileType: 'pdf',
        fileSize: validFile.fileSize,
        uploadedAt: new Date('2026-09-11T00:00:00Z'),
        linkedUserId: null,
        deletedAt: null,
      });

      const result = await service.create(dto, validFile);

      expect(result.token).toMatch(/^[a-f0-9]{64}$/);
      expect(result.resume.originalName).toBe('resume.pdf');
      expect(result.resume.fileType).toBe('pdf');
      expect(result.resume.linked).toBe(false);
      expect(result.resume).not.toHaveProperty('storagePath');
      expect(result.resume).not.toHaveProperty('storageName');
      expect(result.resume).not.toHaveProperty('tokenHash');

      const createdData = prisma.guestResume.create.mock.calls[0][0].data;
      expect(createdData.tokenHash).not.toBe(result.token);
      expect(createdData.tokenHash).toBe(
        crypto.createHash('sha256').update(result.token).digest('hex'),
      );
      expect(createdData.storagePath).toBe('guest-resumes/guest-abc.pdf');
      expect(storage.saveGuestFile).toHaveBeenCalledWith(validFile.buffer, validFile.originalName);
    });

    it('rejects a file whose content does not match the extension', async () => {
      await expect(
        service.create(dto, {
          originalName: 'fake.pdf',
          fileSize: 13,
          buffer: Buffer.from('<html>not a pdf</html>'),
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(prisma.guestResume.create).not.toHaveBeenCalled();
    });

    it('rejects an unsupported extension', async () => {
      await expect(
        service.create(dto, {
          originalName: 'malware.exe',
          fileSize: 4,
          buffer: Buffer.from('MZ..'),
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects an oversized file', async () => {
      const big = Buffer.alloc(5 * 1024 * 1024 + 1, 0x41);
      Buffer.from('%PDF-1.4').copy(big);
      await expect(
        service.create(dto, { originalName: 'huge.pdf', fileSize: big.length, buffer: big }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  describe('get', () => {
    it('looks up by hashed token and returns safe metadata', async () => {
      prisma.guestResume.findFirst.mockResolvedValue({
        originalName: 'cv.pdf',
        fileType: 'pdf',
        fileSize: 10,
        uploadedAt: new Date('2026-09-11T00:00:00Z'),
        linkedUserId: null,
        deletedAt: null,
      });

      const token = 'a'.repeat(64);
      const result = await service.get(token);

      const where = prisma.guestResume.findFirst.mock.calls[0][0].where;
      expect(where.tokenHash).toBe(crypto.createHash('sha256').update(token).digest('hex'));
      expect(result.resume.originalName).toBe('cv.pdf');
      expect(result.resume).not.toHaveProperty('storagePath');
    });

    it('throws NotFoundException for an unknown token', async () => {
      prisma.guestResume.findFirst.mockResolvedValue(null);
      await expect(service.get('b'.repeat(64))).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('replace', () => {
    it('saves the new file, updates the record and deletes the old file', async () => {
      prisma.guestResume.findFirst.mockResolvedValue({
        id: 'guest-id',
        storagePath: 'guest-resumes/old.pdf',
      });
      prisma.guestResume.update.mockResolvedValue({
        originalName: 'new.pdf',
        fileType: 'pdf',
        fileSize: 20,
        uploadedAt: new Date('2026-09-11T00:00:00Z'),
        linkedUserId: null,
        deletedAt: null,
      });

      const result = await service.replace('c'.repeat(64), {
        originalName: 'new.pdf',
        fileSize: 20,
        buffer: Buffer.from('%PDF-1.4 newer'),
      });

      expect(storage.saveGuestFile).toHaveBeenCalled();
      const updateData = prisma.guestResume.update.mock.calls[0][0].data;
      expect(updateData.originalName).toBe('new.pdf');
      expect(updateData.storagePath).toBeDefined();
      expect(storage.deleteFile).toHaveBeenCalledWith('guest-resumes/old.pdf');
      expect(result.resume.originalName).toBe('new.pdf');
    });

    it('throws NotFoundException for unknown token', async () => {
      prisma.guestResume.findFirst.mockResolvedValue(null);
      await expect(service.replace('d'.repeat(64), validFile)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('link', () => {
    const linkRecord = {
      id: 'guest-id',
      linkedUserId: null,
      originalName: 'cv.pdf',
      storageName: 'guest-abc.pdf',
      fileType: 'pdf',
      fileSize: 10,
      storageProvider: 'local',
      storagePath: 'guest-resumes/guest-abc.pdf',
    };

    it('links the resume and creates a Resume row for the user', async () => {
      prisma.guestResume.findFirst.mockResolvedValue(linkRecord);
      prisma.guestResume.update.mockResolvedValue({ id: 'guest-id' });
      prisma.resume.create.mockResolvedValue({ id: 'resume-id-1' });

      const result = await service.link('e'.repeat(64), 'user-1');

      expect(prisma.guestResume.update).toHaveBeenCalledWith({
        where: { id: 'guest-id' },
        data: { linkedUserId: 'user-1' },
        select: { id: true },
      });
      expect(prisma.resume.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            originalName: 'cv.pdf',
            storagePath: 'guest-resumes/guest-abc.pdf',
          }),
        }),
      );
      expect(result.resumeId).toBe('resume-id-1');
    });

    it('forbids linking a resume already linked to another account', async () => {
      prisma.guestResume.findFirst.mockResolvedValue({ ...linkRecord, linkedUserId: 'other-user' });
      await expect(service.link('f'.repeat(64), 'user-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('is idempotent when already linked to the requesting user', async () => {
      prisma.guestResume.findFirst.mockResolvedValue({
        ...linkRecord,
        linkedUserId: 'user-1',
      });
      const result = await service.link('g'.repeat(64), 'user-1');
      expect(result.message).toContain('already linked');
      expect(prisma.resume.create).not.toHaveBeenCalled();
    });
  });
});
