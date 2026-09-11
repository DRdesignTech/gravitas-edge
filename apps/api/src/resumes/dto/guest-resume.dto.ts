import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateGuestResumeDto {
  @ApiProperty({ description: 'Full name of the visitor (no account required)' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName: string;

  @ApiProperty({ description: 'Contact email of the visitor' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiPropertyOptional({ description: 'Optional contact phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;
}
