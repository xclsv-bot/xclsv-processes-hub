import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { AiSearchService } from './ai-search.service';
import { Public } from '@/common/decorators';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly aiSearchService: AiSearchService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Search processes using full-text and semantic search' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default 10)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  @ApiQuery({ name: 'semantic', required: false, description: 'Enable semantic search (default true)' })
  @ApiQuery({ name: 'area', required: false, description: 'Filter by area' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('semantic') semantic?: string,
    @Query('area') area?: string,
    @Query('status') status?: string,
  ) {
    return this.searchService.search(query, {
      limit: limit || 10,
      offset: offset || 0,
      semantic: semantic !== 'false',
      areas: area ? [area] : undefined,
      status,
    });
  }

  @Get('suggest')
  @Public()
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiQuery({ name: 'q', required: true, description: 'Query prefix' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max suggestions (default 5)' })
  @ApiResponse({ status: 200, description: 'Suggestions' })
  async suggest(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    const suggestions = await this.searchService.suggest(query, limit || 5);
    return { suggestions };
  }

  @Get('tag/:tagName')
  @Public()
  @ApiOperation({ summary: 'Search processes by tag' })
  @ApiResponse({ status: 200, description: 'Processes with tag' })
  async searchByTag(
    @Query('tagName') tagName: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.searchService.searchByTag(tagName, {
      limit: limit || 10,
      offset: offset || 0,
    });
  }

  @Post('ai')
  @Public()
  @ApiOperation({ summary: 'AI-assisted semantic search with natural language Q&A' })
  @ApiBody({ 
    schema: { 
      type: 'object', 
      properties: { 
        query: { type: 'string', description: 'Natural language question' },
        limit: { type: 'number', description: 'Max sources to retrieve (default 5)' },
      },
      required: ['query'],
    } 
  })
  @ApiResponse({ status: 200, description: 'AI-generated answer with sources' })
  async aiSearch(
    @Body('query') query: string,
    @Body('limit') limit?: number,
  ) {
    return this.aiSearchService.search(query, limit || 5);
  }

  @Post('embeddings/generate')
  @Public()
  @ApiOperation({ summary: 'Generate embeddings for all processes (admin)' })
  @ApiResponse({ status: 200, description: 'Embedding generation results' })
  async generateEmbeddings() {
    return this.aiSearchService.generateAllEmbeddings();
  }

  @Post('embeddings/process/:id')
  @Public()
  @ApiOperation({ summary: 'Generate embedding for a single process' })
  @ApiResponse({ status: 200, description: 'Embedding generated' })
  async generateProcessEmbedding(
    @Query('id') processId: string,
  ) {
    await this.aiSearchService.generateProcessEmbedding(processId);
    return { success: true, processId };
  }
}
