import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RequirePermissions } from '@/modules/authorization';
import { Permission } from '@/modules/authorization/permissions';
import { CurrentUser } from '@/common/decorators';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiQuery({ name: 'unreadOnly', required: false })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.getForUser(userId, unreadOnly === 'true');
  }

  @Get('count')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Post(':id/read')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Marked as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    await this.notificationsService.markAsRead(userId, notificationId);
    return { success: true };
  }

  @Post('read-all')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All marked as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }
}
