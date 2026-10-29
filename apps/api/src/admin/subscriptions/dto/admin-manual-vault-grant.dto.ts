import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Length } from 'class-validator';

export class AdminManualVaultGrantDto {
  @ApiProperty({ description: 'Existing user UUID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Active plan whose duration defines the grant period' })
  @IsUUID()
  planId: string;

  @ApiProperty({ description: 'Single active vault linked to the selected plan' })
  @IsUUID()
  vaultId: string;

  @ApiProperty({ description: 'Admin reason for this manual access grant' })
  @IsString()
  @Length(8, 500)
  reason: string;

  @ApiProperty({ description: 'Client generated request id used to make retries idempotent' })
  @IsUUID()
  requestId: string;
}
