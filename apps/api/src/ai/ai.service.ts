import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GRAVITAS_AI_SYSTEM_PROMPT } from './ai-system-prompt';
import { ChatActionItem, ChatMessageDto, ChatResponseDto } from './dto/chat.dto';

interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENAI_API_KEY') ?? '';
    this.model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
  }

  async generateChatResponse(
    userMessage: string,
    history: ChatMessageDto[] = [],
  ): Promise<ChatResponseDto> {
    if (!this.apiKey) {
      this.logger.warn('OPENAI_API_KEY is not configured; returning fallback guidance');
      return this.getOfflineFallback();
    }

    const messages: OpenAiMessage[] = [{ role: 'system', content: GRAVITAS_AI_SYSTEM_PROMPT }];

    // Append up to 10 historical conversation turns
    for (const item of history.slice(-10)) {
      messages.push({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: item.content,
      });
    }

    messages.push({ role: 'user', content: userMessage });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.3,
          max_tokens: 800,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        this.logger.error(`OpenAI API request failed: ${response.status} - ${errorText}`);
        return this.getOfflineFallback();
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        this.logger.warn('Empty response from OpenAI');
        return this.getOfflineFallback();
      }

      const parsed = JSON.parse(content);
      const reply = parsed.reply || 'Thank you for reaching out to Gravitas Edge Consulting.';
      const actions: ChatActionItem[] = Array.isArray(parsed.actions)
        ? parsed.actions.filter((a: any) => a?.label && a?.href)
        : [];
      const suggestions: string[] = Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((s: any) => typeof s === 'string')
        : [];

      return {
        reply,
        actions: actions.length > 0 ? actions : this.getDefaultActions(),
        suggestions: suggestions.length > 0 ? suggestions : this.getDefaultSuggestions(),
      };
    } catch (error: any) {
      this.logger.error(`Error during OpenAI chat completion: ${error?.message || error}`);
      return this.getOfflineFallback();
    }
  }

  private getOfflineFallback(): ChatResponseDto {
    return {
      reply:
        '**Gravitas Edge Consulting** provides senior professionals and executives with verified, **pre-market opportunities** across India, UAE/GCC, and global markets.\n\n- **Opportunity Vaults**: Unredacted decision-maker contacts across 5 seniority bands.\n- **Direct Outreach**: Apply directly to verified hiring managers.\n- *Note:* We are an opportunity-intelligence platform, not an employment agency.',
      actions: this.getDefaultActions(),
      suggestions: this.getDefaultSuggestions(),
    };
  }

  private getDefaultActions(): ChatActionItem[] {
    return [
      { label: 'View Vault Plans', href: '/plans' },
      { label: 'Explore Opportunities', href: '/opportunities' },
      { label: 'Upload Resume', href: '/upload-resume' },
      { label: 'Contact Support', href: '/contact' },
    ];
  }

  private getDefaultSuggestions(): string[] {
    return [
      'What are Opportunity Vaults?',
      'How much does a subscription cost?',
      'How do I upload my resume?',
      'What is the 20% Bundle discount?',
    ];
  }
}
