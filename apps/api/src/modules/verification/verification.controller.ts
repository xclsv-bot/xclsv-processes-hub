import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { RequirePermissions } from '@/modules/authorization';
import { Permission } from '@/modules/authorization/permissions';
import { CurrentUser } from '@/common/decorators';

@ApiTags('Verification')
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('processes/:processId/verify')
  @RequirePermissions(Permission.PROCESS_UPDATE)
  @ApiOperation({ summary: 'Verify a process' })
  @ApiResponse({ status: 200, description: 'Process verified' })
  async verify(
    @Param('processId') processId: string,
    @CurrentUser('id') userId: string,
    @Body('notes') notes?: string,
  ) {
    return this.verificationService.verify(processId, userId, notes);
  }

  @Post('processes/:processId/cadence')
  @RequirePermissions(Permission.PROCESS_UPDATE)
  @ApiOperation({ summary: 'Set verification cadence' })
  @ApiResponse({ status: 200, description: 'Cadence updated' })
  async setCadence(
    @Param('processId') processId: string,
    @CurrentUser('id') userId: string,
    @Body('cadenceDays') cadenceDays: number,
  ) {
    return this.verificationService.setVerificationCadence(processId, cadenceDays, userId);
  }

  @Post('processes/:processId/needs-review')
  @RequirePermissions(Permission.PROCESS_UPDATE)
  @ApiOperation({ summary: 'Mark process as needs review' })
  @ApiResponse({ status: 200, description: 'Marked as needs review' })
  async markNeedsReview(
    @Param('processId') processId: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason: string,
  ) {
    await this.verificationService.markNeedsReview(processId, userId, reason);
    return { success: true };
  }

  @Get('overdue')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get overdue verifications' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Overdue processes' })
  async getOverdue(@Query('limit') limit?: number) {
    return this.verificationService.getOverdueProcesses(limit || 50);
  }

  @Get('upcoming')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get upcoming verifications' })
  @ApiQuery({ name: 'days', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Upcoming verifications' })
  async getUpcoming(
    @Query('days') days?: number,
    @Query('limit') limit?: number,
  ) {
    return this.verificationService.getUpcomingVerifications(days || 30, limit || 50);
  }

  @Get('processes/:processId/history')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get verification history' })
  @ApiResponse({ status: 200, description: 'Verification history' })
  async getHistory(@Param('processId') processId: string) {
    return this.verificationService.getVerificationHistory(processId);
  }
}
