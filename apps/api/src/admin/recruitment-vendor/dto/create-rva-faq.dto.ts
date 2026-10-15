import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRvaFaqDto {
  @ApiProperty({ example: 'Who can subscribe to Recruitment Vendor Access?' })
  @IsString()
  @MaxLength(500)
  question: string;

  @ApiProperty({ example: 'Recruitment agencies, staffing firms and RPO providers.' })
  @IsString()
  @MaxLength(5000)
  answer: string;

  @ApiPropertyOptional({ example: 'About' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
