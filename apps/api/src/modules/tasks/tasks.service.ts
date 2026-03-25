import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, TaskStatus } from '@prisma/client';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';

const prisma = new PrismaClient();

@Injectable()
export class TasksService {
  async create(dto: CreateTaskDto, createdById: string) {
    return prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        createdById,
        priority: dto.priority || 'MEDIUM',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        processId: dto.processId,
        stepId: dto.stepId,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        process: { select: { id: true, title: true, slug: true } },
        step: { select: { id: true, title: true } },
      },
    });
  }

  async findAll(filters?: {
    assigneeId?: string;
    createdById?: string;
    status?: TaskStatus;
    processId?: string;
  }) {
    return prisma.task.findMany({
      where: {
        ...(filters?.assigneeId && { assigneeId: filters.assigneeId }),
        ...(filters?.createdById && { createdById: filters.createdById }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.processId && { processId: filters.processId }),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        process: { select: { id: true, title: true, slug: true } },
        step: { select: { id: true, title: true } },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findMyTasks(userId: string) {
    return prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { not: 'CANCELLED' },
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        process: { select: { id: true, title: true, slug: true } },
        step: { select: { id: true, title: true } },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        process: { select: { id: true, title: true, slug: true } },
        step: { select: { id: true, title: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(id: string, dto: UpdateTaskDto, userId: string) {
    const task = await prisma.task.findUnique({ where: { id } });
    
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Only assignee or creator can update
    if (task.assigneeId !== userId && task.createdById !== userId) {
      // Check if user is admin
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'ADMIN') {
        throw new ForbiddenException('Not authorized to update this task');
      }
    }

    const updateData: any = { ...dto };
    
    // Set completedAt when marking as completed
    if (dto.status === 'COMPLETED' && task.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
    }
    
    // Clear completedAt if moving back from completed
    if (dto.status && dto.status !== 'COMPLETED' && task.status === 'COMPLETED') {
      updateData.completedAt = null;
    }

    if (dto.dueDate) {
      updateData.dueDate = new Date(dto.dueDate);
    }

    return prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        process: { select: { id: true, title: true, slug: true } },
        step: { select: { id: true, title: true } },
      },
    });
  }

  async delete(id: string, userId: string) {
    const task = await prisma.task.findUnique({ where: { id } });
    
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Only creator or admin can delete
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (task.createdById !== userId && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Not authorized to delete this task');
    }

    await prisma.task.delete({ where: { id } });
    return { success: true };
  }

  async getTaskStats(userId?: string) {
    const where = userId ? { assigneeId: userId } : {};
    
    const [pending, inProgress, completed, overdue] = await Promise.all([
      prisma.task.count({ where: { ...where, status: 'PENDING' } }),
      prisma.task.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.task.count({
        where: {
          ...where,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    return { pending, inProgress, completed, overdue, total: pending + inProgress + completed };
  }
}
