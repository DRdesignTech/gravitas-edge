import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum ResumeSource {
  ALL = 'ALL',
  AUTHENTICATED = 'AUTHENTICATED',
  GUEST = 'GUEST',
}

export enum ResumeSortBy {
  UPLOADED_AT = 'uploadedAt',
  FILE_NAME = 'originalName',
  FILE_SIZE = 'fileSize',
  FILE_TYPE = 'fileType',
  PROCESSING_STATUS = 'uploadStatus',
}

export class AdminResumeQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search by filename, user email, candidate name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ResumeSource, description: 'Filter by resume source' })
  @IsOptional()
  @IsEnum(ResumeSource)
  source?: ResumeSource = ResumeSource.ALL;

  @ApiPropertyOptional({ description: 'Filter by file type' })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiPropertyOptional({ description: 'Filter by upload status' })
  @IsOptional()
  @IsString()
  uploadStatus?: string;

  @ApiPropertyOptional({ description: 'Filter by processing status' })
  @IsOptional()
  @IsString()
  processingStatus?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO)' })
  @IsOptional()
  @IsString()
  uploadedAfter?: string;

  @ApiPropertyOptional({ description: 'End date (ISO)' })
  @IsOptional()
  @IsString()
  uploadedBefore?: string;

  @ApiPropertyOptional({ enum: ResumeSortBy, default: ResumeSortBy.UPLOADED_AT })
  @IsOptional()
  @IsEnum(ResumeSortBy)
  sortBy?: ResumeSortBy = ResumeSortBy.UPLOADED_AT;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Include extracted candidate profile data' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeProfile?: boolean = false;
}

export class AdminResumeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty()
  fileType: string;

  @ApiProperty()
  fileSize: number;

  @ApiProperty()
  storageProvider: string;

  @ApiProperty()
  uploadStatus: string;

  @ApiProperty()
  uploadedAt: Date;

  @ApiPropertyOptional()
  processedAt?: Date;

  @ApiProperty()
  source: 'AUTHENTICATED' | 'GUEST';

  @ApiPropertyOptional({ description: 'Candidate full name (guest-provided or profile)' })
  fullName?: string | null;

  @ApiPropertyOptional({ description: 'Contact email' })
  email?: string | null;

  @ApiPropertyOptional({ description: 'Contact phone (guest uploads)' })
  phone?: string | null;

  @ApiPropertyOptional()
  user?: {
    id: string;
    email: string;
    fullName?: string | null;
  };

  @ApiPropertyOptional()
  candidateProfile?: {
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    totalExperienceMonths?: number | null;
    currentJobTitle?: string | null;
    currentCompany?: string | null;
    skills?: string[];
    workExperience?: Array<{
      company: string;
      jobTitle?: string;
      startDate?: string;
      endDate?: string;
      isCurrent: boolean;
    }>;
    education?: Array<{
      qualification: string;
      institution?: string;
      startYear?: number | null;
      endYear?: number | null;
    }>;
    certifications?: Array<{
      name: string;
      issuer?: string;
      issueYear?: number | null;
    }>;
    industries?: string[];
    functionalAreas?: string[];
  };

  @ApiProperty()
  fileExists: boolean;

  @ApiPropertyOptional()
  extractionError?: string;
}

export class AdminResumeDetailResponseDto extends AdminResumeResponseDto {
  @ApiPropertyOptional()
  storagePath?: string;

  @ApiPropertyOptional()
  rawTextPreview?: string;
}

export class AdminResumePaginatedResponseDto {
  @ApiProperty({ type: [AdminResumeResponseDto] })
  data: AdminResumeResponseDto[];

  @ApiProperty()
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
