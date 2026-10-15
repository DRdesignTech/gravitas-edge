import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRvaPlanDto {
  @ApiProperty({ example: 'Recruitment Vendor Access · 3 Months' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Full RVA vault access for 3 months.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 4999, description: 'Actual amount charged (discounted price)' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 5999, description: 'Original/list price (display only)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  regularPrice?: number;

  @ApiPropertyOptional({ example: 17, description: 'Displayed discount % (0..100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountPercentage?: number;

  @ApiPropertyOptional({ example: 'INR', default: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiProperty({ example: 90, description: 'Plan validity in days' })
  @IsInt()
  @Min(1)
  durationDays: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
