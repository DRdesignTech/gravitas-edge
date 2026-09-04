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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminVaultsService } from './admin-vaults.service';
import { CreateVaultDto } from './dto/create-vault.dto';
import { UpdateVaultDto } from './dto/update-vault.dto';
import { QueryVaultsDto } from './dto/query-vaults.dto';
import { LinkExperienceLevelDto } from './dto/link-experience-level.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';

@ApiTags('admin-vaults')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/vaults')
export class AdminVaultsController {
  constructor(private readonly adminVaultsService: AdminVaultsService) {}

  @Get()
  @ApiOperation({ summary: 'List vaults (paginated, searchable)' })
  list(@Query() query: QueryVaultsDto) {
    return this.adminVaultsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vault with experience levels and linked plans' })
  findOne(@Param('id') id: string) {
    return this.adminVaultsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a vault' })
  create(@Body() dto: CreateVaultDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.adminVaultsService.create(dto, user.id, this.clientIp(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a vault' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVaultDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminVaultsService.update(id, dto, user.id, this.clientIp(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive/delete a vault (no hard delete if referenced)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.adminVaultsService.remove(id, user.id, this.clientIp(req));
  }

  // ---- Experience level linking ----

  @Get(':id/experience-levels')
  @ApiOperation({ summary: 'List experience levels linked to a vault' })
  listExperienceLevels(@Param('id') id: string) {
    return this.adminVaultsService.listExperienceLevels(id);
  }

  @Post(':id/experience-levels')
  @ApiOperation({ summary: 'Link an experience level to a vault' })
  addExperienceLevel(
    @Param('id') id: string,
    @Body() dto: LinkExperienceLevelDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminVaultsService.addExperienceLevel(
      id,
      dto.experienceLevelId,
      user.id,
      this.clientIp(req),
    );
  }

  @Delete(':id/experience-levels/:experienceLevelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an experience level from a vault' })
  removeExperienceLevel(
    @Param('id') id: string,
    @Param('experienceLevelId') experienceLevelId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminVaultsService.removeExperienceLevel(
      id,
      experienceLevelId,
      user.id,
      this.clientIp(req),
    );
  }

  private clientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? undefined;
  }
}
