import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ConfirmPurchaseDto {
  @ApiProperty({ example: '5f8e...', description: 'Payment id created by POST /purchase' })
  @IsUUID()
  paymentId: string;
}
