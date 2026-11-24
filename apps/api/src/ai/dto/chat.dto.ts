import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'], example: 'user' })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty({ example: 'How do I access Opportunity Vaults?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}

export class ChatRequestDto {
  @ApiProperty({
    example: 'What is Gravitas Edge and how does it work?',
    description: 'The user question or message',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({
    type: [ChatMessageDto],
    description: 'Recent conversation history (up to last 10 messages)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];
}

export interface ChatActionItem {
  label: string;
  href: string;
}

export class ChatResponseDto {
  @ApiProperty({
    example: 'Gravitas Edge is an executive career intelligence platform...',
  })
  reply: string;

  @ApiPropertyOptional({
    example: [{ label: 'View Plans', href: '/plans' }],
  })
  actions?: ChatActionItem[];

  @ApiPropertyOptional({
    example: ['How do Opportunity Vaults work?', 'What is the Build Your Bundle discount?'],
  })
  suggestions?: string[];
}
