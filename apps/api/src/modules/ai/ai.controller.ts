import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AIService } from './ai.service';
import { ProcessGeneratorService } from './process-generator.service';
import { RequirePermissions } from '@/modules/authorization';
import { Permission } from '@/modules/authorization/permissions';
import { CurrentUser } from '@/common/decorators';

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
  @RequirePermissions(Permission.PROCESS_CREATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate content using AI' })
  async generate(
    @Body() dto: GenerateDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.generate(dto.prompt, {
      maxTokens: dto.maxTokens,
      temperature: dto.temperature,
      userId,
      feature: 'custom-generate',
    });
  }

  @Post('improve')
  @RequirePermissions(Permission.PROCESS_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Improve existing content' })
  async improve(
    @Body() dto: ImproveDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.improveContent(dto.content, userId);
  }

  @Post('summarize')
  @RequirePermissions(Permission.PROCESS_READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Summarize content' })
  async summarize(
    @Body() dto: ImproveDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.summarize(dto.content, userId);
  }

  @Post('generate-process')
  @RequirePermissions(Permission.PROCESS_CREATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a complete process document from a topic' })
  async generateProcess(
    @Body() dto: GenerateProcessDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.processGenerator.generateProcess(dto.topic, dto.area, userId);
  }

  @Post('suggest-improvements')
  @RequirePermissions(Permission.PROCESS_READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI suggestions for improving content' })
  async suggestImprovements(
    @Body() dto: ImproveDto,
    @CurrentUser('id') userId: string,
  ) {
    const suggestions = await this.processGenerator.suggestImprovements(dto.content, userId);
    return { suggestions };
  }

  @Post('generate-section')
  @RequirePermissions(Permission.PROCESS_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a specific section for existing content' })
  async generateSection(
    @Body() dto: GenerateSectionDto,
    @CurrentUser('id') userId: string,
  ) {
    const section = await this.processGenerator.generateSection(
      dto.content,
      dto.sectionType,
      userId,
    );
    return { section };
  }
}
