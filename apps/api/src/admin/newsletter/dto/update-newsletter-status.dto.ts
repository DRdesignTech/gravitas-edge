import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { NewsletterStatus } from '@prisma/client';

export class UpdateNewsletterStatusDto {
  @ApiProperty({ enum: NewsletterStatus, example: NewsletterStatus.UNSUBSCRIBED })
  @IsEnum(NewsletterStatus)
  status!: NewsletterStatus;
}
