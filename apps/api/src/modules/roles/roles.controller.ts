import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { RequirePermissions } from '@/modules/authorization';
import { Permission } from '@/modules/authorization/permissions';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions(Permission.ROLE_READ)
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  async getAllRoles() {
    return { data: await this.rolesService.getAllRoles() };
  }

  @Get(':id')
  @RequirePermissions(Permission.ROLE_READ)
  @ApiOperation({ summary: 'Get a role by ID' })
  @ApiResponse({ status: 200, description: 'Role details' })
  async getRole(@Param('id') id: string) {
    return { data: await this.rolesService.getRole(id) };
  }

  @Post()
  @RequirePermissions(Permission.ROLE_CREATE)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created' })
  async createRole(@Body() body: { name: string; permissions: string[]; description?: string }) {
    return { data: await this.rolesService.createRole(body.name, body.permissions, body.description) };
  }

  @Put(':id')
  @RequirePermissions(Permission.ROLE_UPDATE)
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateRole(
    @Param('id') id: string,
    @Body() body: { permissions?: string[]; description?: string },
  ) {
    return { data: await this.rolesService.updateRole(id, body) };
  }

  @Delete(':id')
  @RequirePermissions(Permission.ROLE_DELETE)
  @ApiOperation({ summary: 'Delete a role' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  async deleteRole(@Param('id') id: string) {
    await this.rolesService.deleteRole(id);
    return { success: true };
  }

  @Post('assign')
  @RequirePermissions(Permission.ROLE_ASSIGN)
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 200, description: 'Role assigned' })
  async assignRole(@Body() body: { userId: string; roleName: string }) {
    await this.rolesService.assignRole(body.userId, body.roleName);
    return { success: true };
  }
}
