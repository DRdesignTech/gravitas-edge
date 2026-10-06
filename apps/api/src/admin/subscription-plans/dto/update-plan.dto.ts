import { ApiPropertyOptional } from '@nestjs/swagger';
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

  @ApiPropertyOptional({
    example: 1499,
    description: 'Discounted price (>= 0). Actual amount charged.',
  })
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    example: 1999,
    description: 'Original/list price (>= 0). Never used for payment.',
  })
  @IsOptional()
  @Min(0)
  regularPrice?: number;

  @ApiPropertyOptional({
    example: 25,
    description:
      'Discount percentage. Accepted for backwards compatibility only - it is always recomputed ' +
      'from regularPrice and price, and the submitted value is ignored.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

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

  @ApiPropertyOptional({ example: '5f8e...', description: 'Vault this plan grants access to' })
  @IsOptional()
  @IsUUID()
  vaultId?: string;
}
