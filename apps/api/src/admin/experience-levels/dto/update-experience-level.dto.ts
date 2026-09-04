import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateExperienceLevelDto {
  @ApiPropertyOptional({ example: 'Professional Access' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'professional' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @ApiPropertyOptional({ example: 'PROFESSIONAL' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  code?: string;

  @ApiPropertyOptional({ example: 5, description: 'Minimum years (>= 0)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minYears?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Maximum years (must be > minYears when provided)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxYears?: number;

  @ApiPropertyOptional({ example: '5 to 10 years experience' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
