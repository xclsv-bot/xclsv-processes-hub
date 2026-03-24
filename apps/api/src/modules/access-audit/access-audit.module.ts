import { Module } from '@nestjs/common';
import { AccessAuditController } from './access-audit.controller';
import { AccessAuditService } from './access-audit.service';

@Module({
  controllers: [AccessAuditController],
  providers: [AccessAuditService],
  exports: [AccessAuditService],
})
export class AccessAuditModule {}
