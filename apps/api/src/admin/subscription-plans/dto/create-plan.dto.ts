import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
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

  @ApiProperty({
    example: 1499,
    description: 'Discounted price (>= 0). This is the actual amount charged.',
  })
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    example: 1999,
    description:
      'Original/list price (>= 0). Defaults to price when omitted. Never used for payment.',
  })
  @IsOptional()
  @Min(0)
  regularPrice?: number;

  @ApiPropertyOptional({
    example: 25,
    description: 'Displayed discount percentage (integer 0..100). Stored, never recomputed.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

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

  @ApiPropertyOptional({ example: '5f8e...', description: 'Vault this plan grants access to' })
  @IsOptional()
  @IsUUID()
  vaultId?: string;
}
