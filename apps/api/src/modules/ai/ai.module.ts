import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { UsageTrackingService } from './usage-tracking.service';
import { UsageController } from './usage.controller';
import { ProcessGeneratorService } from './process-generator.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AIController, UsageController],
  providers: [AIService, UsageTrackingService, ProcessGeneratorService],
  exports: [AIService, UsageTrackingService, ProcessGeneratorService],
})
export class AIModule {}
