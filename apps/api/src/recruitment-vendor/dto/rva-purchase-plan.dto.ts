import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, IsBoolean } from 'class-validator';

export class RvaPurchasePlanDto {
  @ApiProperty({ description: 'Recruitment Vendor Access plan id to purchase' })
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({
    example: 'SAVE20',
    description:
      'Optional RVA coupon code (case-insensitive; surrounding whitespace is ignored). The discount is always recomputed server-side.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;

  @ApiPropertyOptional({
    example: false,
    description:
      'If true, create a recurring subscription (AutoPay). If false (default), create a one-time payment.',
  })
  @IsOptional()
  @IsBoolean()
  recurring?: boolean;
}
