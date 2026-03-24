import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { prisma } from '@xclsv/database';
import { CreateRelationDto, RelationResponseDto, RelationsListResponseDto } from './dto';

@Injectable()
export class RelationsService {
  private readonly logger = new Logger(RelationsService.name);

  async create(processId: string, dto: CreateRelationDto): Promise<RelationResponseDto> {
    // Verify the source process exists
    const fromProcess = await prisma.process.findUnique({
      where: { id: processId, deletedAt: null },
    });
    if (!fromProcess) {
      throw new NotFoundException(`Process ${processId} not found`);
    }

    // Verify the target process exists
    const toProcess = await prisma.process.findUnique({
      where: { id: dto.relatedProcessId, deletedAt: null },
    });
    if (!toProcess) {
      throw new NotFoundException(`Related process ${dto.relatedProcessId} not found`);
    }

    // Prevent self-linking
    if (processId === dto.relatedProcessId) {
      throw new BadRequestException('Cannot link a process to itself');
    }

    // Check if relation already exists
    const existing = await prisma.processRelation.findUnique({
      where: {
        fromProcessId_toProcessId: {
          fromProcessId: processId,
          toProcessId: dto.relatedProcessId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('Relation already exists');
    }

    const relation = await prisma.processRelation.create({
      data: {
        fromProcessId: processId,
        toProcessId: dto.relatedProcessId,
        relationType: dto.relationType || 'supports',
      },
      include: {
        toProcess: {
          select: {
            id: true,
            title: true,
            description: true,
            area: true,
            status: true,
            slug: true,
          },
        },
      },
    });

    this.logger.log(`Created relation ${relation.id}: ${processId} -> ${dto.relatedProcessId}`);

    return this.mapToResponse(relation);
  }

  async findAll(processId: string): Promise<RelationsListResponseDto> {
    // Verify process exists
    const process = await prisma.process.findUnique({
      where: { id: processId, deletedAt: null },
    });
    if (!process) {
      throw new NotFoundException(`Process ${processId} not found`);
    }

    // Get relations where this process is the source (outgoing)
    const outgoingRelations = await prisma.processRelation.findMany({
      where: { fromProcessId: processId },
      include: {
        toProcess: {
          select: {
            id: true,
            title: true,
            description: true,
            area: true,
            status: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get relations where this process is the target (incoming)
    const incomingRelations = await prisma.processRelation.findMany({
      where: { toProcessId: processId },
      include: {
        fromProcess: {
          select: {
            id: true,
            title: true,
            description: true,
            area: true,
            status: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Combine and deduplicate by related process ID
    const seenProcessIds = new Set<string>();
    const relations: RelationResponseDto[] = [];

    // Add outgoing relations
    for (const rel of outgoingRelations) {
      if (!seenProcessIds.has(rel.toProcessId)) {
        seenProcessIds.add(rel.toProcessId);
        relations.push(this.mapToResponse(rel));
      }
    }

    // Add incoming relations (mark them as such)
    for (const rel of incomingRelations) {
      if (!seenProcessIds.has(rel.fromProcessId)) {
        seenProcessIds.add(rel.fromProcessId);
        relations.push({
          id: rel.id,
          fromProcessId: rel.fromProcessId,
          toProcessId: rel.toProcessId,
          relationType: this.invertRelationType(rel.relationType),
          createdAt: rel.createdAt,
          relatedProcess: {
            id: rel.fromProcess.id,
            title: rel.fromProcess.title,
            description: rel.fromProcess.description ?? undefined,
            area: rel.fromProcess.area,
            status: rel.fromProcess.status,
            slug: rel.fromProcess.slug ?? undefined,
          },
        });
      }
    }

    return {
      relations,
      total: relations.length,
    };
  }

  async remove(processId: string, relationId: string): Promise<void> {
    // Find the relation
    const relation = await prisma.processRelation.findUnique({
      where: { id: relationId },
    });

    if (!relation) {
      throw new NotFoundException(`Relation ${relationId} not found`);
    }

    // Ensure the relation belongs to this process (either direction)
    if (relation.fromProcessId !== processId && relation.toProcessId !== processId) {
      throw new NotFoundException(`Relation ${relationId} not found for process ${processId}`);
    }

    await prisma.processRelation.delete({
      where: { id: relationId },
    });

    this.logger.log(`Deleted relation ${relationId}`);
  }

  private mapToResponse(relation: any): RelationResponseDto {
    return {
      id: relation.id,
      fromProcessId: relation.fromProcessId,
      toProcessId: relation.toProcessId,
      relationType: relation.relationType,
      createdAt: relation.createdAt,
      relatedProcess: {
        id: relation.toProcess.id,
        title: relation.toProcess.title,
        description: relation.toProcess.description ?? undefined,
        area: relation.toProcess.area,
        status: relation.toProcess.status,
        slug: relation.toProcess.slug ?? undefined,
      },
    };
  }

  private invertRelationType(type: string): string {
    // Invert the relationship type for incoming relations
    switch (type) {
      case 'parent':
        return 'child';
      case 'child':
        return 'parent';
      default:
        return type; // 'supports' and 'references' are symmetric
    }
  }
}
