import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProcessesService } from './processes.service';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';

@ApiTags('Processes')
@Controller('processes')
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Get()
  @ApiOperation({ summary: 'List all processes with pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of processes' })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.processesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a process by ID' })
  @ApiResponse({ status: 200, description: 'Returns the process' })
  @ApiResponse({ status: 404, description: 'Process not found' })
  async findOne(@Param('id') id: string) {
    return this.processesService.findOne(id);
  }

  // TODO: Implement create, update, delete, publish endpoints
}
