import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UnsubscribeNewsletterDto {
  @ApiPropertyOptional({ description: 'Opaque unsubscribe token from the newsletter email link' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(128)
  token?: string;

  @ApiPropertyOptional({ example: 'candidate@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined,
  )
  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @MaxLength(255)
  email?: string;
}
