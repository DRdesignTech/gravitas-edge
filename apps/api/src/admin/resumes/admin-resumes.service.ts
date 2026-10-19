import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  StreamableFile,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../resumes/storage/storage.service';
import { ResumeExtractionService, ExtractedResumeData } from './resume-extraction.service';
import { AdminResumeQueryDto, ResumeSource, ResumeSortBy } from './dto/admin-resumes.dto';
import { existsSync, createReadStream, readFileSync } from 'fs';

const MIME_BY_TYPE: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

@Injectable()
export class AdminResumesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly extraction: ResumeExtractionService,
  ) {}

  private buildWhere(query: AdminResumeQueryDto): Record<string, any> {
    const {
      search,
      source = ResumeSource.ALL,
      fileType,
      uploadStatus,
      processingStatus,
      uploadedAfter,
      uploadedBefore,
    } = query;

    const where: Record<string, any> = { deletedAt: null };

    if (source === ResumeSource.GUEST) where.userId = null;
    if (source === ResumeSource.AUTHENTICATED) where.userId = { not: null };

    if (search) {
      where.OR = [
        { originalName: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { profile: { fullName: { contains: search, mode: 'insensitive' } } } },
        { candidateProfile: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (fileType) where.fileType = fileType;
    if (uploadStatus) where.uploadStatus = uploadStatus;
    if (processingStatus) where.processing = { status: processingStatus };
    if (uploadedAfter || uploadedBefore) {
      where.uploadedAt = {};
      if (uploadedAfter) where.uploadedAt.gte = new Date(uploadedAfter);
      if (uploadedBefore) where.uploadedAt.lte = new Date(uploadedBefore);
    }

    return where;
  }

  async list(query: AdminResumeQueryDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = ResumeSortBy.UPLOADED_AT,
      sortOrder = 'desc',
      includeProfile = false,
    } = query;

    const skip = (page - 1) * limit;
    const where = this.buildWhere(query);

    const [resumes, total] = await this.prisma.$transaction([
      this.prisma.resume.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
          candidateProfile: includeProfile
            ? {
                include: {
                  skills: true,
                  workExperience: true,
                  education: true,
                  certifications: true,
                  industries: true,
                  functionalAreas: true,
                },
              }
            : false,
          processing: { select: { status: true } },
        },
      }),
      this.prisma.resume.count({ where }),
    ]);

    return {
      data: resumes.map((r) => this.mapResume(r, includeProfile)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private mapResume(resume: any, includeProfile: boolean) {
    const filePath = this.storage.getFullPath(resume.storagePath);
    const fileExists = existsSync(filePath);

    const candidateProfile =
      includeProfile && resume.candidateProfile
        ? {
            fullName: resume.candidateProfile.fullName,
            email: resume.candidateProfile.email,
            phone: resume.candidateProfile.phone,
            location: resume.candidateProfile.location,
            totalExperienceMonths: resume.candidateProfile.totalExperience,
            currentJobTitle: resume.candidateProfile.currentJobTitle,
            currentCompany: resume.candidateProfile.currentCompany,
            skills: resume.candidateProfile.skills?.map((s: any) => s.name) || [],
            workExperience:
              resume.candidateProfile.workExperience?.map((w: any) => ({
                company: w.company,
                jobTitle: w.jobTitle,
                startDate: w.startDate?.toISOString(),
                endDate: w.endDate?.toISOString(),
                isCurrent: w.isCurrent,
              })) || [],
            education:
              resume.candidateProfile.education?.map((e: any) => ({
                qualification: e.qualification,
                institution: e.institution,
                startYear: e.startYear,
                endYear: e.endYear,
              })) || [],
            certifications:
              resume.candidateProfile.certifications?.map((c: any) => ({
                name: c.name,
                issuer: c.issuer,
                issueYear: c.issueYear,
              })) || [],
            industries: resume.candidateProfile.industries?.map((i: any) => i.name) || [],
            functionalAreas: resume.candidateProfile.functionalAreas?.map((f: any) => f.name) || [],
          }
        : undefined;

    const isGuest = !resume.userId;

    return {
      id: resume.id,
      originalName: resume.originalName,
      fileType: resume.fileType,
      fileSize: resume.fileSize,
      storageProvider: resume.storageProvider,
      uploadStatus: resume.uploadStatus,
      uploadedAt: resume.uploadedAt,
      processedAt: resume.processedAt,
      source: isGuest ? ('GUEST' as const) : ('AUTHENTICATED' as const),
      fullName:
        resume.fullName ??
        resume.user?.profile?.fullName ??
        resume.candidateProfile?.fullName ??
        null,
      email: resume.email ?? resume.user?.email ?? null,
      phone: resume.phone ?? null,
      user: resume.user
        ? {
            id: resume.user.id,
            email: resume.user.email,
            fullName: resume.user.profile?.fullName,
          }
        : undefined,
      candidateProfile,
      fileExists,
    };
  }

  async getById(id: string, includeProfile = false) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        candidateProfile: includeProfile
          ? {
              include: {
                skills: true,
                workExperience: true,
                education: true,
                certifications: true,
                industries: true,
                functionalAreas: true,
              },
            }
          : false,
        processing: { select: { status: true } },
      },
    });

    if (!resume || resume.deletedAt) throw new NotFoundException('Resume not found');

    return this.mapResume(resume, includeProfile);
  }

  async download(id: string): Promise<StreamableFile> {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
      select: {
        storagePath: true,
        originalName: true,
        fileType: true,
        fileSize: true,
        deletedAt: true,
      },
    });

    if (!resume || resume.deletedAt) throw new NotFoundException('Resume not found');

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

  async extractAndSaveProfile(id: string): Promise<ExtractedResumeData | null> {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
      select: {
        id: true,
        storagePath: true,
        fileType: true,
        originalName: true,
        userId: true,
        deletedAt: true,
        candidateProfile: { select: { id: true } },
      },
    });

    if (!resume || resume.deletedAt) throw new NotFoundException('Resume not found');
    if (!resume.userId) {
      throw new BadRequestException(
        'Profile extraction is only available for resumes linked to a user account',
      );
    }
    if (resume.candidateProfile) {
      throw new Error('Profile already exists for this resume');
    }

    const filePath = this.storage.getFullPath(resume.storagePath);
    if (!existsSync(filePath)) {
      throw new InternalServerErrorException('Resume file not found on disk');
    }

    const buffer = readFileSync(filePath);

    try {
      const text = await this.extraction.extractText(buffer, resume.fileType);
      const extracted = this.extraction.parseResumeText(text);

      if (extracted.rawText.length > 100) {
        await this.prisma.candidateProfile.create({
          data: {
            userId: resume.userId,
            resumeId: resume.id,
            fullName: extracted.fullName,
            email: extracted.email,
            phone: extracted.phone,
            location: extracted.location,
            totalExperience: extracted.totalExperienceMonths,
            currentJobTitle: extracted.currentJobTitle,
            currentCompany: extracted.currentCompany,
            resumeText: extracted.rawText.substring(0, 50000),
            confirmationStatus: 'EXTRACTED',
            skills:
              extracted.skills.length > 0
                ? {
                    create: extracted.skills.map((name) => ({ name, source: 'EXTRACTED' })),
                  }
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

        await this.prisma.resume.update({
          where: { id: resume.id },
          data: { uploadStatus: 'COMPLETED', processedAt: new Date() },
        });
      }

      return extracted;
    } catch (error) {
      await this.prisma.resume.update({
        where: { id: resume.id },
        data: { uploadStatus: 'FAILED' },
      });
      throw error;
    }
  }
}
