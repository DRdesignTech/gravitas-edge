import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RvaPurchasePlanDto {
  @ApiProperty({ description: 'Recruitment Vendor Access plan id to purchase' })
  @IsUUID()
  planId: string;
}
