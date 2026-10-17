import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class RvaValidateCouponDto {
  @ApiProperty({
    example: 'SAVE20',
    description: 'RVA coupon code (case-insensitive; surrounding whitespace is ignored)',
  })
  @IsString()
  @MaxLength(64)
  couponCode: string;

  @ApiProperty({
    example: '5f8e...',
    description: 'Recruitment Vendor Access plan the coupon is being applied to',
  })
  @IsUUID()
  planId: string;
}
