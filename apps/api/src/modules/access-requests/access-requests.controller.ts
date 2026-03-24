import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AccessRequestsService } from './access-requests.service';
import { RequirePermissions } from '@/modules/authorization';
import { Permission } from '@/modules/authorization/permissions';
import { CurrentUser } from '@/common/decorators';

@ApiTags('Access Requests')
@Controller('access-requests')
export class AccessRequestsController {
  constructor(private readonly accessRequestsService: AccessRequestsService) {}

  @Post()
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Create access request' })
  async createRequest(
    @CurrentUser('id') requesterId: string,
    @Body() body: { processId: string; permissions: string[]; reason: string },
  ) {
    return { data: await this.accessRequestsService.createRequest(body.processId, requesterId, body.permissions, body.reason) };
  }

  @Get('pending')
  @RequirePermissions(Permission.PROCESS_MANAGE)
  @ApiOperation({ summary: 'Get pending requests' })
  async getPendingRequests(@Query('processId') processId?: string) {
    return { data: await this.accessRequestsService.getPendingRequests(processId) };
  }

  @Get('my')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get my requests' })
  async getMyRequests(@CurrentUser('id') requesterId: string) {
    return { data: await this.accessRequestsService.getMyRequests(requesterId) };
  }

  @Post(':id/approve')
  @RequirePermissions(Permission.PROCESS_MANAGE)
  @ApiOperation({ summary: 'Approve request' })
  async approveRequest(
    @Param('id') requestId: string,
    @CurrentUser('id') reviewerId: string,
    @Body('note') note?: string,
  ) {
    return { data: await this.accessRequestsService.approveRequest(requestId, reviewerId, note) };
  }

  @Post(':id/reject')
  @RequirePermissions(Permission.PROCESS_MANAGE)
  @ApiOperation({ summary: 'Reject request' })
  async rejectRequest(
    @Param('id') requestId: string,
    @CurrentUser('id') reviewerId: string,
    @Body('reason') reason: string,
  ) {
    return { data: await this.accessRequestsService.rejectRequest(requestId, reviewerId, reason) };
  }

  @Post(':id/cancel')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Cancel my request' })
  async cancelRequest(@Param('id') requestId: string, @CurrentUser('id') requesterId: string) {
    await this.accessRequestsService.cancelRequest(requestId, requesterId);
    return { success: true };
  }
}
