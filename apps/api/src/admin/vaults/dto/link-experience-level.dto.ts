import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class LinkExperienceLevelDto {
  @ApiProperty({ example: 'f0a0...', description: 'Experience level id to link to the vault' })
  @IsString()
  @IsUUID()
  experienceLevelId: string;
}
