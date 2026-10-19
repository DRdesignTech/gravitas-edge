import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecruitmentVendorCategory, RecruitmentVendorOpportunityStatus } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

export class BulkDeleteRvaOpportunitiesDto {
  @ApiPropertyOptional({
    description: 'Explicit opportunity IDs to target. When provided, filter fields are ignored.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  ids?: string[];

  @ApiProperty({
    enum: ['archive', 'permanent'],
    description: 'archive = soft delete, permanent = hard delete',
  })
  @IsIn(['archive', 'permanent'])
  mode!: 'archive' | 'permanent';

  @ApiPropertyOptional({
    description: 'Required acknowledgement when neither ids nor any filter is provided.',
  })
  @IsOptional()
  @IsIn([true])
  confirmAll?: true;

  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: RecruitmentVendorOpportunityStatus })
  @IsOptional()
  @IsEnum(RecruitmentVendorOpportunityStatus)
  status?: RecruitmentVendorOpportunityStatus;
  @ApiPropertyOptional({ enum: RecruitmentVendorCategory })
  @IsOptional()
  @IsEnum(RecruitmentVendorCategory)
  category?: RecruitmentVendorCategory;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sector?: string;
  @ApiPropertyOptional({ description: 'ISO 8601' })
  @IsOptional()
  @IsString()
  publishedAfter?: string;
  @ApiPropertyOptional({ description: 'ISO 8601' })
  @IsOptional()
  @IsString()
  publishedBefore?: string;
  @ApiPropertyOptional({ description: 'ISO 8601' }) @IsOptional() @IsString() expiryAfter?: string;
  @ApiPropertyOptional({ description: 'ISO 8601' }) @IsOptional() @IsString() expiryBefore?: string;
  @ApiPropertyOptional({ description: 'ISO 8601' }) @IsOptional() @IsString() createdAfter?: string;
  @ApiPropertyOptional({ description: 'ISO 8601' })
  @IsOptional()
  @IsString()
  createdBefore?: string;
}
