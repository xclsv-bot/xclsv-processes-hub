import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { VectorService } from './vector.service';

const prisma = new PrismaClient();

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

    // Simple search using Prisma (PostgreSQL full-text can be added later)
    const where: any = {
      deletedAt: null,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (areas && areas.length > 0) {
      where.area = { in: areas };
    }
    if (status) {
      where.status = status;
    }

    const [processes, total] = await Promise.all([
      prisma.process.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          owner: { select: { id: true, name: true } },
        },
      }),
      prisma.process.count({ where }),
    ]);

    const results: SearchResult[] = processes.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      area: p.area,
      status: p.status,
      snippet: p.description || (p.content ? p.content.substring(0, 200) : ''),
      score: 1,
      matchType: 'fulltext' as const,
      owner: p.owner,
    }));

    return { data: results, total };
  }

  async suggest(query: string, limit: number = 5): Promise<string[]> {
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

    return results.map(r => r.title);
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
        owner: { select: { id: true, name: true } },
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
