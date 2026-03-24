import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkflowsService, WorkflowType } from './workflows.service';
import { RequirePermissions } from '@/modules/authorization';
import { Permission } from '@/modules/authorization/permissions';
import { CurrentUser } from '@/common/decorators';

@ApiTags('Workflows')
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post('request')
  @RequirePermissions(Permission.PROCESS_UPDATE)
  @ApiOperation({ summary: 'Create an approval request' })
  @ApiResponse({ status: 201, description: 'Request created' })
  async createRequest(
    @CurrentUser('id') userId: string,
    @Body() body: { processId: string; type: WorkflowType; notes?: string },
  ) {
    return this.workflowsService.createApprovalRequest(
      body.processId,
      body.type,
      userId,
      body.notes,
    );
  }

  @Get('pending')
  @RequirePermissions(Permission.PROCESS_PUBLISH)
  @ApiOperation({ summary: 'Get pending approval requests' })
  @ApiResponse({ status: 200, description: 'Pending requests' })
  async getPending() {
    return this.workflowsService.getPendingRequests();
  }

  @Get('my-requests')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get my approval requests' })
  @ApiResponse({ status: 200, description: 'My requests' })
  async getMyRequests(@CurrentUser('id') userId: string) {
    return this.workflowsService.getMyRequests(userId);
  }

  @Post(':id/approve')
  @RequirePermissions(Permission.PROCESS_PUBLISH)
  @ApiOperation({ summary: 'Approve a request' })
  @ApiResponse({ status: 200, description: 'Request approved' })
  async approve(
    @Param('id') requestId: string,
    @CurrentUser('id') userId: string,
    @Body('notes') notes?: string,
  ) {
    return this.workflowsService.approve(requestId, userId, notes);
  }

  @Post(':id/reject')
  @RequirePermissions(Permission.PROCESS_PUBLISH)
  @ApiOperation({ summary: 'Reject a request' })
  @ApiResponse({ status: 200, description: 'Request rejected' })
  async reject(
    @Param('id') requestId: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.workflowsService.reject(requestId, userId, reason);
  }

  @Post(':id/cancel')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Cancel my request' })
  @ApiResponse({ status: 200, description: 'Request cancelled' })
  async cancel(
    @Param('id') requestId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.workflowsService.cancel(requestId, userId);
    return { success: true };
  }
}
