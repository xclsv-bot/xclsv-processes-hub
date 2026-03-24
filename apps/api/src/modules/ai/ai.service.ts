import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsageTrackingService } from './usage-tracking.service';

export interface AIGenerateOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  userId?: string;
  feature?: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly apiKey: string;
  private readonly model = 'claude-sonnet-4-20250514';

  constructor(
    private readonly configService: ConfigService,
    private readonly usageTracking: UsageTrackingService,
  ) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY') || '';
  }

  async generate(prompt: string, options?: AIGenerateOptions): Promise<AIResponse> {
    if (!this.apiKey) {
      this.logger.warn('Anthropic API key not configured');
      return {
        content: 'AI features are not configured. Please add ANTHROPIC_API_KEY.',
        model: 'mock',
        usage: { inputTokens: 0, outputTokens: 0 },
      };
    }

    const systemPrompt = options?.systemPrompt || 
      'You are a helpful assistant that helps create and improve business process documentation.';

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: options?.maxTokens || 2048,
          temperature: options?.temperature || 0.7,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      const result: AIResponse = {
        content: data.content[0].text,
        model: data.model,
        usage: {
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
        },
      };

      // Track usage
      if (options?.userId) {
        await this.usageTracking.trackUsage({
          userId: options.userId,
          model: data.model,
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
          feature: options.feature || 'generate',
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`AI generation failed: ${error.message}`);
      throw error;
    }
  }

  async improveContent(content: string, userId?: string): Promise<AIResponse> {
    const prompt = `Improve the following process documentation. Make it clearer, more structured, and easier to follow:

${content}

Provide the improved version:`;

    return this.generate(prompt, {
      systemPrompt: 'You are an expert technical writer who specializes in creating clear, concise business process documentation.',
      userId,
      feature: 'improve',
    });
  }

  async generateFromOutline(title: string, outline: string, userId?: string): Promise<AIResponse> {
    const prompt = `Create a detailed process document for "${title}" based on this outline:

${outline}

Generate a comprehensive process document with clear step-by-step instructions.`;

    return this.generate(prompt, {
      maxTokens: 4096,
      systemPrompt: 'You are an expert at creating detailed, actionable business process documentation.',
      userId,
      feature: 'generate-from-outline',
    });
  }

  async summarize(content: string, userId?: string): Promise<AIResponse> {
    const prompt = `Summarize the following process documentation in 2-3 sentences:

${content}`;

    return this.generate(prompt, {
      maxTokens: 256,
      temperature: 0.3,
      userId,
      feature: 'summarize',
    });
  }
}
