import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTestimonialDto {
  @ApiProperty({ example: 'Simran Khurana' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'Lead Product Manager @ FinTech Growth Scale-Up' })
  @IsString()
  @MaxLength(160)
  role: string;

  @ApiPropertyOptional({ example: '45% Pay Jump' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  badge?: string;

  @ApiProperty({ example: 'I found a Lead PM role 3 weeks before it was posted...' })
  @IsString()
  @MaxLength(1000)
  quote: string;

  @ApiPropertyOptional({ example: 'https://www.linkedin.com/in/simrankhurana' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({ require_tld: true, require_protocol: true })
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTestimonialDto {
  @ApiPropertyOptional({ example: 'Simran Khurana' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'Lead Product Manager @ FinTech Growth Scale-Up' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  role?: string;

  @ApiPropertyOptional({ example: 'I found a Lead PM role 3 weeks before it was posted...' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  quote?: string;

  @ApiPropertyOptional({ example: '45% Pay Jump' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  badge?: string | null;

  @ApiPropertyOptional({ example: 'https://www.linkedin.com/in/simrankhurana' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({ require_tld: true, require_protocol: true })
  linkedinUrl?: string | null;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
