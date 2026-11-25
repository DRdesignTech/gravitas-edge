import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class EducationItemDto {
  @ApiPropertyOptional({ example: 'Master of Business Administration (MBA)' })
  @IsString()
  @MaxLength(200)
  qualification!: string;

  @ApiPropertyOptional({ example: 'Premier Business School' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  institution?: string;

  @ApiPropertyOptional({ example: 'Strategic Management & Finance' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  field?: string;

  @ApiPropertyOptional({ example: 2016 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  startYear?: number;

  @ApiPropertyOptional({ example: 2018 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  endYear?: number;
}

export class WorkExperienceItemDto {
  @ApiPropertyOptional({ example: 'Gravitas Enterprises' })
  @IsString()
  @MaxLength(200)
  company!: string;

  @ApiPropertyOptional({ example: 'Vice President - Technology' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  jobTitle?: string;

  @ApiPropertyOptional({ example: '2021-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  endDate?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

export class CertificationItemDto {
  @ApiPropertyOptional({ example: 'AWS Certified Solutions Architect' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Amazon Web Services' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuer?: string;

  @ApiPropertyOptional({ example: 2023 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  issueYear?: number;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Aman Yadav' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({ example: '+919999999999' })
  @Transform(({ value }) => (typeof value === 'string' && value.trim() ? value.trim() : undefined))
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\-().]{7,20}$/, { message: 'Please enter a valid phone number.' })
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'Mumbai, India' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ example: 6, description: 'Years of experience' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(80)
  yearsExperience?: number;

  @ApiPropertyOptional({ example: 3, description: 'Months of experience (0-11)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(11)
  monthsExperience?: number;

  @ApiPropertyOptional({ example: 'Senior Engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  currentJobTitle?: string;

  @ApiPropertyOptional({ example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  currentCompany?: string;

  @ApiPropertyOptional({ example: ['Executive Leadership', 'P&L Management'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ type: [EducationItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationItemDto)
  education?: EducationItemDto[];

  @ApiPropertyOptional({ type: [WorkExperienceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceItemDto)
  workExperience?: WorkExperienceItemDto[];

  @ApiPropertyOptional({ type: [CertificationItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationItemDto)
  certifications?: CertificationItemDto[];

  @ApiPropertyOptional({
    example: {
      noticePeriod: '30 Days',
      workPreference: 'Hybrid (Preferred)',
      preferredRole: 'Director / VP / CXO',
      preferredLocation: 'India & GCC / UAE',
    },
  })
  @IsOptional()
  @IsObject()
  careerPreferences?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Mark linked CandidateProfile as CONFIRMED' })
  @IsOptional()
  @IsBoolean()
  confirmExtractedProfile?: boolean;
}
