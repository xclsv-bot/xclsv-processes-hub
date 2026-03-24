import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OwnershipService, PermissionGrant } from './ownership.service';
import { RequirePermissions } from '@/modules/authorization';
import { Permission } from '@/modules/authorization/permissions';
import { CurrentUser } from '@/common/decorators';

@ApiTags('Ownership')
@Controller('processes/:processId/ownership')
export class OwnershipController {
  constructor(private readonly ownershipService: OwnershipService) {}

  @Post('transfer')
  @RequirePermissions(Permission.PROCESS_UPDATE)
  @ApiOperation({ summary: 'Transfer process ownership' })
  @ApiResponse({ status: 200, description: 'Ownership transferred' })
  async transferOwnership(
    @Param('processId') processId: string,
    @Body('newOwnerId') newOwnerId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ownershipService.transferOwnership(processId, newOwnerId, userId);
  }

  @Get('permissions')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get process permissions' })
  @ApiResponse({ status: 200, description: 'List of permissions' })
  async getPermissions(@Param('processId') processId: string) {
    return this.ownershipService.getPermissions(processId);
  }

  @Post('permissions')
  @RequirePermissions(Permission.PROCESS_UPDATE)
  @ApiOperation({ summary: 'Grant permissions on process' })
  @ApiResponse({ status: 201, description: 'Permissions granted' })
  async grantPermissions(
    @Param('processId') processId: string,
    @Body() grant: PermissionGrant,
    @CurrentUser('id') userId: string,
  ) {
    return this.ownershipService.grantPermissions(processId, grant, userId);
  }

  @Delete('permissions/:userId')
  @RequirePermissions(Permission.PROCESS_UPDATE)
  @ApiOperation({ summary: 'Revoke permissions from user' })
  @ApiResponse({ status: 204, description: 'Permissions revoked' })
  async revokePermissions(
    @Param('processId') processId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.ownershipService.revokePermissions(processId, targetUserId, userId);
  }
}
