import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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
}
