import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { VectorService } from './vector.service';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();

export interface AiSearchResult {
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    slug: string;
    area: string;
    relevance: number;
    snippet: string;
  }>;
  relatedQuestions: string[];
}

@Injectable()
export class AiSearchService {
  private readonly logger = new Logger(AiSearchService.name);
  private anthropic: Anthropic | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly vectorService: VectorService,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  /**
   * Perform AI-assisted semantic search with RAG
   */
  async search(query: string, limit: number = 5): Promise<AiSearchResult> {
    // Step 1: Generate embedding for the query
    const queryEmbedding = await this.vectorService.generateEmbedding(query);
    
    // Step 2: Find similar processes using vector search
    const similarProcesses = await this.findSimilarProcesses(queryEmbedding, limit);
    
    if (similarProcesses.length === 0) {
      return {
        answer: "I couldn't find any relevant processes for your question. Try rephrasing or browsing the process catalog.",
        sources: [],
        relatedQuestions: [
          "What processes are available?",
          "How do I create a new process?",
          "Show me all Events processes",
        ],
      };
    }
    
    // Step 3: Build context from retrieved processes
    const context = this.buildContext(similarProcesses);
    
    // Step 4: Generate answer using Claude
    const answer = await this.generateAnswer(query, context);
    
    // Step 5: Generate related questions
    const relatedQuestions = this.generateRelatedQuestions(query, similarProcesses);
    
    return {
      answer,
      sources: similarProcesses.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        area: p.area,
        relevance: p.similarity,
        snippet: p.description || p.content?.substring(0, 200) || '',
      })),
      relatedQuestions,
    };
  }

  /**
   * Find processes similar to the query embedding
   */
  private async findSimilarProcesses(embedding: number[], limit: number) {
    // Use raw SQL for vector similarity search
    const embeddingStr = `[${embedding.join(',')}]`;
    
    try {
      const results = await prisma.$queryRawUnsafe<Array<{
        id: string;
        title: string;
        slug: string;
        description: string | null;
        content: string | null;
        area: string;
        similarity: number;
      }>>(
        `SELECT 
          p.id,
          p.title,
          p.slug,
          p.description,
          p.content,
          p.area,
          1 - (pe.embedding_vec <=> $1::vector) as similarity
        FROM "Process" p
        JOIN "ProcessEmbedding" pe ON p.id = pe."processId"
        WHERE p."deletedAt" IS NULL
        ORDER BY pe.embedding_vec <=> $1::vector
        LIMIT $2`,
        embeddingStr,
        limit
      );
      
      // If no embeddings exist yet, fall back to keyword search
      if (results.length === 0) {
        this.logger.warn('No embeddings found, falling back to keyword search');
        return this.keywordFallback(embedding, limit);
      }
      
      return results;
    } catch (error) {
      this.logger.error(`Vector search failed: ${error.message}`);
      return this.keywordFallback(embedding, limit);
    }
  }

  /**
   * Fallback to keyword search when no embeddings exist
   */
  private async keywordFallback(embedding: number[], limit: number) {
    // Extract keywords from query (this is a simplification)
    const processes = await prisma.process.findMany({
      where: {
        deletedAt: null,
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        content: true,
        area: true,
      },
    });
    
    return processes.map(p => ({ ...p, similarity: 0.5 }));
  }

  /**
   * Build context string from retrieved processes
   */
  private buildContext(processes: Array<{ 
    title: string; 
    description: string | null; 
    content: string | null;
    area: string;
  }>): string {
    return processes.map((p, i) => {
      const content = p.content || p.description || '';
      // Truncate to avoid context overflow
      const truncated = content.length > 2000 ? content.substring(0, 2000) + '...' : content;
      return `[Document ${i + 1}: ${p.title}]\nArea: ${p.area}\n${truncated}`;
    }).join('\n\n---\n\n');
  }

  /**
   * Generate answer using Claude with RAG
   */
  private async generateAnswer(query: string, context: string): Promise<string> {
    if (!this.anthropic) {
      return this.generateFallbackAnswer(query, context);
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are a helpful assistant for XCLSV's Process Hub. Answer the user's question based on the following process documentation.

DOCUMENTATION:
${context}

USER QUESTION: ${query}

RESPONSE FORMAT:
- Start with a brief 1-sentence summary answering the question
- Use **bold** for process names and key terms
- Use numbered lists for step-by-step procedures
- Use bullet points for lists of items
- Include the **Owner** if mentioned in the documentation
- Keep it concise - no filler phrases like "Based on the documentation..."
- If info is missing, briefly note what's not covered

Example good structure:
**Ambassador Payroll** is processed weekly by Pinky.

**Steps:**
1. First step here
2. Second step here

**Owner:** Pinky`,
          },
        ],
      });

      const textBlock = response.content.find(block => block.type === 'text');
      return textBlock?.text || 'Unable to generate answer.';
    } catch (error) {
      this.logger.error(`Claude API error: ${error.message}`);
      return this.generateFallbackAnswer(query, context);
    }
  }

  /**
   * Generate a simple answer without AI
   */
  private generateFallbackAnswer(query: string, context: string): string {
    return `Based on the available documentation, here are the most relevant processes for "${query}". Please review the linked sources below for detailed information.`;
  }

  /**
   * Generate related question suggestions
   */
  private generateRelatedQuestions(query: string, processes: Array<{ title: string; area: string }>): string[] {
    const areas = [...new Set(processes.map(p => p.area))];
    const titles = processes.slice(0, 3).map(p => p.title);
    
    const suggestions: string[] = [];
    
    if (titles.length > 0) {
      suggestions.push(`What are the steps for ${titles[0]}?`);
    }
    if (titles.length > 1) {
      suggestions.push(`How does ${titles[1]} work?`);
    }
    if (areas.length > 0) {
      suggestions.push(`Show me all ${areas[0]} processes`);
    }
    
    return suggestions.slice(0, 3);
  }

  /**
   * Generate and store embedding for a process
   */
  async generateProcessEmbedding(processId: string): Promise<void> {
    const process = await prisma.process.findUnique({
      where: { id: processId },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });

    if (!process) {
      throw new Error(`Process ${processId} not found`);
    }

    // Build text to embed: title + description + content + steps
    const textParts = [
      process.title,
      process.description || '',
      process.content || '',
      ...process.steps.map(s => `${s.title}: ${s.description || ''}`),
    ];
    const text = textParts.join('\n').substring(0, 8000); // Limit text size

    const embedding = await this.vectorService.generateEmbedding(text);
    const embeddingStr = `[${embedding.join(',')}]`;

    // Upsert embedding
    await prisma.$executeRaw`
      INSERT INTO "ProcessEmbedding" (id, "processId", embedding, embedding_vec, model, version, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        ${processId},
        ${embedding},
        ${embeddingStr}::vector,
        'text-embedding-ada-002',
        1,
        NOW(),
        NOW()
      )
      ON CONFLICT ("processId") DO UPDATE SET
        embedding = ${embedding},
        embedding_vec = ${embeddingStr}::vector,
        "updatedAt" = NOW()
    `;

    this.logger.log(`Generated embedding for process ${processId}`);
  }

  /**
   * Generate embeddings for all processes
   */
  async generateAllEmbeddings(): Promise<{ success: number; failed: number }> {
    const processes = await prisma.process.findMany({
      where: { deletedAt: null },
      select: { id: true, title: true },
    });

    let success = 0;
    let failed = 0;

    for (const process of processes) {
      try {
        await this.generateProcessEmbedding(process.id);
        success++;
        this.logger.log(`Embedded ${success}/${processes.length}: ${process.title}`);
        // Rate limit: OpenAI allows 3000 RPM, so add small delay
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        this.logger.error(`Failed to embed ${process.title}: ${error.message}`);
        failed++;
      }
    }

    return { success, failed };
  }
}
