import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { NewsletterStatus } from '@prisma/client';

export class QueryNewsletterSubscribersDto {
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

  @ApiPropertyOptional({ example: 'candidate@', description: 'Filter subscribers by email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: NewsletterStatus, description: 'Filter by subscription status' })
  @IsOptional()
  @IsEnum(NewsletterStatus)
  status?: NewsletterStatus;
}
