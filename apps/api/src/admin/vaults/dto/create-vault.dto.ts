import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VaultStatus, VaultType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateVaultDto {
  @ApiProperty({ example: 'India Career' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ example: 'Careers across India' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: VaultType, default: VaultType.OTHER })
  @IsOptional()
  @IsEnum(VaultType)
  type?: VaultType;

  @ApiPropertyOptional({ enum: VaultStatus, default: VaultStatus.ACTIVE })
  @IsOptional()
  @IsEnum(VaultStatus)
  status?: VaultStatus;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
