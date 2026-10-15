import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RecruitmentVendorCategory, RecruitmentVendorOpportunityStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryRvaOpportunitiesDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 'staffing' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: RecruitmentVendorOpportunityStatus })
  @IsOptional()
  @IsEnum(RecruitmentVendorOpportunityStatus)
  status?: RecruitmentVendorOpportunityStatus;

  @ApiPropertyOptional({ enum: RecruitmentVendorCategory })
  @IsOptional()
  @IsEnum(RecruitmentVendorCategory)
  category?: RecruitmentVendorCategory;

  @ApiPropertyOptional({ example: 'United Arab Emirates' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Dubai' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'Staffing' })
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
