import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecruitmentVendorCategory, RecruitmentVendorOpportunityStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class CreateRvaOpportunityDto {
  @ApiProperty({ example: 'RFP: Contingent staffing partner for GCC' })
  @IsString()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional({ example: 'Seeking staffing partners for a 12-month RPO engagement.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 'Senior Recruiter / Account Manager' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  role?: string;

  @ApiPropertyOptional({ example: 'Staffing' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sector?: string;

  @ApiPropertyOptional({
    enum: RecruitmentVendorCategory,
    default: RecruitmentVendorCategory.OTHER,
  })
  @IsOptional()
  @IsEnum(RecruitmentVendorCategory)
  category?: RecruitmentVendorCategory;

  @ApiPropertyOptional({ example: 'Acme Consulting' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @ApiPropertyOptional({ example: 'Acme Consulting Pvt Ltd' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  organization?: string;

  @ApiPropertyOptional({ example: 'INR 8,00,000 - 12,00,000' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  budget?: string;

  @ApiPropertyOptional({ example: 'INR 8 LPA' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  salary?: string;

  @ApiPropertyOptional({ example: 'Approx 25 partner positions' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  commercialValue?: string;

  @ApiPropertyOptional({ example: 'Dubai, UAE' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 'Middle East' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  geography?: string;

  @ApiPropertyOptional({ example: 'United Arab Emirates' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: '5+ years in staffing / RPO' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  experienceText?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minExperience?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxExperience?: number;

  @ApiPropertyOptional({ example: 'Registered staffing firm with GCC presence' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  eligibility?: string;

  @ApiPropertyOptional({ example: 'Valid trade license, 3 client references' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  qualification?: string;

  @ApiPropertyOptional({ example: 'Mandatory UAE labour law compliance' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  requirements?: string;

  @ApiPropertyOptional({ example: 'Submission deadline: 30 Nov 2026' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  otherDetails?: string;

  @ApiPropertyOptional({ example: 'Submit proposal to procurement@acme.com' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  howToApply?: string;

  @ApiPropertyOptional({ example: 'https://acme.com/rfp/123' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  applicationUrl?: string;

  @ApiPropertyOptional({ example: 'procurement@acme.com' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  applicationContact?: string;

  @ApiPropertyOptional({ example: 'client-portal' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional({ example: 'RFP-2026-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string;

  @ApiPropertyOptional({ example: 'RVA-2026-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobId?: string;

  @ApiPropertyOptional({ example: '2026-11-30T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  publishedDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiPropertyOptional({
    enum: RecruitmentVendorOpportunityStatus,
    default: RecruitmentVendorOpportunityStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(RecruitmentVendorOpportunityStatus)
  status?: RecruitmentVendorOpportunityStatus;
}
