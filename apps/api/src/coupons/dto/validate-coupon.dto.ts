import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty({
    example: 'SAVE20',
    description: 'Coupon code (case-insensitive; surrounding whitespace is ignored)',
  })
  @IsString()
  @MaxLength(64)
  couponCode: string;

  @ApiProperty({ example: '5f8e...', description: 'Plan the coupon is being applied to' })
  @IsUUID()
  planId: string;
}
