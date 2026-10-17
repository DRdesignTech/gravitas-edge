import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, OpportunityCategory, OpportunityStatus } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

export class BulkDeleteOpportunitiesDto {
  @ApiPropertyOptional({
    description: 'Explicit opportunity IDs to target. When provided, filter fields are ignored.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  ids?: string[];

  @ApiProperty({
    enum: ['archive', 'permanent'],
    description: 'archive = soft delete, permanent = hard delete',
  })
  @IsIn(['archive', 'permanent'])
  mode!: 'archive' | 'permanent';

  @ApiProperty({
    description:
      'Required acknowledgement when neither ids nor any filter is provided (i.e. delete everything).',
  })
  @IsOptional()
  @IsIn([true])
  confirmAll?: true;

  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: OpportunityStatus })
  @IsOptional()
  @IsEnum(OpportunityStatus)
  status?: OpportunityStatus;
  @ApiPropertyOptional({ enum: OpportunityCategory })
  @IsOptional()
  @IsEnum(OpportunityCategory)
  category?: OpportunityCategory;
  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() industry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vaultId?: string;
  @ApiPropertyOptional({ description: 'ISO 8601' })
  @IsOptional()
  @IsString()
  publishedAfter?: string;
  @ApiPropertyOptional({ description: 'ISO 8601' })
  @IsOptional()
  @IsString()
  publishedBefore?: string;
  @ApiPropertyOptional({ description: 'ISO 8601' }) @IsOptional() @IsString() expiryAfter?: string;
  @ApiPropertyOptional({ description: 'ISO 8601' }) @IsOptional() @IsString() expiryBefore?: string;
  @ApiPropertyOptional({ description: 'ISO 8601' }) @IsOptional() @IsString() createdAfter?: string;
  @ApiPropertyOptional({ description: 'ISO 8601' })
  @IsOptional()
  @IsString()
  createdBefore?: string;
}
