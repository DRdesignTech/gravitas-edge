import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum DateRange {
  TODAY = 'today',
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
  ONE_YEAR = '1y',
  THIS_MONTH = 'month',
  CUSTOM = 'custom',
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: DateRange, default: DateRange.THIRTY_DAYS })
  @IsOptional()
  @IsEnum(DateRange)
  range?: DateRange;

  @ApiPropertyOptional({ description: 'Custom start date (ISO 8601)', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Custom end date (ISO 8601)', example: '2026-09-04' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
