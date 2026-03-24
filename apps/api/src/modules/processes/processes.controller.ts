import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ProcessesService } from './processes.service';
import { CreateProcessDto, UpdateProcessDto, ProcessResponseDto, ProcessArea, ProcessStatus, ProcessType } from './dto';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { Public, CurrentUser } from '@/common/decorators';
import { RequirePermissions } from '@/modules/authorization';
import { Permission } from '@/modules/authorization/permissions';

@ApiTags('Processes')
@Controller('processes')
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Post()
  @Public()  // MVP: Allow public creation
  @ApiOperation({ summary: 'Create a new process' })
  @ApiResponse({ status: 201, description: 'Process created', type: ProcessResponseDto })
  async create(
    @Body() dto: CreateProcessDto,
    @CurrentUser('id') userId?: string,
  ) {
    // MVP: Default to Z's user if no auth
    const ownerId = userId || 'cc2ed391-2f1c-4ffb-83f5-bb4218c61ad3';
    return this.processesService.create(dto, ownerId);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all processes with pagination' })
  @ApiQuery({ name: 'area', required: false, enum: ProcessArea })
  @ApiQuery({ name: 'status', required: false, enum: ProcessStatus })
  @ApiQuery({ name: 'type', required: false, enum: ProcessType, description: 'Filter by type (PROCESS or DOCUMENT). Default: PROCESS. Use ALL to show both.' })
  @ApiResponse({ status: 200, description: 'Paginated list of processes' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('area') area?: ProcessArea,
    @Query('status') status?: ProcessStatus,
    @Query('type') type?: string,
  ) {
    return this.processesService.findAll(query, { area, status, type });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a process by ID' })
  @ApiResponse({ status: 200, description: 'Process details', type: ProcessResponseDto })
  @ApiResponse({ status: 404, description: 'Process not found' })
  async findOne(@Param('id') id: string) {
    return this.processesService.findOne(id);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get a process by slug' })
  @ApiResponse({ status: 200, description: 'Process details', type: ProcessResponseDto })
  @ApiResponse({ status: 404, description: 'Process not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.processesService.findBySlug(slug);
  }

  @Put(':id')
  @Public()  // MVP: Allow public updates
  @ApiOperation({ summary: 'Update a process' })
  @ApiResponse({ status: 200, description: 'Process updated', type: ProcessResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProcessDto,
    @CurrentUser('id') userId?: string,
  ) {
    // MVP: Default to Z's user if no auth
    const ownerId = userId || 'cc2ed391-2f1c-4ffb-83f5-bb4218c61ad3';
    return this.processesService.update(id, dto, ownerId);
  }

  @Post(':id/publish')
  @RequirePermissions(Permission.PROCESS_PUBLISH)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a process' })
  @ApiResponse({ status: 200, description: 'Process published' })
  async publish(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.processesService.publish(id, userId);
  }

  @Post(':id/archive')
  @RequirePermissions(Permission.PROCESS_ARCHIVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a process' })
  @ApiResponse({ status: 200, description: 'Process archived' })
  async archive(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.processesService.archive(id, userId);
  }

  @Delete(':id')
  @Public()  // MVP: Allow public deletes
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a process (soft delete)' })
  @ApiResponse({ status: 204, description: 'Process deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId?: string,
  ) {
    const ownerId = userId || 'cc2ed391-2f1c-4ffb-83f5-bb4218c61ad3';
    return this.processesService.delete(id, ownerId);
  }
}
