import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { prisma } from '@xclsv/database';
import { CreateStepDto, UpdateStepDto, ReorderStepsDto, StepResponseDto, StepsListResponseDto } from './dto';

@Injectable()
export class StepsService {
  private readonly logger = new Logger(StepsService.name);

  async create(processId: string, dto: CreateStepDto, userId: string): Promise<StepResponseDto> {
    // Verify process exists
    const process = await prisma.process.findUnique({
      where: { id: processId, deletedAt: null },
    });
    if (!process) {
      throw new NotFoundException(`Process ${processId} not found`);
    }

    // Get next sequence number
    const lastStep = await prisma.processStep.findFirst({
      where: { processId, deletedAt: null },
      orderBy: { sequence: 'desc' },
    });
    const nextSequence = (lastStep?.sequence ?? 0) + 1;

    // Create step with owners and tools in a transaction
    const step = await prisma.$transaction(async (tx) => {
      const newStep = await tx.processStep.create({
        data: {
          processId,
          sequence: nextSequence,
          title: dto.title,
          description: dto.description,
          metadata: dto.metadata,
        },
      });

      // Add owners if provided
      if (dto.ownerIds?.length) {
        await tx.stepOwner.createMany({
          data: dto.ownerIds.map((userId) => ({
            stepId: newStep.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }

      // Add tools if provided
      if (dto.toolIds?.length) {
        await tx.stepTool.createMany({
          data: dto.toolIds.map((toolId) => ({
            stepId: newStep.id,
            toolId,
          })),
          skipDuplicates: true,
        });
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          entityType: 'ProcessStep',
          entityId: newStep.id,
          operation: 'CREATE',
          userId,
          changes: { step: JSON.parse(JSON.stringify(newStep)), ownerIds: dto.ownerIds, toolIds: dto.toolIds },
        },
      });

      return newStep;
    });

    this.logger.log(`Created step ${step.id} for process ${processId}`);
    return this.findOne(processId, step.id);
  }

  async findAll(processId: string): Promise<StepsListResponseDto> {
    // Verify process exists
    const process = await prisma.process.findUnique({
      where: { id: processId, deletedAt: null },
    });
    if (!process) {
      throw new NotFoundException(`Process ${processId} not found`);
    }

    const steps = await prisma.processStep.findMany({
      where: { processId, deletedAt: null },
      orderBy: { sequence: 'asc' },
      include: {
        owners: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        tools: {
          include: {
            tool: {
              select: { id: true, name: true, slug: true, icon: true, color: true, url: true },
            },
          },
        },
      },
    });

    // Detect handoff points (where ownership changes)
    const handoffPoints = this.detectHandoffPoints(steps);

    // Mark steps as handoffs
    const stepsWithHandoff = steps.map((step) => ({
      id: step.id,
      processId: step.processId,
      sequence: step.sequence,
      title: step.title,
      description: step.description ?? undefined,
      isHandoff: handoffPoints.includes(step.id),
      owners: step.owners.map((o) => ({
        id: o.user.id,
        name: o.user.name,
        email: o.user.email ?? undefined,
        avatarUrl: o.user.avatarUrl ?? undefined,
      })),
      tools: step.tools.map((t) => ({
        id: t.tool.id,
        name: t.tool.name,
        slug: t.tool.slug,
        icon: t.tool.icon ?? undefined,
        color: t.tool.color ?? undefined,
        url: t.tool.url ?? undefined,
      })),
      metadata: step.metadata as Record<string, any> | undefined,
      createdAt: step.createdAt,
      updatedAt: step.updatedAt,
    }));

    return {
      steps: stepsWithHandoff,
      totalSteps: steps.length,
      handoffPoints,
    };
  }

  async findOne(processId: string, stepId: string): Promise<StepResponseDto> {
    const step = await prisma.processStep.findFirst({
      where: { id: stepId, processId, deletedAt: null },
      include: {
        owners: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        tools: {
          include: {
            tool: {
              select: { id: true, name: true, slug: true, icon: true, color: true, url: true },
            },
          },
        },
      },
    });

    if (!step) {
      throw new NotFoundException(`Step ${stepId} not found in process ${processId}`);
    }

    return {
      id: step.id,
      processId: step.processId,
      sequence: step.sequence,
      title: step.title,
      description: step.description ?? undefined,
      isHandoff: step.isHandoff,
      owners: step.owners.map((o) => ({
        id: o.user.id,
        name: o.user.name,
        email: o.user.email ?? undefined,
        avatarUrl: o.user.avatarUrl ?? undefined,
      })),
      tools: step.tools.map((t) => ({
        id: t.tool.id,
        name: t.tool.name,
        slug: t.tool.slug,
        icon: t.tool.icon ?? undefined,
        color: t.tool.color ?? undefined,
        url: t.tool.url ?? undefined,
      })),
      metadata: step.metadata as Record<string, any> | undefined,
      createdAt: step.createdAt,
      updatedAt: step.updatedAt,
    };
  }

  async update(processId: string, stepId: string, dto: UpdateStepDto, userId: string): Promise<StepResponseDto> {
    // Verify step exists
    const existing = await prisma.processStep.findFirst({
      where: { id: stepId, processId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(`Step ${stepId} not found in process ${processId}`);
    }

    await prisma.$transaction(async (tx) => {
      // Update step fields
      await tx.processStep.update({
        where: { id: stepId },
        data: {
          title: dto.title,
          description: dto.description,
          metadata: dto.metadata,
        },
      });

      // Replace owners if provided
      if (dto.ownerIds !== undefined) {
        await tx.stepOwner.deleteMany({ where: { stepId } });
        if (dto.ownerIds.length > 0) {
          await tx.stepOwner.createMany({
            data: dto.ownerIds.map((userId) => ({
              stepId,
              userId,
            })),
          });
        }
      }

      // Replace tools if provided
      if (dto.toolIds !== undefined) {
        await tx.stepTool.deleteMany({ where: { stepId } });
        if (dto.toolIds.length > 0) {
          await tx.stepTool.createMany({
            data: dto.toolIds.map((toolId) => ({
              stepId,
              toolId,
            })),
          });
        }
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          entityType: 'ProcessStep',
          entityId: stepId,
          operation: 'UPDATE',
          userId,
          changes: { before: JSON.parse(JSON.stringify(existing)), updates: JSON.parse(JSON.stringify(dto)) },
        },
      });
    });

    this.logger.log(`Updated step ${stepId}`);
    return this.findOne(processId, stepId);
  }

  async remove(processId: string, stepId: string, userId: string): Promise<void> {
    const step = await prisma.processStep.findFirst({
      where: { id: stepId, processId, deletedAt: null },
    });
    if (!step) {
      throw new NotFoundException(`Step ${stepId} not found in process ${processId}`);
    }

    await prisma.$transaction(async (tx) => {
      // Soft delete
      await tx.processStep.update({
        where: { id: stepId },
        data: { deletedAt: new Date() },
      });

      // Resequence remaining steps
      const remainingSteps = await tx.processStep.findMany({
        where: { processId, deletedAt: null },
        orderBy: { sequence: 'asc' },
      });

      for (let i = 0; i < remainingSteps.length; i++) {
        await tx.processStep.update({
          where: { id: remainingSteps[i].id },
          data: { sequence: i + 1 },
        });
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          entityType: 'ProcessStep',
          entityId: stepId,
          operation: 'DELETE',
          userId,
          changes: { deletedStep: JSON.parse(JSON.stringify(step)) },
        },
      });
    });

    this.logger.log(`Deleted step ${stepId}`);
  }

  async reorder(processId: string, dto: ReorderStepsDto, userId: string): Promise<StepsListResponseDto> {
    // Verify all steps belong to the process
    const steps = await prisma.processStep.findMany({
      where: { processId, deletedAt: null },
    });

    const existingIds = new Set(steps.map((s) => s.id));
    const providedIds = new Set(dto.stepIds);

    // Check all provided IDs exist
    for (const id of dto.stepIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Step ${id} not found in process ${processId}`);
      }
    }

    // Check all existing steps are accounted for
    if (dto.stepIds.length !== steps.length) {
      throw new BadRequestException(
        `Reorder must include all ${steps.length} steps, but got ${dto.stepIds.length}`
      );
    }

    await prisma.$transaction(async (tx) => {
      // Update sequence for each step
      for (let i = 0; i < dto.stepIds.length; i++) {
        await tx.processStep.update({
          where: { id: dto.stepIds[i] },
          data: { sequence: i + 1 },
        });
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          entityType: 'Process',
          entityId: processId,
          operation: 'UPDATE',
          userId,
          changes: { action: 'reorder_steps', newOrder: dto.stepIds },
        },
      });
    });

    this.logger.log(`Reordered steps for process ${processId}`);
    return this.findAll(processId);
  }

  private detectHandoffPoints(steps: any[]): string[] {
    const handoffPoints: string[] = [];

    for (let i = 1; i < steps.length; i++) {
      const prevOwnerIds = new Set(steps[i - 1].owners.map((o: any) => o.user.id));
      const currOwnerIds = new Set(steps[i].owners.map((o: any) => o.user.id));

      // Check if ownership changed (no overlap)
      const hasOverlap = [...prevOwnerIds].some((id) => currOwnerIds.has(id));
      
      if (prevOwnerIds.size > 0 && currOwnerIds.size > 0 && !hasOverlap) {
        handoffPoints.push(steps[i].id);
      }
    }

    return handoffPoints;
  }
}
