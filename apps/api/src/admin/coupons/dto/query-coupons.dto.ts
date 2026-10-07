import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const COUPON_STATUS_FILTERS = [
  'ALL',
  'ACTIVE',
  'SCHEDULED',
  'EXPIRED',
  'DISABLED',
  'USAGE_LIMIT_REACHED',
  'ARCHIVED',
] as const;

export type CouponStatusFilter = (typeof COUPON_STATUS_FILTERS)[number];

export class QueryCouponsDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 'SAVE', description: 'Search by coupon code or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: COUPON_STATUS_FILTERS,
    example: 'ACTIVE',
    description:
      'ALL (default) = every non-archived coupon; ARCHIVED = only archived coupons. ' +
      'USAGE_LIMIT_REACHED and ACTIVE take the global usage limit into account.',
  })
  @IsOptional()
  @IsIn(COUPON_STATUS_FILTERS)
  status?: CouponStatusFilter;
}
