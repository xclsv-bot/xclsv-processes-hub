import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FlagsService, FlagType, FlagStatus } from './flags.service';
import { RequirePermissions } from '@/modules/authorization';
import { Permission } from '@/modules/authorization/permissions';
import { CurrentUser } from '@/common/decorators';

@ApiTags('Flags')
@Controller('flags')
export class FlagsController {
  constructor(private readonly flagsService: FlagsService) {}

  @Post()
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Create a flag on a process' })
  @ApiResponse({ status: 201, description: 'Flag created' })
  async createFlag(
    @CurrentUser('id') userId: string,
    @Body() body: { processId: string; type: FlagType; description: string },
  ) {
    return this.flagsService.createFlag(
      body.processId,
      body.type,
      body.description,
      userId,
    );
  }

  @Get('open')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get open flags' })
  @ApiResponse({ status: 200, description: 'Open flags' })
  async getOpenFlags(@Query('limit') limit?: number) {
    return this.flagsService.getOpenFlags(limit || 50);
  }

  @Get('my-flags')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get my flags' })
  @ApiResponse({ status: 200, description: 'My flags' })
  async getMyFlags(@CurrentUser('id') userId: string) {
    return this.flagsService.getMyFlags(userId);
  }

  @Get('process/:processId')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get flags for a process' })
  @ApiResponse({ status: 200, description: 'Flags for process' })
  async getFlagsForProcess(@Param('processId') processId: string) {
    return this.flagsService.getFlagsForProcess(processId);
  }

  @Get('stats')
  @RequirePermissions(Permission.PROCESS_READ)
  @ApiOperation({ summary: 'Get flag statistics' })
  @ApiResponse({ status: 200, description: 'Flag stats' })
  async getStats() {
    return this.flagsService.getFlagStats();
  }

  @Post(':id/resolve')
  @RequirePermissions(Permission.PROCESS_UPDATE)
  @ApiOperation({ summary: 'Resolve a flag' })
  @ApiResponse({ status: 200, description: 'Flag resolved' })
  async resolveFlag(
    @Param('id') flagId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { resolution: string; dismiss?: boolean },
  ) {
    return this.flagsService.resolveFlag(flagId, userId, body.resolution, body.dismiss);
  }

  @Post(':id/status')
  @RequirePermissions(Permission.PROCESS_UPDATE)
  @ApiOperation({ summary: 'Update flag status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id') flagId: string,
    @Body('status') status: FlagStatus,
  ) {
    return this.flagsService.updateStatus(flagId, status);
  }
}
