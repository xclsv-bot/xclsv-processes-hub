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
import { CreateProcessDto, UpdateProcessDto, ProcessResponseDto, ProcessArea, ProcessStatus } from './dto';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { Public, CurrentUser } from '@/common/decorators';
import { RequirePermissions } from '@/modules/authorization';
import { Permission } from '@/modules/authorization/permissions';

@ApiTags('Processes')
@Controller('processes')
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Post()
  @RequirePermissions(Permission.PROCESS_CREATE)
  @ApiOperation({ summary: 'Create a new process' })
  @ApiResponse({ status: 201, description: 'Process created', type: ProcessResponseDto })
  async create(
    @Body() dto: CreateProcessDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.processesService.create(dto, userId);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all processes with pagination' })
  @ApiQuery({ name: 'area', required: false, enum: ProcessArea })
  @ApiQuery({ name: 'status', required: false, enum: ProcessStatus })
  @ApiResponse({ status: 200, description: 'Paginated list of processes' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('area') area?: ProcessArea,
    @Query('status') status?: ProcessStatus,
  ) {
    return this.processesService.findAll(query, { area, status });
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
  @RequirePermissions(Permission.PROCESS_UPDATE)
  @ApiOperation({ summary: 'Update a process' })
  @ApiResponse({ status: 200, description: 'Process updated', type: ProcessResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProcessDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.processesService.update(id, dto, userId);
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
  @RequirePermissions(Permission.PROCESS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a process (soft delete)' })
  @ApiResponse({ status: 204, description: 'Process deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.processesService.delete(id, userId);
  }
}
