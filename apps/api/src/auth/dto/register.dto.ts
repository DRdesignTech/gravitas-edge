import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description: 'Password (min 8 chars, at least one letter, one number, one symbol)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,64}$/, {
    message:
      'password must be 8-64 characters and include at least one letter, one number, and one symbol',
  })
  password: string;

  @ApiPropertyOptional({ example: 'Aman Yadav', description: 'Full name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({ example: '+919999999999', description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'Mumbai, India', description: 'Location' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({
    example: 'REF-6Q3MX7K2TY',
    description: 'Referral code of the user who invited you (optional)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^REF-[A-Z2-9]{10}$/, { message: 'referralCode must be a valid referral code' })
  @MaxLength(32)
  referralCode?: string;
}
