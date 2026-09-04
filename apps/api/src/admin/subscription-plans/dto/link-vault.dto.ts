import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class LinkVaultDto {
  @ApiProperty({ example: '5f8...', description: 'Vault id to grant the plan access to' })
  @IsString()
  @IsUUID()
  vaultId: string;
}
