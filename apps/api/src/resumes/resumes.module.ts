import { Module } from '@nestjs/common';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';
import { GuestResumesController } from './guest-resumes.controller';
import { StorageService } from '../resumes/storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { ResumeExtractionService } from '../admin/resumes/resume-extraction.service';

@Module({
  controllers: [ResumesController, GuestResumesController],
  providers: [ResumesService, ResumeExtractionService, StorageService, PrismaService],
  exports: [StorageService, ResumeExtractionService],
})
export class ResumesModule {}
