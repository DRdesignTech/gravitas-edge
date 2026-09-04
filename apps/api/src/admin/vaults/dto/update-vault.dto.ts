import { ApiPropertyOptional } from '@nestjs/swagger';
import { VaultStatus, VaultType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateVaultDto {
  @ApiPropertyOptional({ example: 'India Career' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'Careers across India' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: VaultType })
  @IsOptional()
  @IsEnum(VaultType)
  type?: VaultType;

  @ApiPropertyOptional({ enum: VaultStatus })
  @IsOptional()
  @IsEnum(VaultStatus)
  status?: VaultStatus;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
