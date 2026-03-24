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
  @ApiQuery({ name: 'semantic', required: false, description: 'Enable semantic search (default true)' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('semantic') semantic?: boolean,
  ) {
    return this.searchService.search(query, {
      limit: limit || 10,
      semantic: semantic !== false,
    });
  }
}
