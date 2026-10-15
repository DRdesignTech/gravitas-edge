import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RvaEnrollDto {
  @ApiPropertyOptional({ description: 'Vendor/company name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({ description: 'Primary contact name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactName?: string;

  @ApiPropertyOptional({ description: 'Vendor type (e.g. staffing agency, RPO)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendorType?: string;

  @ApiPropertyOptional({ description: 'Acquisition source (e.g. landing-page)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;
}
