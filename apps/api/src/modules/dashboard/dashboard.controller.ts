import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { RequirePermissions } from '@/modules/authorization';
import { Permission } from '@/modules/authorization/permissions';
import { CurrentUser } from '@/common/decorators';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get personalized dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(@CurrentUser('id') userId: string) {
    return this.dashboardService.getDashboard(userId);
  }

  @Get('recent')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get my recent processes' })
  @ApiResponse({ status: 200, description: 'Recent processes' })
  async getRecentProcesses(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.dashboardService.getMyRecentProcesses(userId, limit || 10);
  }

  @Post('track')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Track user activity' })
  @ApiResponse({ status: 201, description: 'Activity tracked' })
  async trackActivity(
    @CurrentUser('id') userId: string,
    @Body() body: { processId: string; action: 'view' | 'edit' | 'search' },
  ) {
    await this.dashboardService.trackActivity(userId, body.processId, body.action);
    return { success: true };
  }
}
