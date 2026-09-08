import { Injectable, UnprocessableEntityException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../resumes/storage/storage.service';
import { QueryResumesDto } from '../resumes/dto/resumes.dto';
import { ResumeResponseDto } from '../resumes/dto/resumes.dto';
import {
  isValidResumeFile,
  getExtension,
} from '../resumes/validation/resume.validation';
import { existsSync, createReadStream } from 'fs';

@Injectable()
export class ResumesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(
    userId: string,
    originalName: string,
    mimeType: string,
    fileSize: number,
    buffer: Buffer,
  ): Promise<ResumeResponseDto> {
    const validation = isValidResumeFile(originalName, fileSize, buffer);
    if (!validation.valid) {
      throw new UnprocessableEntityException(validation.error);
    }

    const extension = getExtension(originalName);

    const { storageName, storagePath: storagePathValue } = this.storage.saveFile(
      buffer,
      originalName,
      userId,
    );

    const resume = await this.prisma.resume.create({
      data: {
        userId,
        originalName,
        storageName,
        fileType: extension,
        fileSize,
        storageProvider: 'local',
        storagePath: storagePathValue,
        uploadStatus: 'UPLOADED',
      },
      select: {
        id: true,
        originalName: true,
        storageName: true,
        fileType: true,
        fileSize: true,
        storageProvider: true,
        storagePath: true,
        uploadStatus: true,
        uploadedAt: true,
        processedAt: true,
        createdAt: true,
      },
    });

    return {
      id: resume.id,
      originalName: resume.originalName,
      mimeType,
      fileSize: resume.fileSize,
      storageProvider: resume.storageProvider,
      storagePath: resume.storagePath,
      uploadStatus: resume.uploadStatus,
      uploadedAt: resume.uploadedAt,
      processedAt: resume.processedAt as Date | undefined,
      isDeleted: false,
    };
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
          storageName: true,
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
        storagePath: (r as any).storagePath,
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
        storageName: true,
        fileType: true,
        fileSize: true,
        storageProvider: true,
        storagePath: true,
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
      storagePath: resume.storagePath,
      uploadStatus: resume.uploadStatus,
      uploadedAt: resume.uploadedAt,
      processedAt: resume.processedAt as Date | undefined,
      user: resume.user,
      isDeleted: false,
    };
  }

  async download(id: string, userId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId },
      select: { storagePath: true, originalName: true, fileType: true, fileSize: true },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found or access denied');
    }

    const filePath = this.storage.getFullPath(resume.storagePath);

    if (!existsSync(filePath)) {
      throw new InternalServerErrorException('Resume file not found on disk');
    }

    return createReadStream(filePath);
  }

  async replace(
    id: string,
    userId: string,
    originalName: string,
    mimeType: string,
    fileSize: number,
    buffer: Buffer,
  ): Promise<ResumeResponseDto> {
    const validation = isValidResumeFile(originalName, fileSize, buffer);
    if (!validation.valid) {
      throw new UnprocessableEntityException(validation.error);
    }

    const extension = getExtension(originalName);

    const existing = await this.prisma.resume.findFirst({
      where: { id, userId },
      select: { storagePath: true, originalName: true, uploadStatus: true },
    });

    if (!existing) {
      throw new NotFoundException('Resume not found');
    }

    const { storageName: newStorageName } = this.storage.saveFile(
      buffer,
      originalName,
      userId,
    );

    const updated = await this.prisma.resume.update({
      where: { id },
      data: {
        originalName,
        storageName: newStorageName,
        fileType: extension,
        fileSize,
        uploadStatus: 'UPLOADED',
      },
      select: {
        id: true,
        originalName: true,
        storageName: true,
        fileType: true,
        fileSize: true,
        storageProvider: true,
        storagePath: true,
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
      storagePath: updated.storagePath,
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
      return;
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
}