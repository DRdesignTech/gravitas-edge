import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../resumes/storage/storage.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  async getMe(userId: string) {
    const user = await this.findUserWithProfile(userId);
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

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.findUserWithProfile(userId);

    if (dto.phone && dto.phone !== user.phone) {
      const taken = await this.prisma.user.findFirst({
        where: { phone: dto.phone, deletedAt: null },
      });
      if (taken && taken.id !== userId) {
        throw new ConflictException('Phone already registered');
      }
    }

    const data: any = {
      phone: dto.phone ?? undefined,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data });

      const profileData: any = {
        fullName: dto.fullName ?? undefined,
        phone: dto.phone ?? undefined,
        location: dto.location ?? undefined,
        yearsExperience: dto.yearsExperience ?? undefined,
        monthsExperience: dto.monthsExperience ?? undefined,
        currentJobTitle: dto.currentJobTitle ?? undefined,
        currentCompany: dto.currentCompany ?? undefined,
      };

      const existingProfile = await tx.userProfile.findUnique({ where: { userId } });
      if (existingProfile) {
        await tx.userProfile.update({ where: { userId }, data: profileData });
      } else if (Object.values(profileData).some((v) => v !== undefined)) {
        await tx.userProfile.create({ data: { userId, ...profileData } });
      }
    });

    await this.audit.record({
      action: 'USER_PROFILE_UPDATED',
      entityType: 'UserProfile',
      entityId: userId,
      actorUserId: userId,
    });

    return this.getMe(userId);
  }

  async getProfile(userId: string) {
    const user = await this.findUserWithProfile(userId);
    return user.profile ?? null;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.updateMe(userId, dto);
  }

  async uploadProfileImage(userId: string, file: Express.Multer.File) {
    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new UnprocessableEntityException(
        'Invalid file type. Only JPG, PNG, and WebP are allowed.',
      );
    }

    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      throw new UnprocessableEntityException(
        'Invalid file extension. Only JPG, PNG, and WebP are allowed.',
      );
    }

    // Validate file size (max 5MB for profile images)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new UnprocessableEntityException('File too large. Maximum size is 5MB.');
    }

    // Validate file content (basic magic bytes check)
    if (!this.isValidImageFile(file.buffer, file.mimetype)) {
      throw new UnprocessableEntityException('Invalid image file content.');
    }

    // Get existing profile image to delete later
    const existingProfile = await this.prisma.userProfile.findUnique({ where: { userId } });
    const oldImagePath = existingProfile?.profileImg ?? null;

    // Generate safe storage path
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const storageName = `${userId}-${uniqueSuffix}.${extension}`;
    const relativePath = `profile-images/${userId}/${storageName}`;
    const fullPath = this.storage.getFullPath(relativePath);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(fullPath, file.buffer);

    // Update profile with new image path
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, profileImg: relativePath },
      update: { profileImg: relativePath },
    });

    // Delete old image after successful upload
    if (oldImagePath) {
      this.storage.deleteFile(oldImagePath);
    }

    await this.audit.record({
      action: 'USER_PROFILE_IMAGE_UPDATED',
      entityType: 'UserProfile',
      entityId: userId,
      actorUserId: userId,
    });

    return this.getMe(userId);
  }

  async removeProfileImage(userId: string) {
    const existingProfile = await this.prisma.userProfile.findUnique({ where: { userId } });
    const oldImagePath = existingProfile?.profileImg ?? null;

    if (!oldImagePath) {
      return this.getMe(userId); // Nothing to remove
    }

    await this.prisma.userProfile.update({
      where: { userId },
      data: { profileImg: null },
    });

    this.storage.deleteFile(oldImagePath);

    await this.audit.record({
      action: 'USER_PROFILE_IMAGE_REMOVED',
      entityType: 'UserProfile',
      entityId: userId,
      actorUserId: userId,
    });

    return this.getMe(userId);
  }

  private isValidImageFile(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 12) return false;

    // JPEG: FF D8 FF
    if (mimeType === 'image/jpeg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (mimeType === 'image/png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    }

    // WebP: RIFF....WEBP
    if (mimeType === 'image/webp') {
      return (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      );
    }

    return false;
  }

  private async findUserWithProfile(userId: string) {
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
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
