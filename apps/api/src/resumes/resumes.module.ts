import { Module } from '@nestjs/common';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';
import { StorageService } from '../resumes/storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ResumesController],
  providers: [ResumesService, StorageService, PrismaService],
  exports: [StorageService],
})
export class ResumesModule {}
