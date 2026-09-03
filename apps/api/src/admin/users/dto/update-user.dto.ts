import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: UserStatus, description: 'Set account status' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    example: ['USER'],
    description: 'Replace the user roles with the given role names',
  })
  @IsOptional()
  @IsArray()
  roles?: string[];
}
