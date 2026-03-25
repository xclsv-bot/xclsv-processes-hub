import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { VectorService } from './vector.service';
import { AiSearchService } from './ai-search.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService, VectorService, AiSearchService],
  exports: [SearchService, VectorService, AiSearchService],
})
export class SearchModule {}
