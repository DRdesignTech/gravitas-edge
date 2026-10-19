import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsEmail, Length, Min, Max, MaxLength } from 'class-validator';

export class UploadResumeDto {
  @ApiPropertyOptional({
    description: 'Full name — required for guest (not-logged-in) uploads',
  })
  @IsOptional()
  @IsString()
  @Length(2, 200)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Contact email — required for guest (not-logged-in) uploads',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ description: 'Optional contact phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;
}

export class CreateResumeDto {
  @ApiProperty({ description: 'Original filename of the resume' })
  @IsString()
  @Length(1, 255)
  originalName: string;

  @ApiPropertyOptional({ description: 'File MIME type (will be validated server-side)' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'File size min in bytes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  min?: number;

  @ApiPropertyOptional({ description: 'File size max in bytes' })
  @IsOptional()
  @IsInt()
  @Max(50 * 1024 * 1024)
  max?: number;
}

export class UpdateResumeDto {
  @ApiPropertyOptional({ description: 'New original filename if replacing' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  originalName?: string;
}

export class QueryResumesDto {
  @ApiPropertyOptional({ description: 'Page number, default 1' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Limit per page, default 10, max 50' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class ResumeResponseDto {
  @ApiProperty({ example: 'c4a6e872-1a2b-3c4d-5e6f-7g8h9i0j1k2l' })
  id: string;

  @ApiProperty({ example: 'resume.pdf' })
  originalName: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ example: 123456 })
  fileSize: number;

  @ApiProperty({ example: 'local' })
  storageProvider: string;

  @ApiProperty({ example: 'UPLOADED' })
  uploadStatus: string;

  @ApiProperty({ example: '2026-09-07T10:30:00.000Z' })
  uploadedAt: Date;

  @ApiPropertyOptional({ example: '2026-09-07T10:35:00.000Z' })
  processedAt?: Date;

  @ApiPropertyOptional({ example: true })
  ocrUsed?: boolean;

  @ApiPropertyOptional({ example: true })
  isDeleted?: boolean;
}
