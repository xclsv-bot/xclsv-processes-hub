import { Module } from '@nestjs/common';
import { DiagramsController } from './diagrams.controller';
import { DiagramsService } from './diagrams.service';
import { DiagramExportService } from './diagram-export.service';

@Module({
  controllers: [DiagramsController],
  providers: [DiagramsService, DiagramExportService],
  exports: [DiagramsService, DiagramExportService],
})
export class DiagramsModule {}
