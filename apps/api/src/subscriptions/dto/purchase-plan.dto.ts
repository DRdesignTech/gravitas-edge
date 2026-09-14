import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class PurchasePlanDto {
  @ApiProperty({ example: '5f8e...', description: 'Plan id to purchase' })
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({ example: '5f8e...', description: 'Target vault (must belong to plan)' })
  @IsOptional()
  @IsUUID()
  vaultId?: string;
}
