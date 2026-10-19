import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
  NotFoundException,
  InternalServerErrorException,
  StreamableFile,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../resumes/storage/storage.service';
import { QueryResumesDto } from '../resumes/dto/resumes.dto';
import { ResumeResponseDto } from '../resumes/dto/resumes.dto';
import { isValidResumeFile, getExtension } from '../resumes/validation/resume.validation';
import { ResumeExtractionService } from '../admin/resumes/resume-extraction.service';
import { existsSync, createReadStream } from 'fs';

const MIME_BY_TYPE: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export interface ResumeFileInput {
  originalName: string;
  mimeType: string;
  fileSize: number;
  buffer: Buffer;
}

export interface GuestResumeDetails {
  fullName?: string;
  email?: string;
  phone?: string;
}

const PUBLIC_SELECT = {
  id: true,
  originalName: true,
  fileType: true,
  fileSize: true,
  uploadedAt: true,
  userId: true,
} as const;

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly extraction: ResumeExtractionService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async extractContactPreview(
    buffer: Buffer,
    originalName: string,
  ): Promise<{ fullName: string | null; email: string | null; phone: string | null }> {
    return this.extractContact(buffer, getExtension(originalName));
  }

  private async extractContact(
    buffer: Buffer,
    fileType: string,
  ): Promise<{ fullName: string | null; email: string | null; phone: string | null }> {
    try {
      const text = await this.extraction.extractText(buffer, fileType);
      const parsed = this.extraction.parseResumeText(text);
      return {
        fullName: parsed.fullName?.trim() || null,
        email: parsed.email?.trim() || null,
        phone: parsed.phone?.trim() || null,
      };
    } catch (error) {
      this.logger.warn(
        `Resume contact extraction failed for ${fileType}: ${(error as Error)?.message}`,
      );
      return { fullName: null, email: null, phone: null };
    }
  }

  private validateFile(file: Pick<ResumeFileInput, 'originalName' | 'fileSize' | 'buffer'>) {
    const validation = isValidResumeFile(file.originalName, file.fileSize, file.buffer);
    if (!validation.valid) {
      throw new UnprocessableEntityException(validation.error);
    }
  }

  private toGuestDto(record: {
    originalName: string;
    fileType: string;
    fileSize: number;
    uploadedAt: Date;
    userId: string | null;
  }) {
    return {
      originalName: record.originalName,
      fileType: record.fileType,
      fileSize: record.fileSize,
      uploadedAt: record.uploadedAt,
      linked: Boolean(record.userId),
    };
  }

  /**
   * Unified upload: works for authenticated users and guests alike.
   * Both land in the same `Resume` table — guests simply have `userId = null`
   * plus an opaque handle token (`guestTokenHash`) for later get/replace/link.
   */
  async create(
    user: { id: string; email: string } | null,
    file: ResumeFileInput,
    guestDetails: GuestResumeDetails = {},
  ): Promise<
    ResumeResponseDto | { token: string; resume: ReturnType<ResumesService['toGuestDto']> }
  > {
    this.validateFile(file);
    const extension = getExtension(file.originalName);

    if (user) {
      const { storageName, storagePath } = this.storage.saveFile(
        file.buffer,
        file.originalName,
        user.id,
      );

      const extracted = await this.extractContact(file.buffer, extension);

      const resume = await this.prisma.resume.create({
        data: {
          userId: user.id,
          fullName: extracted.fullName,
          email: extracted.email ?? user.email,
          phone: extracted.phone,
          originalName: file.originalName,
          storageName,
          fileType: extension,
          fileSize: file.fileSize,
          storageProvider: 'local',
          storagePath,
          uploadStatus: 'UPLOADED',
        },
        select: {
          id: true,
          originalName: true,
          fileType: true,
          fileSize: true,
          storageProvider: true,
          uploadStatus: true,
          uploadedAt: true,
          processedAt: true,
        },
      });

      return {
        id: resume.id,
        originalName: resume.originalName,
        mimeType: file.mimeType,
        fileSize: resume.fileSize,
        storageProvider: resume.storageProvider,
        uploadStatus: resume.uploadStatus,
        uploadedAt: resume.uploadedAt,
        processedAt: resume.processedAt as Date | undefined,
        isDeleted: false,
      };
    }

    const fullName = guestDetails.fullName?.trim();
    const email = guestDetails.email?.trim();
    if (!fullName || !email) {
      throw new BadRequestException('Full name and email are required for guest uploads');
    }

    const { storageName, storagePath } = this.storage.saveGuestFile(file.buffer, file.originalName);
    const token = crypto.randomBytes(32).toString('hex');
    const extracted = await this.extractContact(file.buffer, extension);

    const record = await this.prisma.resume.create({
      data: {
        userId: null,
        guestTokenHash: this.hashToken(token),
        fullName: extracted.fullName ?? fullName,
        email: extracted.email ?? email,
        phone: extracted.phone ?? (guestDetails.phone?.trim() || null),
        originalName: file.originalName,
        storageName,
        fileType: extension,
        fileSize: file.fileSize,
        storageProvider: 'local',
        storagePath,
        uploadStatus: 'UPLOADED',
      },
      select: PUBLIC_SELECT,
    });

    return { token, resume: this.toGuestDto(record) };
  }

  async findByUser(userId: string, query: QueryResumesDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [resumes, total] = await this.prisma.$transaction([
      this.prisma.resume.findMany({
        where: { userId, deletedAt: null },
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          originalName: true,
          fileType: true,
          fileSize: true,
          storageProvider: true,
          uploadStatus: true,
          uploadedAt: true,
          processedAt: true,
        },
      }),
      this.prisma.resume.count({ where: { userId, deletedAt: null } }),
    ]);

    return {
      data: resumes.map((r) => ({
        id: r.id,
        originalName: r.originalName,
        fileType: r.fileType,
        fileSize: r.fileSize,
        storageProvider: r.storageProvider,
        uploadStatus: r.uploadStatus,
        uploadedAt: r.uploadedAt,
        processedAt: r.processedAt as Date | undefined,
        isDeleted: false,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId, deletedAt: null },
      select: {
        id: true,
        originalName: true,
        fileType: true,
        fileSize: true,
        storageProvider: true,
        uploadStatus: true,
        uploadedAt: true,
        processedAt: true,
        user: { select: { id: true, email: true } },
      },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found or access denied');
    }

    return {
      id: resume.id,
      originalName: resume.originalName,
      fileType: resume.fileType,
      fileSize: resume.fileSize,
      storageProvider: resume.storageProvider,
      uploadStatus: resume.uploadStatus,
      uploadedAt: resume.uploadedAt,
      processedAt: resume.processedAt as Date | undefined,
      user: resume.user,
      isDeleted: false,
    };
  }

  async download(id: string, userId: string): Promise<StreamableFile> {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId, deletedAt: null },
      select: { storagePath: true, originalName: true, fileType: true, fileSize: true },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found or access denied');
    }

    return this.streamFile(resume);
  }

  private streamFile(resume: {
    storagePath: string;
    originalName: string;
    fileType: string;
    fileSize: number;
  }): StreamableFile {
    const filePath = this.storage.getFullPath(resume.storagePath);

    if (!existsSync(filePath)) {
      throw new InternalServerErrorException('Resume file not found on disk');
    }

    const safeName = resume.originalName.replace(/[^a-zA-Z0-9._-]/g, '_');

    return new StreamableFile(createReadStream(filePath), {
      type: MIME_BY_TYPE[resume.fileType] ?? 'application/octet-stream',
      disposition: `attachment; filename="${safeName}"`,
      length: resume.fileSize || undefined,
    });
  }

  async replace(
    id: string,
    userId: string,
    originalName: string,
    mimeType: string,
    fileSize: number,
    buffer: Buffer,
  ): Promise<ResumeResponseDto> {
    this.validateFile({ originalName, fileSize, buffer });
    const extension = getExtension(originalName);

    const existing = await this.prisma.resume.findFirst({
      where: { id, userId },
      select: { storagePath: true, originalName: true, uploadStatus: true },
    });

    if (!existing) {
      throw new NotFoundException('Resume not found');
    }

    const { storageName: newStorageName } = this.storage.saveFile(buffer, originalName, userId);
    const extracted = await this.extractContact(buffer, extension);

    const updated = await this.prisma.resume.update({
      where: { id },
      data: {
        originalName,
        storageName: newStorageName,
        fileType: extension,
        fileSize,
        uploadStatus: 'UPLOADED',
        ...(extracted.fullName ? { fullName: extracted.fullName } : {}),
        ...(extracted.email ? { email: extracted.email } : {}),
        ...(extracted.phone ? { phone: extracted.phone } : {}),
      },
      select: {
        id: true,
        originalName: true,
        fileType: true,
        fileSize: true,
        storageProvider: true,
        uploadStatus: true,
        uploadedAt: true,
        processedAt: true,
      },
    });

    try {
      if (existing.storagePath) {
        this.storage.deleteFile(String(existing.storagePath));
      }
    } catch (error) {
      // Log but don't block - record remains soft-deleted
    }

    return {
      id: updated.id,
      originalName: updated.originalName,
      mimeType,
      fileSize: updated.fileSize,
      storageProvider: updated.storageProvider,
      uploadStatus: updated.uploadStatus,
      uploadedAt: updated.uploadedAt,
      processedAt: updated.processedAt as Date | undefined,
      isDeleted: false,
    };
  }

  async remove(id: string, userId: string): Promise<void> {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found or access denied');
    }

    try {
      if (resume.storagePath) {
        this.storage.deleteFile(String(resume.storagePath));
      }
    } catch (error) {
      // Log but don't block - record remains soft-deleted
    }

    await this.prisma.resume.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getMeResumes(userId: string, query: QueryResumesDto) {
    return this.findByUser(userId, query);
  }

  // ── Guest token operations (same Resume rows) ─────────────────────

  async getGuestResume(token: string) {
    const record = await this.prisma.resume.findFirst({
      where: { guestTokenHash: this.hashToken(token), deletedAt: null },
      select: PUBLIC_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Guest resume not found or no longer available');
    }

    return { resume: this.toGuestDto(record) };
  }

  async replaceGuestResume(
    token: string,
    file: Pick<ResumeFileInput, 'originalName' | 'fileSize' | 'buffer'>,
  ) {
    this.validateFile(file);

    const existing = await this.prisma.resume.findFirst({
      where: { guestTokenHash: this.hashToken(token), deletedAt: null },
      select: { id: true, storagePath: true },
    });

    if (!existing) {
      throw new NotFoundException('Guest resume not found or no longer available');
    }

    const extension = getExtension(file.originalName);
    const { storageName, storagePath } = this.storage.saveGuestFile(file.buffer, file.originalName);
    const extracted = await this.extractContact(file.buffer, extension);

    const record = await this.prisma.resume.update({
      where: { id: existing.id },
      data: {
        originalName: file.originalName,
        storageName,
        storagePath,
        fileType: extension,
        fileSize: file.fileSize,
        uploadStatus: 'UPLOADED',
        uploadedAt: new Date(),
        ...(extracted.fullName ? { fullName: extracted.fullName } : {}),
        ...(extracted.email ? { email: extracted.email } : {}),
        ...(extracted.phone ? { phone: extracted.phone } : {}),
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

    return { resume: this.toGuestDto(record) };
  }

  async linkGuestResume(token: string, userId: string) {
    const record = await this.prisma.resume.findFirst({
      where: { guestTokenHash: this.hashToken(token), deletedAt: null },
      select: { id: true, userId: true },
    });

    if (!record) {
      throw new NotFoundException('Guest resume not found or no longer available');
    }

    if (record.userId && record.userId !== userId) {
      throw new ForbiddenException('This resume has already been linked to another account');
    }

    if (record.userId === userId) {
      return { message: 'Resume is already linked to your account', resumeId: record.id };
    }

    const linked = await this.prisma.resume.update({
      where: { id: record.id },
      data: { userId },
      select: { id: true },
    });

    return { message: 'Resume linked to your account', resumeId: linked.id };
  }
}
