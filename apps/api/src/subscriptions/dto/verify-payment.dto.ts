import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Razorpay payment id' })
  @IsNotEmpty()
  @IsString()
  razorpay_payment_id: string;

  @ApiProperty({ description: 'Razorpay order id' })
  @IsNotEmpty()
  @IsString()
  razorpay_order_id: string;

  @ApiProperty({ description: 'Razorpay signature' })
  @IsNotEmpty()
  @IsString()
  razorpay_signature: string;

  @ApiProperty({ description: 'Payment session id' })
  @IsNotEmpty()
  @IsString()
  paymentId: string;
}
