import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { VectorService } from './vector.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService, VectorService],
  exports: [SearchService, VectorService],
})
export class SearchModule {}
