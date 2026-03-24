import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '@/common/decorators';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

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
}
