import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  UseGuards,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DiagramsService } from './diagrams.service';
import { DiagramExportService } from './diagram-export.service';

@ApiTags('Diagrams')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DiagramsController {
  constructor(
    private readonly diagramsService: DiagramsService,
    private readonly exportService: DiagramExportService,
  ) {}

  /**
   * WO-45: GET /api/v1/processes/:id/diagrams/numbered-flow
   * Returns Mermaid syntax for a simple numbered step flow
   */
  @Get('processes/:processId/diagrams/numbered-flow')
  @ApiOperation({ summary: 'Generate numbered step flow diagram (Mermaid)' })
  @ApiParam({ name: 'processId', description: 'Process ID' })
  @ApiResponse({ status: 200, description: 'Numbered flow diagram generated' })
  @ApiResponse({ status: 404, description: 'Process not found' })
  async getNumberedFlow(@Param('processId') processId: string) {
    const diagram = await this.diagramsService.generateNumberedFlow(processId);
    return { data: diagram };
  }

  /**
   * WO-46: GET /api/v1/processes/:id/diagrams/flowchart
   * Returns Mermaid syntax for a professional flowchart
   */
  @Get('processes/:processId/diagrams/flowchart')
  @ApiOperation({ summary: 'Generate professional flowchart diagram (Mermaid)' })
  @ApiParam({ name: 'processId', description: 'Process ID' })
  @ApiResponse({ status: 200, description: 'Flowchart diagram generated' })
  @ApiResponse({ status: 404, description: 'Process not found' })
  async getFlowchart(@Param('processId') processId: string) {
    const diagram = await this.diagramsService.generateFlowchart(processId);
    return { data: diagram };
  }

  /**
   * WO-46: GET /api/v1/process-areas/:area/diagrams/department-view
   * Returns Mermaid syntax for a department-wide process overview
   */
  @Get('process-areas/:area/diagrams/department-view')
  @ApiOperation({ summary: 'Generate department-wide process map (Mermaid)' })
  @ApiParam({ name: 'area', description: 'Process area (EVENTS, INFLUENCER, PARTNERS, etc.)' })
  @ApiResponse({ status: 200, description: 'Department view diagram generated' })
  async getDepartmentView(@Param('area') area: string) {
    const diagram = await this.diagramsService.generateDepartmentView(area.toUpperCase());
    return { data: diagram };
  }

  /**
   * WO-47: POST /api/v1/diagrams/export
   * Export Mermaid diagram to PNG or SVG
   */
  @Post('diagrams/export')
  @ApiOperation({ summary: 'Export Mermaid diagram to PNG or SVG' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        mermaidSyntax: { type: 'string', description: 'Mermaid diagram syntax' },
        format: { type: 'string', enum: ['png', 'svg'], default: 'png' },
        scale: { type: 'number', enum: [1, 2, 4], default: 2 },
        theme: { type: 'string', enum: ['default', 'dark', 'forest', 'neutral'], default: 'default' },
        processTitle: { type: 'string', description: 'Process title for metadata' },
      },
      required: ['mermaidSyntax'],
    },
  })
  @ApiResponse({ status: 200, description: 'Diagram exported successfully' })
  async exportDiagram(
    @Body() body: {
      mermaidSyntax: string;
      format?: 'png' | 'svg';
      scale?: number;
      theme?: 'default' | 'dark' | 'forest' | 'neutral';
      processTitle?: string;
    },
    @Res() res: Response,
  ) {
    const format = body.format || 'png';
    const result = await this.exportService.exportDiagram(
      body.mermaidSyntax,
      {
        format,
        scale: body.scale || 2,
        theme: body.theme || 'default',
      },
      { processTitle: body.processTitle }
    );

    const buffer = await this.exportService.getExportBuffer(result.filePath);
    const contentType = format === 'svg' ? 'image/svg+xml' : 'image/png';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': buffer.length,
      'X-Export-Metadata': JSON.stringify(result.metadata),
    });

    res.send(buffer);
  }

  /**
   * WO-47: POST /api/v1/processes/:id/diagrams/export
   * Export a process diagram directly
   */
  @Post('processes/:processId/diagrams/export')
  @ApiOperation({ summary: 'Export process diagram to PNG or SVG' })
  @ApiParam({ name: 'processId', description: 'Process ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['numbered-flow', 'flowchart'], default: 'numbered-flow' },
        format: { type: 'string', enum: ['png', 'svg'], default: 'png' },
        scale: { type: 'number', enum: [1, 2, 4], default: 2 },
        theme: { type: 'string', enum: ['default', 'dark', 'forest', 'neutral'], default: 'default' },
      },
    },
  })
  async exportProcessDiagram(
    @Param('processId') processId: string,
    @Body() body: {
      type?: 'numbered-flow' | 'flowchart';
      format?: 'png' | 'svg';
      scale?: number;
      theme?: 'default' | 'dark' | 'forest' | 'neutral';
    },
    @Res() res: Response,
  ) {
    // Generate the diagram
    const diagramType = body.type || 'numbered-flow';
    const diagram = diagramType === 'flowchart'
      ? await this.diagramsService.generateFlowchart(processId)
      : await this.diagramsService.generateNumberedFlow(processId);

    // Export it
    const format = body.format || 'png';
    const result = await this.exportService.exportDiagram(
      diagram.mermaidSyntax,
      {
        format,
        scale: body.scale || 2,
        theme: body.theme || 'default',
      },
      { processTitle: diagram.processTitle }
    );

    const buffer = await this.exportService.getExportBuffer(result.filePath);
    const contentType = format === 'svg' ? 'image/svg+xml' : 'image/png';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${diagram.processTitle.replace(/[^a-z0-9]/gi, '-')}-${diagramType}.${format}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }
}
