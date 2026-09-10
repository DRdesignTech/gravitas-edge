import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, OpportunityCategory, OpportunityStatus } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateOpportunityDto {
  @ApiPropertyOptional({ example: 'Senior Software Engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional({ example: 'Looking for a senior backend developer...' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @ApiPropertyOptional({ example: 'Bangalore, India' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ example: 'Technology' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  industry?: string;

  @ApiPropertyOptional({ example: 'Engineering' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  functionalArea?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minExperience?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxExperience?: number;

  @ApiPropertyOptional({ example: 'https://careers.acme.com/apply/123' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  applicationUrl?: string;

  @ApiPropertyOptional({ example: 'hr@acme.com' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  applicationContact?: string;

  @ApiPropertyOptional({ example: 'linkedin' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional({ example: '₹12,00,000 per annum' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  salary?: string;

  @ApiPropertyOptional({ example: '3+ years in React' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  experienceText?: string;

  @ApiPropertyOptional({ example: 'S. No. 42' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalRef?: string;

  @ApiPropertyOptional({ enum: OpportunityCategory })
  @IsOptional()
  @IsEnum(OpportunityCategory)
  category?: OpportunityCategory;

  @ApiPropertyOptional({ enum: OpportunityStatus })
  @IsOptional()
  @IsEnum(OpportunityStatus)
  status?: OpportunityStatus;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vaultIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  experienceLevelIds?: string[];
}
