import { Module } from '@nestjs/common';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';
import { GuestResumesController } from './guest-resumes.controller';
import { GuestResumesService } from './guest-resumes.service';
import { StorageService } from '../resumes/storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ResumesController, GuestResumesController],
  providers: [ResumesService, GuestResumesService, StorageService, PrismaService],
  exports: [StorageService],
})
export class ResumesModule {}
