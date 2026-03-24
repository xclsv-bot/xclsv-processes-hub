import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ToolsService } from './tools.service';
import { CreateToolDto, ToolResponseDto } from './dto';

@ApiTags('Tools')
@Controller('tools')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new tool' })
  @ApiResponse({ status: 201, description: 'Tool created successfully', type: ToolResponseDto })
  @ApiResponse({ status: 409, description: 'Tool already exists' })
  async create(@Body() dto: CreateToolDto): Promise<{ data: ToolResponseDto }> {
    const tool = await this.toolsService.create(dto);
    return { data: tool };
  }

  @Get()
  @ApiOperation({ summary: 'Get all tools' })
  @ApiResponse({ status: 200, description: 'Tools retrieved successfully', type: [ToolResponseDto] })
  async findAll(): Promise<{ data: ToolResponseDto[] }> {
    const tools = await this.toolsService.findAll();
    return { data: tools };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tool by ID' })
  @ApiResponse({ status: 200, description: 'Tool retrieved successfully', type: ToolResponseDto })
  @ApiResponse({ status: 404, description: 'Tool not found' })
  async findOne(@Param('id') id: string): Promise<{ data: ToolResponseDto }> {
    const tool = await this.toolsService.findOne(id);
    return { data: tool };
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a tool' })
  @ApiResponse({ status: 200, description: 'Tool updated successfully', type: ToolResponseDto })
  @ApiResponse({ status: 404, description: 'Tool not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateToolDto>,
  ): Promise<{ data: ToolResponseDto }> {
    const tool = await this.toolsService.update(id, dto);
    return { data: tool };
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tool' })
  @ApiResponse({ status: 204, description: 'Tool deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tool not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.toolsService.remove(id);
  }

  @Post('seed')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Seed default XCLSV tools' })
  @ApiResponse({ status: 201, description: 'Tools seeded successfully', type: [ToolResponseDto] })
  async seed(): Promise<{ data: ToolResponseDto[]; message: string }> {
    const tools = await this.toolsService.seed();
    return { data: tools, message: `Seeded ${tools.length} tools` };
  }
}
