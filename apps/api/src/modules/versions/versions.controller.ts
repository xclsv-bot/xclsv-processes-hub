import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VersionsService } from './versions.service';
import { RequirePermissions } from '@/modules/authorization';
import { Permission } from '@/modules/authorization/permissions';
import { CurrentUser, Public } from '@/common/decorators';

@ApiTags('Versions')
@Controller('processes/:processId/versions')
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all versions of a process' })
  @ApiResponse({ status: 200, description: 'List of versions' })
  async getVersions(@Param('processId') processId: string) {
    return this.versionsService.getVersions(processId);
  }

  @Get(':version')
  @Public()
  @ApiOperation({ summary: 'Get a specific version' })
  @ApiResponse({ status: 200, description: 'Version details' })
  async getVersion(
    @Param('processId') processId: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.versionsService.getVersion(processId, version);
  }

  @Post()
  @RequirePermissions(Permission.PROCESS_UPDATE)
  @ApiOperation({ summary: 'Create a new version (save point)' })
  @ApiResponse({ status: 201, description: 'Version created' })
  async createVersion(
    @Param('processId') processId: string,
    @CurrentUser('id') userId: string,
    @Body('changeNotes') changeNotes?: string,
  ) {
    return this.versionsService.createVersion(processId, userId, changeNotes);
  }

  @Post(':version/restore')
  @RequirePermissions(Permission.PROCESS_UPDATE)
  @ApiOperation({ summary: 'Restore process to a previous version' })
  @ApiResponse({ status: 200, description: 'Process restored' })
  async restoreVersion(
    @Param('processId') processId: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser('id') userId: string,
  ) {
    return this.versionsService.restoreVersion(processId, version, userId);
  }

  @Get('compare')
  @Public()
  @ApiOperation({ summary: 'Compare two versions' })
  @ApiResponse({ status: 200, description: 'Version comparison' })
  async compareVersions(
    @Param('processId') processId: string,
    @Query('v1', ParseIntPipe) v1: number,
    @Query('v2', ParseIntPipe) v2: number,
  ) {
    return this.versionsService.compareVersions(processId, v1, v2);
  }
}
