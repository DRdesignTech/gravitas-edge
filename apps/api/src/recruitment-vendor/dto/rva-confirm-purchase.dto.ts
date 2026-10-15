import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RvaConfirmPurchaseDto {
  @ApiProperty({ description: 'Payment session id created by POST /purchase' })
  @IsUUID()
  paymentId: string;
}
