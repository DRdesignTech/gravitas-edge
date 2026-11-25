import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  StreamableFile,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { createReadStream, existsSync, readFileSync } from 'fs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../resumes/storage/storage.service';
import { QueryResumesDto, ResumeResponseDto } from '../resumes/dto/resumes.dto';
import { getExtension, isValidResumeFile } from '../resumes/validation/resume.validation';
import {
  ExtractedResumeData,
  ResumeExtractionService,
} from '../admin/resumes/resume-extraction.service';

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
  fullName: true,
  email: true,
  phone: true,
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

  private normalizePhone(phone?: string | null): string | null {
    if (!phone) return null;
    const cleaned = phone.trim().replace(/[^\d+\s\-().]/g, '');
    return cleaned.length >= 7 ? cleaned.slice(0, 20) : null;
  }

  private toYearsMonths(totalMonths?: number): {
    yearsExperience: number | null;
    monthsExperience: number | null;
  } {
    if (totalMonths == null || !Number.isFinite(totalMonths) || totalMonths < 0) {
      return { yearsExperience: null, monthsExperience: null };
    }
    const whole = Math.floor(totalMonths);
    return {
      yearsExperience: Math.floor(whole / 12),
      monthsExperience: whole % 12,
    };
  }

  async extractContactPreview(buffer: Buffer, originalName: string) {
    const ext = getExtension(originalName);
    try {
      const text = await this.extraction.extractText(buffer, ext);
      const { data: parsed, parserVersion } = await this.extraction.parseResumeWithAi(text);
      const { yearsExperience, monthsExperience } = this.toYearsMonths(
        parsed.totalExperienceMonths,
      );

      return {
        fullName: parsed.fullName?.trim() || null,
        email: parsed.email?.trim() || null,
        phone: parsed.phone?.trim() || null,
        location: parsed.location?.trim() || null,
        totalExperienceMonths: parsed.totalExperienceMonths ?? null,
        yearsExperience,
        monthsExperience,
        currentJobTitle: parsed.currentJobTitle?.trim() || null,
        currentCompany: parsed.currentCompany?.trim() || null,
        careerPreferences: parsed.careerPreferences ?? null,
        skills: parsed.skills ?? [],
        education: parsed.education ?? [],
        workExperience: parsed.workExperience.map((w) => ({
          company: w.company,
          jobTitle: w.jobTitle,
          startDate: w.startDate?.toISOString(),
          endDate: w.endDate?.toISOString(),
          isCurrent: w.isCurrent,
        })),
        parserVersion,
      };
    } catch (error) {
      this.logger.warn(
        `Resume contact extraction failed for ${ext}: ${(error as Error)?.message}`,
      );
      return {
        fullName: null,
        email: null,
        phone: null,
        location: null,
        totalExperienceMonths: null,
        yearsExperience: null,
        monthsExperience: null,
        currentJobTitle: null,
        currentCompany: null,
        skills: [],
        education: [],
        workExperience: [],
        parserVersion: 'fallback',
      };
    }
  }

  private async extractContactFast(
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
        `Fast resume contact extraction failed for ${fileType}: ${(error as Error)?.message}`,
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
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
  }) {
    return {
      originalName: record.originalName,
      fileType: record.fileType,
      fileSize: record.fileSize,
      uploadedAt: record.uploadedAt,
      linked: Boolean(record.userId),
      fullName: record.fullName ?? null,
      email: record.email ?? null,
      phone: record.phone ?? null,
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

      const resume = await this.prisma.resume.create({
        data: {
          userId: user.id,
          email: user.email,
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

      const processed = await this.processAndSyncSafe(resume.id, file.buffer, extension, true);

      return {
        id: resume.id,
        originalName: resume.originalName,
        mimeType: file.mimeType,
        fileSize: resume.fileSize,
        storageProvider: resume.storageProvider,
        uploadStatus: processed?.uploadStatus ?? resume.uploadStatus,
        uploadedAt: resume.uploadedAt,
        processedAt: (processed?.processedAt ?? resume.processedAt) as Date | undefined,
        isDeleted: false,
      };
    }

    const fullName = guestDetails.fullName?.trim();
    const email = guestDetails.email?.trim().toLowerCase();
    if (!fullName || !email) {
      throw new BadRequestException('Full name and email are required for guest uploads');
    }

    const { storageName, storagePath } = this.storage.saveGuestFile(file.buffer, file.originalName);
    const token = crypto.randomBytes(32).toString('hex');
    const extracted = await this.extractContactFast(file.buffer, extension);

    const record = await this.prisma.resume.create({
      data: {
        userId: null,
        guestTokenHash: this.hashToken(token),
        fullName: fullName || extracted.fullName,
        email: email || extracted.email,
        phone: this.normalizePhone(guestDetails.phone) ?? this.normalizePhone(extracted.phone),
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

  /**
   * Parses resume text with AI (+ regex fallback), persists `ResumeProcessing` &
   * `CandidateProfile`, and safely backfills missing fields on `User`/`UserProfile`
   * without overwriting any user-entered values. Never throws to callers.
   */
  private async processAndSyncSafe(
    resumeId: string,
    bufferOverride?: Buffer,
    fileTypeOverride?: string,
    refreshEmploymentAndPreferences = false,
  ): Promise<{ uploadStatus: 'COMPLETED' | 'FAILED'; processedAt?: Date } | null> {
    try {
      return await this.processResumeForUser(
        resumeId,
        bufferOverride,
        fileTypeOverride,
        refreshEmploymentAndPreferences,
      );
    } catch (error) {
      this.logger.warn(
        `Non-fatal resume processing failure for ${resumeId}: ${(error as Error)?.message}`,
      );
      return null;
    }
  }

  async processResumeById(id: string, userId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });
    if (!resume) {
      throw new NotFoundException('Resume not found or access denied');
    }
    await this.processResumeForUser(id, undefined, undefined, true);
    return this.findOne(id, userId);
  }

  private async processResumeForUser(
    resumeId: string,
    bufferOverride?: Buffer,
    fileTypeOverride?: string,
    refreshEmploymentAndPreferences = false,
  ): Promise<{ uploadStatus: 'COMPLETED' | 'FAILED'; processedAt?: Date } | null> {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        fullName: true,
        email: true,
        phone: true,
        fileType: true,
        storagePath: true,
        candidateProfile: { select: { id: true, confirmationStatus: true } },
      },
    });

    if (!resume || !resume.userId) return null;

    const ext = fileTypeOverride ?? resume.fileType;
    let buffer = bufferOverride;
    if (!buffer) {
      const fullPath = this.storage.getFullPath(resume.storagePath);
      if (!existsSync(fullPath)) {
        throw new InternalServerErrorException('Resume file not found on disk');
      }
      buffer = readFileSync(fullPath);
    }

    await this.prisma.resumeProcessing.upsert({
      where: { resumeId: resume.id },
      create: { resumeId: resume.id, status: 'PROCESSING', startedAt: new Date() },
      update: { status: 'PROCESSING', startedAt: new Date(), errorMessage: null },
    });

    let extracted: ExtractedResumeData;
    let parserVersion = 'regex-v2';

    try {
      const text = await this.extraction.extractText(buffer, ext);
      const parsed = await this.extraction.parseResumeWithAi(text);
      extracted = parsed.data;
      parserVersion = parsed.parserVersion;
    } catch (error: any) {
      await this.prisma.resumeProcessing.upsert({
        where: { resumeId: resume.id },
        create: {
          resumeId: resume.id,
          status: 'FAILED',
          errorMessage: String(error?.message || 'Resume parsing failed').slice(0, 500),
        },
        update: {
          status: 'FAILED',
          errorMessage: String(error?.message || 'Resume parsing failed').slice(0, 500),
        },
      });
      await this.prisma.resume.update({
        where: { id: resume.id },
        data: { uploadStatus: 'FAILED' },
      });
      return { uploadStatus: 'FAILED' };
    }

    const now = new Date();
    const resolvedFullName = resume.fullName ?? extracted.fullName ?? null;
    const resolvedEmail = resume.email ?? extracted.email ?? null;
    const resolvedPhone =
      this.normalizePhone(resume.phone) ?? this.normalizePhone(extracted.phone);

    // Save extracted CandidateProfile (if not already user-confirmed, recreate cleanly)
    if (extracted.rawText.length > 20) {
      if (
        resume.candidateProfile &&
        resume.candidateProfile.confirmationStatus !== 'CONFIRMED'
      ) {
        await this.prisma.candidateProfile.delete({
          where: { id: resume.candidateProfile.id },
        });
      }

      if (
        !resume.candidateProfile ||
        resume.candidateProfile.confirmationStatus !== 'CONFIRMED'
      ) {
        await this.prisma.candidateProfile.create({
          data: {
            userId: resume.userId,
            resumeId: resume.id,
            fullName: resolvedFullName,
            email: resolvedEmail,
            phone: resolvedPhone,
            location: extracted.location,
            totalExperience: extracted.totalExperienceMonths,
            currentJobTitle: extracted.currentJobTitle,
            currentCompany: extracted.currentCompany,
            resumeText: extracted.rawText.substring(0, 50000),
            confirmationStatus: 'EXTRACTED',
            skills:
              extracted.skills.length > 0
                ? { create: extracted.skills.map((name) => ({ name, source: 'EXTRACTED' })) }
                : undefined,
            workExperience:
              extracted.workExperience.length > 0
                ? {
                    create: extracted.workExperience.map((w) => ({
                      company: w.company,
                      jobTitle: w.jobTitle,
                      startDate: w.startDate,
                      endDate: w.endDate,
                      isCurrent: w.isCurrent,
                      source: 'EXTRACTED',
                    })),
                  }
                : undefined,
            education:
              extracted.education.length > 0
                ? {
                    create: extracted.education.map((e) => ({
                      qualification: e.qualification,
                      institution: e.institution,
                      startYear: e.startYear,
                      endYear: e.endYear,
                      source: 'EXTRACTED',
                    })),
                  }
                : undefined,
            certifications:
              extracted.certifications.length > 0
                ? {
                    create: extracted.certifications.map((c) => ({
                      name: c.name,
                      issuer: c.issuer,
                      issueYear: c.issueYear,
                      source: 'EXTRACTED',
                    })),
                  }
                : undefined,
            industries:
              extracted.industries.length > 0
                ? { create: extracted.industries.map((name) => ({ name, source: 'EXTRACTED' })) }
                : undefined,
            functionalAreas:
              extracted.functionalAreas.length > 0
                ? {
                    create: extracted.functionalAreas.map((name) => ({
                      name,
                      source: 'EXTRACTED',
                    })),
                  }
                : undefined,
          },
        });
      }
    }

    await this.prisma.resumeProcessing.upsert({
      where: { resumeId: resume.id },
      create: {
        resumeId: resume.id,
        status: 'COMPLETED',
        completedAt: now,
        parserVersion,
      },
      update: {
        status: 'COMPLETED',
        completedAt: now,
        parserVersion,
        errorMessage: null,
      },
    });

    await this.prisma.resume.update({
      where: { id: resume.id },
      data: {
        uploadStatus: 'COMPLETED',
        processedAt: now,
        ...(resolvedFullName && !resume.fullName ? { fullName: resolvedFullName } : {}),
        ...(resolvedPhone && !resume.phone ? { phone: resolvedPhone } : {}),
      },
    });

    await this.syncExtractedToUserProfile(
      resume.userId,
      {
        fullName: resolvedFullName,
        phone: resolvedPhone,
        extracted,
      },
      refreshEmploymentAndPreferences,
    );

    return { uploadStatus: 'COMPLETED', processedAt: now };
  }

  /**
   * Syncs resume-extracted Employment & Experience, Career Preferences & Target Roles,
   * skills, education, and contact fields into `User` / `UserProfile`.
   * When `refreshFromUpload` is true (direct CV upload, replace, or Sync AI), newly
   * extracted employment & preferences from the CV update the profile cleanly; during
   * guest-link signup it only backfills empty fields so signup inputs are preserved.
   */
  private async syncExtractedToUserProfile(
    userId: string,
    payload: {
      fullName: string | null;
      phone: string | null;
      extracted: ExtractedResumeData;
    },
    refreshFromUpload = false,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) return;

    let phoneToAssign: string | undefined;
    if (!user.phone && payload.phone) {
      const phoneTaken = await this.prisma.user.findFirst({
        where: { phone: payload.phone, deletedAt: null, id: { not: userId } },
        select: { id: true },
      });
      if (!phoneTaken) {
        phoneToAssign = payload.phone;
      }
    }

    if (phoneToAssign) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { phone: phoneToAssign },
      });
    }

    const { yearsExperience, monthsExperience } = this.toYearsMonths(
      payload.extracted.totalExperienceMonths,
    );

    const existing = user.profile;
    const existingPrefs =
      existing?.careerPreferences && typeof existing.careerPreferences === 'object'
        ? (existing.careerPreferences as Record<string, any>)
        : null;
    const extractedPrefs = payload.extracted.careerPreferences ?? {};
    const mergedPrefs: Record<string, string> = {};
    const resolvedNotice = refreshFromUpload
      ? extractedPrefs.noticePeriod ?? existingPrefs?.noticePeriod
      : existingPrefs?.noticePeriod ?? extractedPrefs.noticePeriod;
    const resolvedWorkMode = refreshFromUpload
      ? extractedPrefs.workPreference ?? existingPrefs?.workPreference
      : existingPrefs?.workPreference ?? extractedPrefs.workPreference;
    const resolvedPreferredRole = refreshFromUpload
      ? extractedPrefs.preferredRole ?? existingPrefs?.preferredRole
      : existingPrefs?.preferredRole ?? extractedPrefs.preferredRole;
    const resolvedPreferredLoc = refreshFromUpload
      ? extractedPrefs.preferredLocation ?? existingPrefs?.preferredLocation
      : existingPrefs?.preferredLocation ?? extractedPrefs.preferredLocation;

    if (resolvedNotice) mergedPrefs.noticePeriod = resolvedNotice;
    if (resolvedWorkMode) mergedPrefs.workPreference = resolvedWorkMode;
    if (resolvedPreferredRole) mergedPrefs.preferredRole = resolvedPreferredRole;
    if (resolvedPreferredLoc) mergedPrefs.preferredLocation = resolvedPreferredLoc;

    const careerPrefsJson =
      Object.keys(mergedPrefs).length > 0
        ? (mergedPrefs as unknown as Prisma.InputJsonValue)
        : undefined;

    const hasSkills =
      Array.isArray(existing?.skills) && (existing.skills as unknown[]).length > 0;
    const hasEducation =
      Array.isArray(existing?.education) && (existing.education as unknown[]).length > 0;
    const hasWork =
      Array.isArray(existing?.workExperience) && (existing.workExperience as unknown[]).length > 0;
    const hasCerts =
      Array.isArray(existing?.certifications) && (existing.certifications as unknown[]).length > 0;

    const educationJson =
      payload.extracted.education.length > 0
        ? (payload.extracted.education.map((e) => ({
            qualification: e.qualification,
            institution: e.institution ?? null,
            startYear: e.startYear ?? null,
            endYear: e.endYear ?? null,
          })) as unknown as Prisma.InputJsonValue)
        : undefined;

    const workJson =
      payload.extracted.workExperience.length > 0
        ? (payload.extracted.workExperience.map((w) => ({
            company: w.company,
            jobTitle: w.jobTitle ?? null,
            startDate: w.startDate?.toISOString() ?? null,
            endDate: w.endDate?.toISOString() ?? null,
            isCurrent: w.isCurrent,
          })) as unknown as Prisma.InputJsonValue)
        : undefined;

    const certsJson =
      payload.extracted.certifications.length > 0
        ? (payload.extracted.certifications.map((c) => ({
            name: c.name,
            issuer: c.issuer ?? null,
            issueYear: c.issueYear ?? null,
          })) as unknown as Prisma.InputJsonValue)
        : undefined;

    if (!existing) {
      await this.prisma.userProfile.create({
        data: {
          userId,
          fullName: payload.fullName ?? null,
          phone: phoneToAssign ?? payload.phone ?? null,
          location: payload.extracted.location ?? null,
          yearsExperience,
          monthsExperience,
          currentJobTitle: payload.extracted.currentJobTitle ?? null,
          currentCompany: payload.extracted.currentCompany ?? null,
          skills:
            payload.extracted.skills.length > 0
              ? (payload.extracted.skills as unknown as Prisma.InputJsonValue)
              : undefined,
          education: educationJson,
          workExperience: workJson,
          certifications: certsJson,
          careerPreferences: careerPrefsJson,
        },
      });
      return;
    }

    const patch: Prisma.UserProfileUpdateInput = {};
    if (!existing.fullName && payload.fullName) patch.fullName = payload.fullName;
    if (!existing.phone && (phoneToAssign || payload.phone)) {
      patch.phone = phoneToAssign ?? payload.phone ?? undefined;
    }
    if ((refreshFromUpload || !existing.location) && payload.extracted.location) {
      patch.location = payload.extracted.location;
    }
    if ((refreshFromUpload || existing.yearsExperience == null) && yearsExperience != null) {
      patch.yearsExperience = yearsExperience;
    }
    if ((refreshFromUpload || existing.monthsExperience == null) && monthsExperience != null) {
      patch.monthsExperience = monthsExperience;
    }
    if ((refreshFromUpload || !existing.currentJobTitle) && payload.extracted.currentJobTitle) {
      patch.currentJobTitle = payload.extracted.currentJobTitle;
    }
    if ((refreshFromUpload || !existing.currentCompany) && payload.extracted.currentCompany) {
      patch.currentCompany = payload.extracted.currentCompany;
    }
    if ((refreshFromUpload || !hasSkills) && payload.extracted.skills.length > 0) {
      patch.skills = payload.extracted.skills as unknown as Prisma.InputJsonValue;
    }
    if ((refreshFromUpload || !hasEducation) && educationJson) patch.education = educationJson;
    if ((refreshFromUpload || !hasWork) && workJson) patch.workExperience = workJson;
    if ((refreshFromUpload || !hasCerts) && certsJson) patch.certifications = certsJson;
    if (careerPrefsJson) patch.careerPreferences = careerPrefsJson;

    if (Object.keys(patch).length > 0) {
      await this.prisma.userProfile.update({
        where: { userId },
        data: patch,
      });
    }
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
          processing: {
            select: {
              status: true,
              parserVersion: true,
              completedAt: true,
              errorMessage: true,
            },
          },
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
        processing: r.processing ?? null,
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
        processing: {
          select: {
            status: true,
            parserVersion: true,
            completedAt: true,
            errorMessage: true,
          },
        },
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
      processing: resume.processing ?? null,
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

    const { storageName: newStorageName, storagePath: newStoragePath } = this.storage.saveFile(
      buffer,
      originalName,
      userId,
    );

    const updated = await this.prisma.resume.update({
      where: { id },
      data: {
        originalName,
        storageName: newStorageName,
        storagePath: newStoragePath,
        fileType: extension,
        fileSize,
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

    try {
      if (existing.storagePath) {
        this.storage.deleteFile(String(existing.storagePath));
      }
    } catch {
      // Log but don't block
    }

    const processed = await this.processAndSyncSafe(updated.id, buffer, extension, true);

    return {
      id: updated.id,
      originalName: updated.originalName,
      mimeType,
      fileSize: updated.fileSize,
      storageProvider: updated.storageProvider,
      uploadStatus: processed?.uploadStatus ?? updated.uploadStatus,
      uploadedAt: updated.uploadedAt,
      processedAt: (processed?.processedAt ?? updated.processedAt) as Date | undefined,
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
    } catch {
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
    const extracted = await this.extractContactFast(file.buffer, extension);

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
        ...(extracted.phone ? { phone: this.normalizePhone(extracted.phone) ?? undefined } : {}),
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
      await this.processAndSyncSafe(record.id);
      return { message: 'Resume is already linked to your account', resumeId: record.id };
    }

    const linked = await this.prisma.resume.update({
      where: { id: record.id },
      data: { userId },
      select: { id: true },
    });

    await this.processAndSyncSafe(linked.id);

    return { message: 'Resume linked to your account', resumeId: linked.id };
  }
}
