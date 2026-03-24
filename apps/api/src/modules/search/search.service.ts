import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@xclsv/database';
import { VectorService } from './vector.service';

export interface SearchOptions {
  limit: number;
  offset?: number;
  semantic?: boolean;
  areas?: string[];
  status?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  area: string;
  status: string;
  snippet: string;
  score: number;
  matchType: 'fulltext' | 'semantic' | 'hybrid';
  owner?: {
    id: string;
    name: string;
  };
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly vectorService: VectorService) {}

  async search(query: string, options: SearchOptions): Promise<{ data: SearchResult[]; total: number }> {
    const { limit = 10, offset = 0, semantic = true, areas, status } = options;

    // Build filters
    const filters: string[] = ['p."deletedAt" IS NULL'];
    if (areas && areas.length > 0) {
      filters.push(`p.area IN (${areas.map(a => `'${a}'`).join(',')})`);
    }
    if (status) {
      filters.push(`p.status = '${status}'`);
    }
    const whereClause = filters.join(' AND ');

    // Full-text search using PostgreSQL ts_vector
    const results = await prisma.$queryRaw<SearchResult[]>`
      WITH ranked AS (
        SELECT 
          p.id,
          p.title,
          p.slug,
          p.description,
          p.area,
          p.status,
          p.content,
          u.id as "ownerId",
          u.name as "ownerName",
          ts_rank(
            to_tsvector('english', COALESCE(p.title, '') || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.content, '')),
            plainto_tsquery('english', ${query})
          ) as rank
        FROM "Process" p
        LEFT JOIN "User" u ON p."ownerId" = u.id
        WHERE ${whereClause}
          AND to_tsvector('english', COALESCE(p.title, '') || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.content, ''))
              @@ plainto_tsquery('english', ${query})
        ORDER BY rank DESC
        LIMIT ${limit}
        OFFSET ${offset}
      )
      SELECT 
        id,
        title,
        slug,
        description,
        area,
        status,
        CASE 
          WHEN content IS NOT NULL THEN 
            SUBSTRING(content FROM 1 FOR 200)
          ELSE description
        END as snippet,
        rank as score,
        'fulltext' as "matchType",
        json_build_object('id', "ownerId", 'name', "ownerName") as owner
      FROM ranked
    `.catch(() => []);

    // If semantic search enabled and we have few results, also do vector search
    if (semantic && results.length < limit) {
      try {
        const semanticResults = await this.semanticSearch(query, {
          ...options,
          limit: limit - results.length,
          excludeIds: results.map((r: SearchResult) => r.id),
        });
        
        // Merge results, avoiding duplicates
        const existingIds = new Set(results.map((r: SearchResult) => r.id));
        for (const sr of semanticResults) {
          if (!existingIds.has(sr.id)) {
            results.push({ ...sr, matchType: 'semantic' });
          }
        }
      } catch (error) {
        this.logger.warn(`Semantic search failed: ${error.message}`);
      }
    }

    return {
      data: results,
      total: results.length,
    };
  }

  private async semanticSearch(
    query: string, 
    options: SearchOptions & { excludeIds?: string[] }
  ): Promise<SearchResult[]> {
    // Generate embedding for the query
    const embedding = await this.vectorService.generateEmbedding(query);
    
    if (embedding.every(v => v === 0)) {
      return []; // No valid embedding
    }

    // For now, return empty - actual vector search requires pgvector setup
    // In production, would query ProcessEmbedding table
    return [];
  }

  async suggest(query: string, limit: number = 5): Promise<string[]> {
    // Get title suggestions based on prefix match
    const results = await prisma.process.findMany({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { title: true },
      take: limit,
    });

    return results.map((r: { title: string }) => r.title);
  }

  async searchByTag(tagName: string, options: SearchOptions): Promise<{ data: SearchResult[]; total: number }> {
    const { limit = 10, offset = 0 } = options;

    const processes = await prisma.process.findMany({
      where: {
        deletedAt: null,
        tags: {
          some: {
            tag: {
              name: { equals: tagName, mode: 'insensitive' },
            },
          },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true },
        },
      },
      skip: offset,
      take: limit,
    });

    const results: SearchResult[] = processes.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      area: p.area,
      status: p.status,
      snippet: p.description || '',
      score: 1,
      matchType: 'fulltext' as const,
      owner: p.owner,
    }));

    return { data: results, total: results.length };
  }
}
