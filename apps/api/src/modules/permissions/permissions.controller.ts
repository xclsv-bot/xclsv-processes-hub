import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PermissionsService, PermissionGrant } from './permissions.service';
import { RequirePermissions } from '@/modules/authorization';
import { Permission } from '@/modules/authorization/permissions';
import { CurrentUser } from '@/common/decorators';

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('process/:processId')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get permissions for a process' })
  async getProcessPermissions(@Param('processId') processId: string) {
    return { data: await this.permissionsService.getProcessPermissions(processId) };
  }

  @Get('user/:userId')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get permissions for a user' })
  async getUserPermissions(@Param('userId') userId: string) {
    return { data: await this.permissionsService.getUserPermissions(userId) };
  }

  @Get('my')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get my permissions' })
  async getMyPermissions(@CurrentUser('id') userId: string) {
    return { data: await this.permissionsService.getUserPermissions(userId) };
  }

  @Post('grant')
  @RequirePermissions(Permission.PROCESS_MANAGE)
  @ApiOperation({ summary: 'Grant permissions' })
  async grantPermissions(
    @CurrentUser('id') granterId: string,
    @Body() body: { processId: string; grants: PermissionGrant[] },
  ) {
    await this.permissionsService.grantPermissions(body.processId, body.grants, granterId);
    return { success: true };
  }

  @Delete('revoke')
  @RequirePermissions(Permission.PROCESS_MANAGE)
  @ApiOperation({ summary: 'Revoke permission' })
  async revokePermission(@Body() body: { processId: string; userId: string }) {
    await this.permissionsService.revokePermission(body.processId, body.userId);
    return { success: true };
  }

  @Get('check')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Check specific permission' })
  async checkPermission(
    @Query('processId') processId: string,
    @Query('userId') userId: string,
    @Query('permission') permission: 'view' | 'edit' | 'delete' | 'publish' | 'verify',
  ) {
    const hasPermission = await this.permissionsService.checkPermission(processId, userId, permission);
    return { data: { hasPermission } };
  }
}
