import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Length } from 'class-validator';

export class GrantVaultAccessDto {
  @ApiProperty({ description: 'Existing pending checkout subscription UUID' })
  @IsUUID()
  subscriptionId: string;

  @ApiProperty({ description: 'Single vault to grant access to' })
  @IsUUID()
  vaultId: string;

  @ApiProperty({ example: 'pay_1234567890' })
  @IsString()
  @Length(8, 64)
  razorpayPaymentId: string;
}
