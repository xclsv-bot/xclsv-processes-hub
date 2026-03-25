import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AIService } from './ai.service';
import { ProcessGeneratorService } from './process-generator.service';
import { Public } from '@/common/decorators/public.decorator';

class GenerateDto {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

class ImproveDto {
  content: string;
}

class GenerateProcessDto {
  topic: string;
  area: string;
}

class GenerateSectionDto {
  content: string;
  sectionType: string;
}

@ApiTags('AI')
@Controller('ai')
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly processGenerator: ProcessGeneratorService,
  ) {}

  @Post('generate')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate content using AI' })
  async generate(@Body() dto: GenerateDto) {
    return this.aiService.generate(dto.prompt, {
      maxTokens: dto.maxTokens,
      temperature: dto.temperature,
      feature: 'custom-generate',
    });
  }

  @Post('improve')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Improve existing content' })
  async improve(@Body() dto: ImproveDto) {
    return this.aiService.improveContent(dto.content);
  }

  @Post('summarize')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Summarize content' })
  async summarize(@Body() dto: ImproveDto) {
    return this.aiService.summarize(dto.content);
  }

  @Post('generate-process')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a complete process document from a topic' })
  async generateProcess(@Body() dto: GenerateProcessDto) {
    return this.processGenerator.generateProcess(dto.topic, dto.area, 'anonymous');
  }

  @Post('suggest-improvements')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI suggestions for improving content' })
  async suggestImprovements(@Body() dto: ImproveDto) {
    const suggestions = await this.processGenerator.suggestImprovements(dto.content, 'anonymous');
    return { suggestions };
  }

  @Post('generate-section')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a specific section for existing content' })
  async generateSection(@Body() dto: GenerateSectionDto) {
    const section = await this.processGenerator.generateSection(
      dto.content,
      dto.sectionType,
      'anonymous',
    );
    return { section };
  }
}
