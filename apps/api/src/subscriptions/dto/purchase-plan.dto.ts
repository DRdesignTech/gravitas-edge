import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class PurchasePlanDto {
  @ApiProperty({ example: '5f8e...', description: 'Plan id to purchase' })
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({ example: '5f8e...', description: 'Target vault (must belong to plan)' })
  @IsOptional()
  @IsUUID()
  vaultId?: string;

  @ApiPropertyOptional({
    example: 'SAVE20',
    description:
      'Optional coupon code. The discount and the final payable amount are always recomputed ' +
      'on the server from the plan price - the client never sets the amount.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;
}
