import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@/common/decorators';
import { ToolsService } from './tools.service';
import { CreateToolDto, ToolResponseDto } from './dto';

@ApiTags('Tools')
@Controller('tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post()
  @Public()  // MVP: Allow public creation
  @ApiOperation({ summary: 'Create a new tool' })
  @ApiResponse({ status: 201, description: 'Tool created successfully', type: ToolResponseDto })
  @ApiResponse({ status: 409, description: 'Tool already exists' })
  async create(@Body() dto: CreateToolDto): Promise<{ data: ToolResponseDto }> {
    const tool = await this.toolsService.create(dto);
    return { data: tool };
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all tools' })
  @ApiResponse({ status: 200, description: 'Tools retrieved successfully', type: [ToolResponseDto] })
  async findAll(): Promise<{ data: ToolResponseDto[] }> {
    const tools = await this.toolsService.findAll();
    return { data: tools };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a tool by ID' })
  @ApiResponse({ status: 200, description: 'Tool retrieved successfully', type: ToolResponseDto })
  @ApiResponse({ status: 404, description: 'Tool not found' })
  async findOne(@Param('id') id: string): Promise<{ data: ToolResponseDto }> {
    const tool = await this.toolsService.findOne(id);
    return { data: tool };
  }

  @Put(':id')
  @Public()  // MVP: Allow public updates
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
  @Public()  // MVP: Allow public deletes
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tool' })
  @ApiResponse({ status: 204, description: 'Tool deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tool not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.toolsService.remove(id);
  }

  @Post('seed')
  @Public()  // MVP: Allow public seeding
  @ApiOperation({ summary: 'Seed default XCLSV tools' })
  @ApiResponse({ status: 201, description: 'Tools seeded successfully', type: [ToolResponseDto] })
  async seed(): Promise<{ data: ToolResponseDto[]; message: string }> {
    const tools = await this.toolsService.seed();
    return { data: tools, message: `Seeded ${tools.length} tools` };
  }
}
