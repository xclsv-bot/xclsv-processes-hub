import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UsageTrackingService } from './usage-tracking.service';
import { RequirePermissions } from '@/modules/authorization';
import { Permission } from '@/modules/authorization/permissions';
import { CurrentUser } from '@/common/decorators';

@ApiTags('Usage')
@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageTrackingService) {}

  @Get('me')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get my AI usage stats' })
  @ApiResponse({ status: 200, description: 'Usage statistics' })
  async getMyUsage(
    @CurrentUser('id') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.usageService.getUserUsage(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('system')
  @RequirePermissions(Permission.ADMIN_ACCESS)
  @ApiOperation({ summary: 'Get system-wide AI usage stats (admin only)' })
  @ApiResponse({ status: 200, description: 'System usage statistics' })
  async getSystemUsage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.usageService.getSystemUsage(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
