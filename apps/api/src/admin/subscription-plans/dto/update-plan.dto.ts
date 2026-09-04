import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'India Access Plan' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'Access to all India vaults' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 499, description: 'Price (>= 0)' })
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'INR', description: 'ISO 4217 currency code' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: 30, description: 'Subscription duration in days (> 0)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  durationDays?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
