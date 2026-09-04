import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VaultStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryVaultsDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 'career', description: 'Search by vault name or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: VaultStatus, description: 'Filter by vault status' })
  @IsOptional()
  @IsEnum(VaultStatus)
  status?: VaultStatus;
}
