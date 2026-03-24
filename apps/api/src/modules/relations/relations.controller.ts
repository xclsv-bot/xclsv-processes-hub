import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RelationsService } from './relations.service';
import { CreateRelationDto, RelationResponseDto, RelationsListResponseDto } from './dto';

@ApiTags('Process Relations')
@Controller('processes/:processId/relations')
// MVP: Auth disabled for internal use (following steps.controller.ts pattern)
@ApiBearerAuth()
export class RelationsController {
  constructor(private readonly relationsService: RelationsService) {}

  @Post()
  @ApiOperation({ summary: 'Link a related process' })
  @ApiParam({ name: 'processId', description: 'Source process ID' })
  @ApiResponse({ status: 201, description: 'Relation created successfully', type: RelationResponseDto })
  @ApiResponse({ status: 404, description: 'Process not found' })
  @ApiResponse({ status: 409, description: 'Relation already exists' })
  async create(
    @Param('processId') processId: string,
    @Body() dto: CreateRelationDto,
  ): Promise<{ data: RelationResponseDto }> {
    const relation = await this.relationsService.create(processId, dto);
    return { data: relation };
  }

  @Get()
  @ApiOperation({ summary: 'Get all related processes (both directions)' })
  @ApiParam({ name: 'processId', description: 'Process ID' })
  @ApiResponse({ status: 200, description: 'Relations retrieved successfully', type: RelationsListResponseDto })
  @ApiResponse({ status: 404, description: 'Process not found' })
  async findAll(@Param('processId') processId: string): Promise<{ data: RelationsListResponseDto }> {
    const result = await this.relationsService.findAll(processId);
    return { data: result };
  }

  @Delete(':relationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a process relation' })
  @ApiParam({ name: 'processId', description: 'Process ID' })
  @ApiParam({ name: 'relationId', description: 'Relation ID' })
  @ApiResponse({ status: 204, description: 'Relation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Relation not found' })
  async remove(
    @Param('processId') processId: string,
    @Param('relationId') relationId: string,
  ): Promise<void> {
    await this.relationsService.remove(processId, relationId);
  }
}
