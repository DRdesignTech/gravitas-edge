import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Valid refresh token issued at login' })
  @IsJWT({ message: 'refreshToken must be a valid JWT' })
  @IsNotEmpty()
  refreshToken: string;
}
