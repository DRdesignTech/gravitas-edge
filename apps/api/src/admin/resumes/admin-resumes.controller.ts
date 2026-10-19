import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminResumesService } from './admin-resumes.service';
import { AdminResumeQueryDto, AdminResumePaginatedResponseDto } from './dto/admin-resumes.dto';

@ApiTags('admin/resumes')
@Controller('admin/resumes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminResumesController {
  constructor(private readonly adminResumesService: AdminResumesService) {}

  @Get()
  @ApiOperation({ summary: 'List all resumes (authenticated + guest) with filters and pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by filename, user email, candidate name',
  })
  @ApiQuery({
    name: 'source',
    required: false,
    enum: ['ALL', 'AUTHENTICATED', 'GUEST'],
    description: 'Filter by resume source',
  })
  @ApiQuery({
    name: 'fileType',
    required: false,
    type: String,
    description: 'Filter by file type (pdf, doc, docx)',
  })
  @ApiQuery({
    name: 'uploadStatus',
    required: false,
    type: String,
    description: 'Filter by upload status',
  })
  @ApiQuery({
    name: 'processingStatus',
    required: false,
    type: String,
    description: 'Filter by processing status',
  })
  @ApiQuery({
    name: 'uploadedAfter',
    required: false,
    type: String,
    description: 'Start date filter (ISO)',
  })
  @ApiQuery({
    name: 'uploadedBefore',
    required: false,
    type: String,
    description: 'End date filter (ISO)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['uploadedAt', 'originalName', 'fileSize', 'fileType', 'uploadStatus'],
    description: 'Sort field',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order',
  })
  @ApiQuery({
    name: 'includeProfile',
    required: false,
    type: Boolean,
    description: 'Include extracted candidate profile data',
  })
  async list(@Query() query: AdminResumeQueryDto): Promise<AdminResumePaginatedResponseDto> {
    return this.adminResumesService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resume details by ID' })
  async getById(@Param('id') id: string, @Query('includeProfile') includeProfile?: string) {
    return this.adminResumesService.getById(id, includeProfile === 'true');
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download resume file (admin access)' })
  async download(@Param('id') id: string) {
    return this.adminResumesService.download(id);
  }

  @Get(':id/extract')
  @ApiOperation({ summary: 'Extract and save candidate profile from resume (admin only)' })
  async extract(@Param('id') id: string) {
    return this.adminResumesService.extractAndSaveProfile(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a resume (admin only)' })
  async remove(@Param('id') id: string) {
    return this.adminResumesService.remove(id);
  }
}
