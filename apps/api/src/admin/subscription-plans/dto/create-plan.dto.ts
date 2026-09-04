import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'India Access Plan' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ example: 'Access to all India vaults' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 499, description: 'Price (>= 0)' })
  @Min(0)
  price: number;

  @ApiProperty({ example: 'INR', description: 'ISO 4217 currency code' })
  @IsString()
  @MaxLength(3)
  currency: string;

  @ApiProperty({ example: 30, description: 'Subscription duration in days (> 0)' })
  @IsInt()
  @IsPositive()
  durationDays: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
