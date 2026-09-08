import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReferralListStatus {
  PENDING = 'PENDING',
  SUCCESSFUL = 'SUCCESSFUL',
  INVALID = 'INVALID',
  SUSPENDED = 'SUSPENDED',
}

export enum CommissionListStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export class PaginatedQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ListReferralsQueryDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ enum: ReferralListStatus })
  @IsOptional()
  @IsEnum(ReferralListStatus)
  status?: ReferralListStatus;
}

export class ListCommissionsQueryDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ enum: CommissionListStatus })
  @IsOptional()
  @IsEnum(CommissionListStatus)
  status?: CommissionListStatus;
}
