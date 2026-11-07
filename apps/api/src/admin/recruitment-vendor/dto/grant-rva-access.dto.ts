import { IsEmail, IsUUID, MaxLength, MinLength } from 'class-validator';

export class GrantRvaAccessDto {
  @IsEmail()
  email: string;

  @IsUUID()
  planId: string;

  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
