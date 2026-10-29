import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @Length(8, 64)
  password: string;

  @ApiProperty({ enum: ['USER', 'ADMIN'], example: 'USER' })
  @IsOptional()
  @IsString()
  role?: 'USER' | 'ADMIN';

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], example: 'ACTIVE', default: 'ACTIVE' })
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

  @ApiProperty({ required: false, description: 'Optional plan for an admin-issued initial grant' })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiProperty({ required: false, description: 'One vault from the selected plan' })
  @IsOptional()
  @IsUUID()
  vaultId?: string;
}
