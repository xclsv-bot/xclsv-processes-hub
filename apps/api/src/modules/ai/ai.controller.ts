import { Controller, Post, Body, HttpCode, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { AIService } from './ai.service';
import { ProcessGeneratorService } from './process-generator.service';
import { TranscriptService } from './transcript.service';
import { Public } from '@/common/decorators/public.decorator';

class GenerateDto {
  @IsString()
  prompt: string;
  
  @IsOptional()
  @IsNumber()
  maxTokens?: number;
  
  @IsOptional()
  @IsNumber()
  temperature?: number;
}

class ImproveDto {
  @IsString()
  content: string;
}

class GenerateProcessDto {
  @IsString()
  topic: string;
  
  @IsString()
  area: string;
}

class GenerateSectionDto {
  @IsString()
  content: string;
  
  @IsString()
  sectionType: string;
}

class GenerateSopDto {
  @IsString()
  processId: string;
}

class TranscriptProcessDto {
  @IsString()
  transcript: string;
  
  @IsString()
  area: string;
  
  @IsOptional()
  @IsString()
  filename?: string;
}

@ApiTags('AI')
@Controller('ai')
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly processGenerator: ProcessGeneratorService,
    private readonly transcriptService: TranscriptService,
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

  @Post('generate-sop')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate SOP format from process content and save it' })
  async generateSop(@Body() dto: GenerateSopDto) {
    return this.processGenerator.generateAndSaveSop(dto.processId);
  }

  @Post('process-from-transcript')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a process document from transcript text' })
  async processFromTranscript(@Body() dto: TranscriptProcessDto) {
    return this.transcriptService.generateProcessFromTranscript(
      dto.transcript,
      dto.area,
      dto.filename,
    );
  }

  @Post('upload-transcript')
  @Public()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        area: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a transcript file and generate a process' })
  async uploadTranscript(
    @UploadedFile() file: Express.Multer.File,
    @Body('area') area: string,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return this.transcriptService.processUploadedFile(file, area || 'GENERAL');
  }
}
