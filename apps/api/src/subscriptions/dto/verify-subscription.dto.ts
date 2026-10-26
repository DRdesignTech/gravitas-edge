import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifySubscriptionDto {
  @ApiProperty({ description: 'Payment session id' })
  @IsNotEmpty()
  @IsString()
  paymentId: string;

  @ApiProperty({ description: 'Razorpay payment id' })
  @IsNotEmpty()
  @IsString()
  razorpay_payment_id: string;

  @ApiProperty({ description: 'Razorpay subscription id' })
  @IsNotEmpty()
  @IsString()
  razorpay_subscription_id: string;

  @ApiProperty({ description: 'Razorpay signature' })
  @IsNotEmpty()
  @IsString()
  razorpay_signature: string;
}
