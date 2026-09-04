import { Module } from '@nestjs/common';
import { ExperienceLevelsController } from './experience-levels.controller';
import { ExperienceLevelsService } from './experience-levels.service';

@Module({
  controllers: [ExperienceLevelsController],
  providers: [ExperienceLevelsService],
})
export class ExperienceLevelsModule {}
