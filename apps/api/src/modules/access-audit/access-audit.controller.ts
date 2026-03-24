import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AccessAuditService } from './access-audit.service';
import { RequirePermissions } from '@/modules/authorization';
import { Permission } from '@/modules/authorization/permissions';
import { CurrentUser } from '@/common/decorators';

@ApiTags('Access Audit')
@Controller('access-audit')
export class AccessAuditController {
  constructor(private readonly accessAuditService: AccessAuditService) {}

  @Get()
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({ summary: 'Query access logs' })
  async queryLogs(
    @Query('userId') userId?: string,
    @Query('processId') processId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.accessAuditService.queryAccessLogs({
      userId,
      processId,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit || 50,
      offset: offset || 0,
    });
  }

  @Get('process/:processId/summary')
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({ summary: 'Get access summary for process' })
  async getProcessSummary(@Param('processId') processId: string) {
    return { data: await this.accessAuditService.getAccessSummary(processId) };
  }

  @Get('user/:userId')
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({ summary: 'Get user access history' })
  async getUserHistory(@Param('userId') userId: string, @Query('limit') limit?: number) {
    return { data: await this.accessAuditService.getUserAccessHistory(userId, limit || 50) };
  }

  @Get('my')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get my access history' })
  async getMyHistory(@CurrentUser('id') userId: string, @Query('limit') limit?: number) {
    return { data: await this.accessAuditService.getUserAccessHistory(userId, limit || 50) };
  }
}
