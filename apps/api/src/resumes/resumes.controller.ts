import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ParseFilePipe } from '@nestjs/common';
import { MaxFileSizeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/auth.types';
import { ResumesService } from './resumes.service';
import { QueryResumesDto } from './dto/resumes.dto';
import { resumeFileFilter } from '../resumes/middleware/file-upload.util';

const RESUME_MAX_SIZE = 5 * 1024 * 1024;

@Controller('resumes')
@ApiTags('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post()
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Upload a resume file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resume: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),
      limits: { fileSize: RESUME_MAX_SIZE },
      fileFilter: resumeFileFilter,
    }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: RESUME_MAX_SIZE })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    const buffer = file.buffer;
    return this.resumesService.create(user.id, file.originalname, file.mimetype, file.size, buffer);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List resumes for authenticated user' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryResumesDto) {
    return this.resumesService.getMeResumes(user.id, query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get resume metadata by ID' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.resumesService.findOne(id, user.id);
  }

  @Get(':id/download')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download resume file (authenticated stream)' })
  download(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.resumesService.download(id, user.id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete resume record' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.resumesService.remove(id, user.id);
    return { message: 'Resume soft-deleted successfully' };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Replace resume file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resume: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),
      limits: { fileSize: RESUME_MAX_SIZE },
      fileFilter: resumeFileFilter,
    }),
  )
  replace(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: RESUME_MAX_SIZE })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    const buffer = file.buffer;
    return this.resumesService.replace(
      id,
      user.id,
      file.originalname,
      file.mimetype,
      file.size,
      buffer,
    );
  }
}
