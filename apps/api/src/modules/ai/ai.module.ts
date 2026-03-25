import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { UsageTrackingService } from './usage-tracking.service';
import { UsageController } from './usage.controller';
import { ProcessGeneratorService } from './process-generator.service';
import { TranscriptService } from './transcript.service';

@Module({
  controllers: [AIController, UsageController],
  providers: [AIService, UsageTrackingService, ProcessGeneratorService, TranscriptService],
  exports: [AIService, UsageTrackingService, ProcessGeneratorService, TranscriptService],
})
export class AIModule {}
