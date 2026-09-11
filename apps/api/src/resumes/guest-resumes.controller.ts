import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ParseFilePipe, MaxFileSizeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/auth.types';
import { GuestResumesService } from './guest-resumes.service';
import { CreateGuestResumeDto } from './dto/guest-resume.dto';
import { resumeFileFilter } from './middleware/file-upload.util';

const RESUME_MAX_SIZE = 5 * 1024 * 1024;

@Controller('resumes/guest')
@ApiTags('resumes')
export class GuestResumesController {
  constructor(private readonly guestResumesService: GuestResumesService) {}

  @Post()
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Upload a guest resume without an account' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['resume', 'fullName', 'email'],
      properties: {
        resume: { type: 'string', format: 'binary' },
        fullName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
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
  create(
    @Body() dto: CreateGuestResumeDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: RESUME_MAX_SIZE })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.guestResumesService.create(dto, {
      originalName: file.originalname,
      fileSize: file.size,
      buffer: file.buffer,
    });
  }

  @Get(':token')
  @Public()
  @ApiOperation({ summary: 'Get a guest resume by its secure reference token' })
  get(@Param('token') token: string) {
    return this.guestResumesService.get(token);
  }

  @Put(':token')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Replace the file for a guest resume' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['resume'],
      properties: {
        resume: { type: 'string', format: 'binary' },
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
    @Param('token') token: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: RESUME_MAX_SIZE })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.guestResumesService.replace(token, {
      originalName: file.originalname,
      fileSize: file.size,
      buffer: file.buffer,
    });
  }

  @Post(':token/link')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link a guest resume to the authenticated user' })
  link(@CurrentUser() user: AuthenticatedUser, @Param('token') token: string) {
    return this.guestResumesService.link(token, user.id);
  }
}
