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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Request } from 'express';
import { OpportunityStatus } from '@prisma/client';
import { AdminOpportunitiesService } from './admin-opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { QueryOpportunitiesDto } from './dto/query-opportunities.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';

@ApiTags('admin-opportunities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/opportunities')
export class AdminOpportunitiesController {
  constructor(private readonly opportunitiesService: AdminOpportunitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List opportunities (paginated, searchable, filterable)' })
  list(@Query() query: QueryOpportunitiesDto) {
    return this.opportunitiesService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an opportunity with vaults and experience levels' })
  findOne(@Param('id') id: string) {
    return this.opportunitiesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an opportunity' })
  create(
    @Body() dto: CreateOpportunityDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.opportunitiesService.create(dto, user.id, this.clientIp(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an opportunity' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.opportunitiesService.update(id, dto, user.id, this.clientIp(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive/delete an opportunity' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.opportunitiesService.remove(id, user.id, this.clientIp(req));
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import opportunities from CSV/Excel file into a vault' })
  import(
    @UploadedFile() file: Express.Multer.File,
    @Body('vaultId') vaultId: string,
    @Body('defaultStatus') defaultStatus: OpportunityStatus,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.opportunitiesService.import(
      file,
      vaultId,
      user.id,
      this.clientIp(req),
      defaultStatus,
    );
  }

  @Post('import/preview')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Preview (validate) an import without persisting any rows' })
  previewImport(
    @UploadedFile() file: Express.Multer.File,
    @Body('vaultId') vaultId: string,
    @Body('defaultStatus') defaultStatus: OpportunityStatus,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.opportunitiesService.previewImport(file, vaultId, user.id, defaultStatus);
  }

  private clientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? undefined;
  }
}
