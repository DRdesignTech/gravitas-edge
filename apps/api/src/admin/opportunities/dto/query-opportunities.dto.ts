import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, OpportunityCategory, OpportunityStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryOpportunitiesDto {
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

  @ApiPropertyOptional({ example: 'software engineer' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: OpportunityStatus })
  @IsOptional()
  @IsEnum(OpportunityStatus)
  status?: OpportunityStatus;

  @ApiPropertyOptional({ enum: OpportunityCategory })
  @IsOptional()
  @IsEnum(OpportunityCategory)
  category?: OpportunityCategory;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Bangalore' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'Technology' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ description: 'Filter by experience level ID' })
  @IsOptional()
  @IsString()
  experienceLevelId?: string;

  @ApiPropertyOptional({ description: 'Filter by vault ID' })
  @IsOptional()
  @IsString()
  vaultId?: string;

  @ApiPropertyOptional({ description: 'Filter by published after this date (ISO 8601)' })
  @IsOptional()
  @IsString()
  publishedAfter?: string;

  @ApiPropertyOptional({ description: 'Filter by published before this date (ISO 8601)' })
  @IsOptional()
  @IsString()
  publishedBefore?: string;

  @ApiPropertyOptional({ description: 'Filter by expiry after this date (ISO 8601)' })
  @IsOptional()
  @IsString()
  expiryAfter?: string;

  @ApiPropertyOptional({ description: 'Filter by expiry before this date (ISO 8601)' })
  @IsOptional()
  @IsString()
  expiryBefore?: string;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
