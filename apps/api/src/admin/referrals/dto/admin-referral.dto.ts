import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommissionStatus, ReferralStatus } from '@prisma/client';

export class AdminQueryReferralsDto {
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

  @ApiPropertyOptional({ enum: ReferralStatus })
  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus;

  @ApiPropertyOptional({
    description: 'Search by referrer/referred email, full name, or referral code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;

  @ApiPropertyOptional({ description: 'Only referrals created on or after this ISO date' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Only referrals created on or before this ISO date' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ example: 'REF-6Q3MX7K2TY' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;

  @ApiPropertyOptional({ description: 'Filter by referrer (or referred) user id' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;
}

export class AdminQueryCommissionsDto {
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

  @ApiPropertyOptional({ enum: CommissionStatus })
  @IsOptional()
  @IsEnum(CommissionStatus)
  status?: CommissionStatus;

  @ApiPropertyOptional({
    description: 'Search by referrer/referred email or full name, or referral code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;
}

export class SuspendReferralDto {
  @ApiProperty({ example: 'Fraudulent sign-up detected' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class ApproveCommissionDto {
  @ApiPropertyOptional({ example: 'Approved after manual review' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class RejectCommissionDto {
  @ApiProperty({ example: 'Subscription refunded before activation completed' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class PayCommissionDto {
  @ApiPropertyOptional({ example: 'UTR-1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  payoutReference?: string;
}

export class CancelCommissionDto {
  @ApiPropertyOptional({ example: 'Commission voided by admin' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AdminUpdateSlabDto {
  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minReferrals?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxReferrals?: number;

  @ApiPropertyOptional({ example: 15.5, description: 'Commission percentage (0-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionPercentage?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;
}
