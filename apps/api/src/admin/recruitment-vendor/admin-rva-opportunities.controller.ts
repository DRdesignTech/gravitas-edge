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
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminRvaOpportunitiesService } from './admin-rva-opportunities.service';
import { CreateRvaOpportunityDto } from './dto/create-rva-opportunity.dto';
import { UpdateRvaOpportunityDto } from './dto/update-rva-opportunity.dto';
import { QueryRvaOpportunitiesDto } from './dto/query-rva-opportunities.dto';
import { BulkDeleteRvaOpportunitiesDto } from './dto/bulk-delete-rva-opportunities.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';

@ApiTags('admin-recruitment-vendor-opportunities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/recruitment-vendor/opportunities')
export class AdminRvaOpportunitiesController {
  constructor(private readonly service: AdminRvaOpportunitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List Recruitment Vendor Access opportunities (paginated)' })
  list(@Query() query: QueryRvaOpportunitiesDto) {
    return this.service.list(query);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk archive or permanently delete RVA opportunities' })
  bulkDelete(
    @Body() dto: BulkDeleteRvaOpportunitiesDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.bulkDelete(dto, user.id, this.clientIp(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Recruitment Vendor Access opportunity' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a Recruitment Vendor Access opportunity' })
  create(
    @Body() dto: CreateRvaOpportunityDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.create(dto, user.id, this.clientIp(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a Recruitment Vendor Access opportunity' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRvaOpportunityDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.update(id, dto, user.id, this.clientIp(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a Recruitment Vendor Access opportunity' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.service.remove(id, user.id, this.clientIp(req));
  }

  @Delete(':id/permanent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete a Recruitment Vendor Access opportunity' })
  hardDelete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.service.permanentDelete(id, user.id, this.clientIp(req));
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
  @ApiOperation({ summary: 'Import RVA opportunities from a CSV/Excel file' })
  import(
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category: string,
    @Body('defaultStatus') defaultStatus: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.import(file, category, user.id, this.clientIp(req), defaultStatus);
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
  @ApiOperation({ summary: 'Preview (validate) an RVA import without persisting any rows' })
  previewImport(
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category: string,
    @Body('defaultStatus') defaultStatus: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.previewImport(file, category, user.id, defaultStatus);
  }

  private clientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return req.ip;
  }
}
