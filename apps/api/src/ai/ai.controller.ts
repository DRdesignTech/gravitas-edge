import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { AiService } from './ai.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

@ApiTags('ai')
@Public()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Executive AI Chatbot interaction endpoint powered by gpt-4o-mini',
    description:
      'Processes candidate questions against Gravitas Edge business intelligence, FAQs, navigation, and promotional rules, returning structured answers with action deep-links.',
  })
  @ApiResponse({
    status: 200,
    description: 'AI response generated successfully',
    type: ChatResponseDto,
  })
  async chat(@Body() dto: ChatRequestDto): Promise<ChatResponseDto> {
    return this.aiService.generateChatResponse(dto.message, dto.history);
  }
}
