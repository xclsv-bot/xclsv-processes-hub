import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, TaskStatus } from './dto/create-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Body() dto: CreateTaskDto, @Request() req: any) {
    const task = await this.tasksService.create(dto, req.user.id);
    return { data: task };
  }

  @Get()
  async findAll(
    @Query('assigneeId') assigneeId?: string,
    @Query('createdById') createdById?: string,
    @Query('status') status?: TaskStatus,
    @Query('processId') processId?: string,
  ) {
    const tasks = await this.tasksService.findAll({
      assigneeId,
      createdById,
      status,
      processId,
    });
    return { data: tasks };
  }

  @Get('my')
  async findMyTasks(@Request() req: any) {
    const tasks = await this.tasksService.findMyTasks(req.user.id);
    return { data: tasks };
  }

  @Get('stats')
  async getStats(@Query('userId') userId?: string) {
    const stats = await this.tasksService.getTaskStats(userId);
    return { data: stats };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const task = await this.tasksService.findOne(id);
    return { data: task };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Request() req: any,
  ) {
    const task = await this.tasksService.update(id, dto, req.user.id);
    return { data: task };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.delete(id, req.user.id);
  }
}
