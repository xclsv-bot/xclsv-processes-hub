import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Public, CurrentUser } from '@/common/decorators';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Public()  // MVP: Allow public access
  @ApiOperation({ summary: 'Get dashboard stats' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(@CurrentUser('id') userId?: string) {
    // MVP: Use default user if not authenticated
    const uid = userId || 'cc2ed391-2f1c-4ffb-83f5-bb4218c61ad3';
    return this.dashboardService.getDashboard(uid);
  }

  @Get('recent')
  @Public()  // MVP: Allow public access
  @ApiOperation({ summary: 'Get recent processes' })
  @ApiResponse({ status: 200, description: 'Recent processes' })
  async getRecentProcesses(
    @CurrentUser('id') userId?: string,
    @Query('limit') limit?: number,
  ) {
    const uid = userId || 'cc2ed391-2f1c-4ffb-83f5-bb4218c61ad3';
    return this.dashboardService.getMyRecentProcesses(uid, limit || 10);
  }

  @Post('track')
  @Public()  // MVP: Allow public access
  @ApiOperation({ summary: 'Track user activity' })
  @ApiResponse({ status: 201, description: 'Activity tracked' })
  async trackActivity(
    @CurrentUser('id') userId?: string,
    @Body() body: { processId: string; action: 'view' | 'edit' | 'search' },
  ) {
    const uid = userId || 'cc2ed391-2f1c-4ffb-83f5-bb4218c61ad3';
    await this.dashboardService.trackActivity(uid, body.processId, body.action);
    return { success: true };
  }
}
