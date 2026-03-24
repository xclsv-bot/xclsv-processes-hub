import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StepsService } from './steps.service';
import { CreateStepDto, UpdateStepDto, ReorderStepsDto, StepResponseDto, StepsListResponseDto } from './dto';

@ApiTags('Process Steps')
@Controller('processes/:processId/steps')
// MVP: Auth disabled for internal use
// @UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StepsController {
  constructor(private readonly stepsService: StepsService) {}

  @Post()
  // @Roles('ADMIN', 'MANAGER', 'EDITOR')  // MVP: disabled
  @ApiOperation({ summary: 'Create a new step for a process' })
  @ApiParam({ name: 'processId', description: 'Process ID' })
  @ApiResponse({ status: 201, description: 'Step created successfully', type: StepResponseDto })
  @ApiResponse({ status: 404, description: 'Process not found' })
  async create(
    @Param('processId') processId: string,
    @Body() dto: CreateStepDto,
    @Request() req?: { user?: { id: string } },
  ): Promise<{ data: StepResponseDto }> {
    // MVP: Default to Z's user if no auth
    const userId = req?.user?.id || 'cc2ed391-2f1c-4ffb-83f5-bb4218c61ad3';
    const step = await this.stepsService.create(processId, dto, userId);
    return { data: step };
  }

  @Get()
  @ApiOperation({ summary: 'Get all steps for a process (ordered by sequence)' })
  @ApiParam({ name: 'processId', description: 'Process ID' })
  @ApiResponse({ status: 200, description: 'Steps retrieved successfully', type: StepsListResponseDto })
  @ApiResponse({ status: 404, description: 'Process not found' })
  async findAll(@Param('processId') processId: string): Promise<{ data: StepsListResponseDto }> {
    const result = await this.stepsService.findAll(processId);
    return { data: result };
  }

  @Get(':stepId')
  @ApiOperation({ summary: 'Get a specific step' })
  @ApiParam({ name: 'processId', description: 'Process ID' })
  @ApiParam({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({ status: 200, description: 'Step retrieved successfully', type: StepResponseDto })
  @ApiResponse({ status: 404, description: 'Step not found' })
  async findOne(
    @Param('processId') processId: string,
    @Param('stepId') stepId: string,
  ): Promise<{ data: StepResponseDto }> {
    const step = await this.stepsService.findOne(processId, stepId);
    return { data: step };
  }

  @Put(':stepId')
  @Roles('ADMIN', 'MANAGER', 'EDITOR')
  @ApiOperation({ summary: 'Update a step' })
  @ApiParam({ name: 'processId', description: 'Process ID' })
  @ApiParam({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({ status: 200, description: 'Step updated successfully', type: StepResponseDto })
  @ApiResponse({ status: 404, description: 'Step not found' })
  async update(
    @Param('processId') processId: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateStepDto,
    @Request() req?: { user?: { id: string } },
  ): Promise<{ data: StepResponseDto }> {
    const userId = req?.user?.id || 'cc2ed391-2f1c-4ffb-83f5-bb4218c61ad3';
    const step = await this.stepsService.update(processId, stepId, dto, userId);
    return { data: step };
  }

  @Delete(':stepId')
  // @Roles('ADMIN', 'MANAGER')  // MVP: disabled
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a step' })
  @ApiParam({ name: 'processId', description: 'Process ID' })
  @ApiParam({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({ status: 204, description: 'Step deleted successfully' })
  @ApiResponse({ status: 404, description: 'Step not found' })
  async remove(
    @Param('processId') processId: string,
    @Param('stepId') stepId: string,
    @Request() req?: { user?: { id: string } },
  ): Promise<void> {
    const userId = req?.user?.id || 'cc2ed391-2f1c-4ffb-83f5-bb4218c61ad3';
    await this.stepsService.remove(processId, stepId, userId);
  }

  @Patch('reorder')
  // @Roles('ADMIN', 'MANAGER', 'EDITOR')  // MVP: disabled
  @ApiOperation({ summary: 'Reorder steps (atomic operation)' })
  @ApiParam({ name: 'processId', description: 'Process ID' })
  @ApiResponse({ status: 200, description: 'Steps reordered successfully', type: StepsListResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid step IDs or count mismatch' })
  async reorder(
    @Param('processId') processId: string,
    @Body() dto: ReorderStepsDto,
    @Request() req?: { user?: { id: string } },
  ): Promise<{ data: StepsListResponseDto }> {
    const userId = req?.user?.id || 'cc2ed391-2f1c-4ffb-83f5-bb4218c61ad3';
    const result = await this.stepsService.reorder(processId, dto, userId);
    return { data: result };
  }
}

  // Step Documents endpoints
  @Post(':stepId/documents')
  @ApiOperation({ summary: 'Link a document to a step' })
  @ApiParam({ name: 'processId', description: 'Process ID' })
  @ApiParam({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({ status: 201, description: 'Document linked successfully' })
  async addDocument(
    @Param('processId') processId: string,
    @Param('stepId') stepId: string,
    @Body() dto: { documentId: string; label?: string },
  ): Promise<{ data: any }> {
    const result = await this.stepsService.addDocument(stepId, dto.documentId, dto.label);
    return { data: result };
  }

  @Get(':stepId/documents')
  @ApiOperation({ summary: 'Get documents linked to a step' })
  @ApiParam({ name: 'processId', description: 'Process ID' })
  @ApiParam({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  async getDocuments(
    @Param('processId') processId: string,
    @Param('stepId') stepId: string,
  ): Promise<{ data: any[] }> {
    const result = await this.stepsService.getDocuments(stepId);
    return { data: result };
  }

  @Delete(':stepId/documents/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlink a document from a step' })
  @ApiParam({ name: 'processId', description: 'Process ID' })
  @ApiParam({ name: 'stepId', description: 'Step ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 204, description: 'Document unlinked successfully' })
  async removeDocument(
    @Param('processId') processId: string,
    @Param('stepId') stepId: string,
    @Param('documentId') documentId: string,
  ): Promise<void> {
    await this.stepsService.removeDocument(stepId, documentId);
  }
}
