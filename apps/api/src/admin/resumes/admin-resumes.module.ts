import { Module } from '@nestjs/common';
import { AdminResumesController } from './admin-resumes.controller';
import { AdminResumesService } from './admin-resumes.service';
import { ResumeExtractionService } from './resume-extraction.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../resumes/storage/storage.service';

@Module({
  controllers: [AdminResumesController],
  providers: [AdminResumesService, ResumeExtractionService, PrismaService, StorageService],
  exports: [AdminResumesService, ResumeExtractionService],
})
export class AdminResumesModule {}
