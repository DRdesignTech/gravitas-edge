import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('experience-levels')
@Controller('experience-levels')
export class PublicExperienceLevelsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List experience levels for filters (public, read-only)' })
  list() {
    return this.prisma.experienceLevel.findMany({
      orderBy: [{ sortOrder: 'asc' }, { minYears: 'asc' }],
      select: { id: true, name: true, minYears: true, maxYears: true, sortOrder: true },
    });
  }
}