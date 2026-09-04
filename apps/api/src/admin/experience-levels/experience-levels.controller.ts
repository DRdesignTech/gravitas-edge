import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ExperienceLevelsService } from './experience-levels.service';
import { CreateExperienceLevelDto } from './dto/create-experience-level.dto';
import { UpdateExperienceLevelDto } from './dto/update-experience-level.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';

@ApiTags('admin-experience-levels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/experience-levels')
export class ExperienceLevelsController {
  constructor(private readonly experienceLevelsService: ExperienceLevelsService) {}

  @Get()
  @ApiOperation({ summary: 'List all experience levels' })
  list() {
    return this.experienceLevelsService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an experience level' })
  findOne(@Param('id') id: string) {
    return this.experienceLevelsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an experience level (validates range + overlap)' })
  create(
    @Body() dto: CreateExperienceLevelDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.experienceLevelsService.create(dto, user.id, this.clientIp(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an experience level' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExperienceLevelDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.experienceLevelsService.update(id, dto, user.id, this.clientIp(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an experience level (blocked if referenced)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.experienceLevelsService.remove(id, user.id, this.clientIp(req));
  }

  private clientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? undefined;
  }
}
