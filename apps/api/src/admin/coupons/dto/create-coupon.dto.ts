import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { CouponDiscountType } from '@prisma/client';

/** Codes are stored trimmed + upper-cased so lookups are case-insensitive. */
export function normalizeCouponCodeTransform({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export type CouponAvailability = 'ALL' | 'SPECIFIC';

export class CreateCouponDto {
  @ApiProperty({
    example: 'SAVE20',
    description: 'Unique coupon code: 3-40 letters/numbers/dashes/underscores',
  })
  @Transform(normalizeCouponCodeTransform)
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,40}$/, {
    message:
      'Coupon code must be 3-40 characters using only letters, numbers, dashes or underscores',
  })
  code: string;

  @ApiPropertyOptional({ example: 'Festive offer on all plans', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;

  @ApiProperty({ enum: CouponDiscountType, example: CouponDiscountType.PERCENTAGE })
  @IsEnum(CouponDiscountType)
  discountType: CouponDiscountType;

  @ApiProperty({
    example: 20,
    description: 'Percentage discount (0-100) or fixed amount (> 0), in the plan currency',
  })
  @Min(0.01)
  discountValue: number;

  @ApiProperty({ example: '2026-10-01T00:00:00.000Z', description: 'ISO date the coupon starts' })
  @IsDateString()
  validFrom: string;

  @ApiProperty({ example: '2026-12-31T23:59:59.999Z', description: 'ISO date the coupon ends' })
  @IsDateString()
  validUntil: string;

  @ApiPropertyOptional({
    example: 100,
    nullable: true,
    description: 'Total redemptions allowed; omit or send null for unlimited',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Redemptions allowed per user' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000)
  perUserUsageLimit?: number;

  @ApiProperty({
    enum: ['ALL', 'SPECIFIC'],
    example: 'ALL',
    description: 'ALL = every user; SPECIFIC = only the users listed in userIds',
  })
  @IsIn(['ALL', 'SPECIFIC'])
  availability: CouponAvailability;

  @ApiPropertyOptional({
    type: [String],
    description: 'User ids the coupon is restricted to (required when availability is SPECIFIC)',
  })
  @ValidateIf((dto: CreateCouponDto) => dto.availability === 'SPECIFIC')
  @IsArray({ message: 'Select at least one user for a specific-users coupon' })
  @ArrayNotEmpty({ message: 'Select at least one user for a specific-users coupon' })
  @IsUUID('4', { each: true, message: 'Each selected user must be a valid user id' })
  userIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Plan ids the coupon applies to; omit or send an empty list for every plan',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each selected plan must be a valid plan id' })
  planIds?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
