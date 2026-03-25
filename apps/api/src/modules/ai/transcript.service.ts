import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AIService } from './ai.service';
import { prisma } from '@xclsv/database';

export interface GeneratedProcess {
  id: string;
  title: string;
  description: string;
  content: string;
  area: string;
  status: string;
  originalTranscript: string;
}

@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);

  constructor(private readonly aiService: AIService) {}

  /**
   * Process an uploaded file and extract transcript text
   */
  async processUploadedFile(file: Express.Multer.File, area: string): Promise<GeneratedProcess> {
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    let transcriptText: string;

    switch (extension) {
      case 'txt':
        transcriptText = file.buffer.toString('utf-8');
        break;
      case 'vtt':
        transcriptText = this.parseVTT(file.buffer.toString('utf-8'));
        break;
      case 'srt':
        transcriptText = this.parseSRT(file.buffer.toString('utf-8'));
        break;
      case 'docx':
      case 'doc':
        transcriptText = await this.parseDOCX(file.buffer);
        break;
      case 'pdf':
        transcriptText = await this.parsePDF(file.buffer);
        break;
      default:
        throw new BadRequestException(
          `Unsupported file format: ${extension}. Supported formats: TXT, VTT, SRT, DOC, DOCX, PDF`
        );
    }

    if (!transcriptText || transcriptText.trim().length < 50) {
      throw new BadRequestException('Transcript is too short or empty');
    }

    return this.generateProcessFromTranscript(transcriptText, area, file.originalname);
  }

  /**
   * Generate a process document from transcript text
   */
  async generateProcessFromTranscript(
    transcript: string,
    area: string,
    filename?: string,
  ): Promise<GeneratedProcess> {
    this.logger.log(`Generating process from transcript (${transcript.length} chars)`);

    const prompt = `You are analyzing a meeting transcript or document to create a business process document.

**Transcript:**
${transcript.substring(0, 15000)}${transcript.length > 15000 ? '\n\n[... transcript truncated ...]' : ''}

**Instructions:**
Analyze this transcript and extract a clear business process document. Look for:
1. The main topic or workflow being discussed
2. Step-by-step procedures
3. People responsible for different parts
4. Tools or systems mentioned
5. Important notes, exceptions, or edge cases

Create a structured process document in Markdown format with:
- A clear, descriptive title for the process
- A brief description (2-3 sentences)
- Owner/responsible parties mentioned
- Prerequisites if any
- Step-by-step procedure with clear numbered steps
- Tools or systems used
- Important notes or considerations

**Respond in this exact JSON format:**
{
  "title": "Process Title Here",
  "description": "Brief 2-3 sentence description of what this process accomplishes",
  "content": "## Process Name\\n\\n### Owner\\n[Name if mentioned]\\n\\n### Procedure\\n1. First step...\\n2. Second step...\\n\\n### Tools\\n- Tool 1\\n- Tool 2\\n\\n### Notes\\n- Important note...",
  "mentionedPeople": ["Person 1", "Person 2"],
  "mentionedTools": ["Tool 1", "Tool 2"]
}`;

    const response = await this.aiService.generate(prompt, {
      maxTokens: 4096,
      temperature: 0.3,
      feature: 'transcript-to-process',
      systemPrompt: 'You are an expert at analyzing meeting transcripts and extracting clear, actionable business processes. Always respond with valid JSON.',
    });

    // Parse the AI response
    let parsed: any;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (error) {
      this.logger.error(`Failed to parse AI response: ${error.message}`);
      // Fallback: use the raw response as content
      parsed = {
        title: filename ? `Process from ${filename}` : 'Untitled Process',
        description: 'Process generated from transcript',
        content: response.content,
      };
    }

    // Generate slug
    const slug = this.generateSlug(parsed.title);
    
    // Check for duplicate slug
    const existing = await prisma.process.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    // Create the process as a draft
    const process = await prisma.process.create({
      data: {
        title: parsed.title,
        slug: finalSlug,
        description: parsed.description,
        content: parsed.content,
        area: area as any,
        status: 'DRAFT',
        ownerId: 'cc2ed391-2f1c-4ffb-83f5-bb4218c61ad3', // Default to Z for MVP
        metadata: {
          source: 'transcript',
          originalFilename: filename,
          mentionedPeople: parsed.mentionedPeople || [],
          mentionedTools: parsed.mentionedTools || [],
          transcriptLength: transcript.length,
        },
      },
    });

    this.logger.log(`Created process ${process.id} from transcript`);

    return {
      id: process.id,
      title: process.title,
      description: process.description || '',
      content: process.content || '',
      area: process.area,
      status: process.status,
      originalTranscript: transcript.substring(0, 500) + (transcript.length > 500 ? '...' : ''),
    };
  }

  /**
   * Parse VTT (WebVTT) subtitle format
   */
  private parseVTT(content: string): string {
    const lines = content.split('\n');
    const textLines: string[] = [];
    let skipNext = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip WEBVTT header
      if (trimmed.startsWith('WEBVTT')) continue;
      
      // Skip NOTE lines
      if (trimmed.startsWith('NOTE')) {
        skipNext = true;
        continue;
      }
      
      // Skip timestamp lines (00:00:00.000 --> 00:00:00.000)
      if (trimmed.match(/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->/)) continue;
      
      // Skip cue identifiers (usually numbers)
      if (trimmed.match(/^\d+$/)) continue;
      
      // Skip empty lines
      if (!trimmed) {
        skipNext = false;
        continue;
      }
      
      if (skipNext) continue;
      
      // This is actual text content
      textLines.push(trimmed);
    }

    return textLines.join(' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Parse SRT subtitle format
   */
  private parseSRT(content: string): string {
    const lines = content.split('\n');
    const textLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip sequence numbers
      if (trimmed.match(/^\d+$/)) continue;
      
      // Skip timestamp lines
      if (trimmed.match(/^\d{2}:\d{2}:\d{2},\d{3}\s*-->/)) continue;
      
      // Skip empty lines
      if (!trimmed) continue;
      
      textLines.push(trimmed);
    }

    return textLines.join(' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Parse DOCX files (simplified - extracts text from XML)
   */
  private async parseDOCX(buffer: Buffer): Promise<string> {
    try {
      // DOCX is a ZIP file containing XML
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(buffer);
      
      // Get the main document content
      const documentXml = await zip.file('word/document.xml')?.async('string');
      
      if (!documentXml) {
        throw new Error('Could not find document.xml in DOCX file');
      }

      // Extract text from XML (simple approach - strip tags)
      const text = documentXml
        .replace(/<w:p[^>]*>/g, '\n') // Paragraph breaks
        .replace(/<[^>]+>/g, '') // Remove all tags
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

      return text;
    } catch (error) {
      this.logger.error(`Failed to parse DOCX: ${error.message}`);
      throw new BadRequestException('Failed to parse DOCX file. Please try converting to TXT format.');
    }
  }

  /**
   * Parse PDF files
   */
  private async parsePDF(buffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      
      if (!data.text || data.text.trim().length < 10) {
        throw new Error('PDF appears to be empty or contains only images');
      }

      return data.text.trim();
    } catch (error) {
      this.logger.error(`Failed to parse PDF: ${error.message}`);
      throw new BadRequestException(
        'Failed to parse PDF file. Make sure the PDF contains text (not just scanned images).'
      );
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }
}
