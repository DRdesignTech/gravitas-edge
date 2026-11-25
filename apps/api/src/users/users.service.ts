import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    const normalizedPhone = dto.phone?.trim() || undefined;

    if (normalizedPhone && normalizedPhone !== user.phone) {
      const taken = await this.prisma.user.findFirst({
        where: { phone: normalizedPhone, deletedAt: null },
      });
      if (taken && taken.id !== userId) {
        throw new ConflictException('Phone already registered');
      }
    }

    const cleanedSkills = Array.isArray(dto.skills)
      ? [
          ...new Set(
            dto.skills.map((s) => s.trim()).filter((s) => s.length > 0 && s.length <= 80),
          ),
        ].slice(0, 50)
      : undefined;

    await this.prisma.$transaction(async (tx) => {
      if (normalizedPhone !== undefined) {
        await tx.user.update({ where: { id: userId }, data: { phone: normalizedPhone } });
      }

      const profileData: Prisma.UserProfileUncheckedCreateWithoutUserInput = {
        fullName: dto.fullName !== undefined ? dto.fullName.trim() || null : undefined,
        phone: normalizedPhone,
        location: dto.location !== undefined ? dto.location.trim() || null : undefined,
        yearsExperience: dto.yearsExperience,
        monthsExperience: dto.monthsExperience,
        currentJobTitle:
          dto.currentJobTitle !== undefined ? dto.currentJobTitle.trim() || null : undefined,
        currentCompany:
          dto.currentCompany !== undefined ? dto.currentCompany.trim() || null : undefined,
        skills: cleanedSkills as unknown as Prisma.InputJsonValue | undefined,
        education: dto.education as unknown as Prisma.InputJsonValue | undefined,
        workExperience: dto.workExperience as unknown as Prisma.InputJsonValue | undefined,
        certifications: dto.certifications as unknown as Prisma.InputJsonValue | undefined,
        careerPreferences: dto.careerPreferences as unknown as Prisma.InputJsonValue | undefined,
      };

      const existingProfile = await tx.userProfile.findUnique({ where: { userId } });
      if (existingProfile) {
        await tx.userProfile.update({
          where: { userId },
          data: profileData as Prisma.UserProfileUpdateInput,
        });
      } else if (Object.values(profileData).some((v) => v !== undefined)) {
        await tx.userProfile.create({ data: { userId, ...profileData } });
      }

      // Keep the latest CandidateProfile synchronized when present.
      const latestCandidate = await tx.candidateProfile.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      });

      if (latestCandidate) {
        const totalMonths =
          dto.yearsExperience != null || dto.monthsExperience != null
            ? (dto.yearsExperience ?? user.profile?.yearsExperience ?? 0) * 12 +
              (dto.monthsExperience ?? user.profile?.monthsExperience ?? 0)
            : undefined;

        await tx.candidateProfile.update({
          where: { id: latestCandidate.id },
          data: {
            fullName: dto.fullName !== undefined ? dto.fullName.trim() || null : undefined,
            phone: normalizedPhone,
            location: dto.location !== undefined ? dto.location.trim() || null : undefined,
            totalExperience: totalMonths,
            currentJobTitle:
              dto.currentJobTitle !== undefined ? dto.currentJobTitle.trim() || null : undefined,
            currentCompany:
              dto.currentCompany !== undefined ? dto.currentCompany.trim() || null : undefined,
            confirmationStatus: 'CONFIRMED',
            ...(cleanedSkills !== undefined
              ? {
                  skills: {
                    deleteMany: {},
                    create: cleanedSkills.map((name) => ({ name, source: 'USER_CONFIRMED' })),
                  },
                }
              : {}),
            ...(dto.education !== undefined
              ? {
                  education: {
                    deleteMany: {},
                    create: dto.education.map((e) => ({
                      qualification: e.qualification.trim(),
                      institution: e.institution?.trim() || null,
                      startYear: e.startYear ?? null,
                      endYear: e.endYear ?? null,
                      source: 'USER_CONFIRMED',
                    })),
                  },
                }
              : {}),
            ...(dto.workExperience !== undefined
              ? {
                  workExperience: {
                    deleteMany: {},
                    create: dto.workExperience.map((w) => ({
                      company: w.company.trim(),
                      jobTitle: w.jobTitle?.trim() || null,
                      startDate: w.startDate ? new Date(w.startDate) : null,
                      endDate: w.endDate ? new Date(w.endDate) : null,
                      isCurrent: Boolean(w.isCurrent),
                      source: 'USER_CONFIRMED',
                    })),
                  },
                }
              : {}),
            ...(dto.certifications !== undefined
              ? {
                  certifications: {
                    deleteMany: {},
                    create: dto.certifications.map((c) => ({
                      name: c.name.trim(),
                      issuer: c.issuer?.trim() || null,
                      issueYear: c.issueYear ?? null,
                      source: 'USER_CONFIRMED',
                    })),
                  },
                }
              : {}),
          },
        });
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

  async getCandidateProfile(userId: string) {
    const [user, candidate] = await Promise.all([
      this.findUserWithProfile(userId),
      this.prisma.candidateProfile.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          resume: {
            select: {
              id: true,
              originalName: true,
              uploadedAt: true,
              uploadStatus: true,
              processing: { select: { status: true, parserVersion: true, completedAt: true } },
            },
          },
          skills: true,
          workExperience: true,
          education: true,
          certifications: true,
          industries: true,
          functionalAreas: true,
        },
      }),
    ]);

    return {
      profile: user.profile ?? null,
      candidateProfile: candidate
        ? {
            id: candidate.id,
            resumeId: candidate.resumeId,
            confirmationStatus: candidate.confirmationStatus,
            fullName: candidate.fullName,
            email: candidate.email,
            phone: candidate.phone,
            location: candidate.location,
            totalExperienceMonths: candidate.totalExperience,
            currentJobTitle: candidate.currentJobTitle,
            currentCompany: candidate.currentCompany,
            skills: candidate.skills.map((s) => s.name),
            workExperience: candidate.workExperience.map((w) => ({
              company: w.company,
              jobTitle: w.jobTitle,
              startDate: w.startDate?.toISOString() ?? null,
              endDate: w.endDate?.toISOString() ?? null,
              isCurrent: w.isCurrent,
            })),
            education: candidate.education.map((e) => ({
              qualification: e.qualification,
              institution: e.institution,
              startYear: e.startYear,
              endYear: e.endYear,
            })),
            certifications: candidate.certifications.map((c) => ({
              name: c.name,
              issuer: c.issuer,
              issueYear: c.issueYear,
            })),
            industries: candidate.industries.map((i) => i.name),
            functionalAreas: candidate.functionalAreas.map((f) => f.name),
            resume: candidate.resume,
            updatedAt: candidate.updatedAt,
          }
        : null,
    };
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
