import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage/storage.service';
import { CreateGuestResumeDto } from './dto/guest-resume.dto';
import { isValidResumeFile, getExtension } from './validation/resume.validation';

const PUBLIC_SELECT = {
  originalName: true,
  fileType: true,
  fileSize: true,
  uploadedAt: true,
  linkedUserId: true,
  deletedAt: true,
} as const;

export interface GuestResumeFileInput {
  originalName: string;
  fileSize: number;
  buffer: Buffer;
}

@Injectable()
export class GuestResumesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private toDto(record: {
    originalName: string;
    fileType: string;
    fileSize: number;
    uploadedAt: Date;
    linkedUserId: string | null;
    deletedAt: Date | null;
  }) {
    return {
      originalName: record.originalName,
      fileType: record.fileType,
      fileSize: record.fileSize,
      uploadedAt: record.uploadedAt,
      linked: Boolean(record.linkedUserId) && !record.deletedAt,
    };
  }

  private validateFile(file: GuestResumeFileInput) {
    const validation = isValidResumeFile(file.originalName, file.fileSize, file.buffer);
    if (!validation.valid) {
      throw new UnprocessableEntityException(validation.error);
    }
  }

  async create(details: CreateGuestResumeDto, file: GuestResumeFileInput) {
    this.validateFile(file);

    const extension = getExtension(file.originalName);
    const { storageName, storagePath } = this.storage.saveGuestFile(file.buffer, file.originalName);

    const token = crypto.randomBytes(32).toString('hex');

    const record = await this.prisma.guestResume.create({
      data: {
        tokenHash: this.hashToken(token),
        fullName: details.fullName,
        email: details.email,
        phone: details.phone || null,
        originalName: file.originalName,
        storageName,
        fileType: extension,
        fileSize: file.fileSize,
        storageProvider: 'local',
        storagePath,
      },
      select: PUBLIC_SELECT,
    });

    return { token, resume: this.toDto(record) };
  }

  async get(token: string) {
    const record = await this.prisma.guestResume.findFirst({
      where: { tokenHash: this.hashToken(token), deletedAt: null },
      select: PUBLIC_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Guest resume not found or no longer available');
    }

    return { resume: this.toDto(record) };
  }

  async replace(token: string, file: GuestResumeFileInput) {
    this.validateFile(file);

    const existing = await this.prisma.guestResume.findFirst({
      where: { tokenHash: this.hashToken(token), deletedAt: null },
      select: { id: true, storagePath: true },
    });

    if (!existing) {
      throw new NotFoundException('Guest resume not found or no longer available');
    }

    const extension = getExtension(file.originalName);
    const { storageName, storagePath } = this.storage.saveGuestFile(file.buffer, file.originalName);

    const record = await this.prisma.guestResume.update({
      where: { id: existing.id },
      data: {
        originalName: file.originalName,
        storageName,
        storagePath,
        fileType: extension,
        fileSize: file.fileSize,
        uploadedAt: new Date(),
      },
      select: PUBLIC_SELECT,
    });

    try {
      if (existing.storagePath) {
        this.storage.deleteFile(existing.storagePath);
      }
    } catch {
      // Log but don't block — the new file is already saved.
    }

    return { resume: this.toDto(record) };
  }

  async link(token: string, userId: string) {
    const record = await this.prisma.guestResume.findFirst({
      where: { tokenHash: this.hashToken(token), deletedAt: null },
      select: {
        id: true,
        linkedUserId: true,
        originalName: true,
        storageName: true,
        fileType: true,
        fileSize: true,
        storageProvider: true,
        storagePath: true,
      },
    });

    if (!record) {
      throw new NotFoundException('Guest resume not found or no longer available');
    }

    if (record.linkedUserId && record.linkedUserId !== userId) {
      throw new ForbiddenException('This resume has already been linked to another account');
    }

    if (record.linkedUserId === userId) {
      return { message: 'Resume is already linked to your account' };
    }

    const [, linked] = await this.prisma.$transaction([
      this.prisma.guestResume.update({
        where: { id: record.id },
        data: { linkedUserId: userId },
        select: { id: true },
      }),
      this.prisma.resume.create({
        data: {
          userId,
          originalName: record.originalName,
          storageName: record.storageName,
          fileType: record.fileType,
          fileSize: record.fileSize,
          storageProvider: record.storageProvider,
          storagePath: record.storagePath,
          uploadStatus: 'UPLOADED',
        },
        select: { id: true },
      }),
    ]);

    return { message: 'Resume linked to your account', resumeId: linked.id };
  }
}
