import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { prisma } from '@xclsv/database';
import { CreateProcessDto, UpdateProcessDto, ProcessStatus } from './dto';
import { PaginationQueryDto, PaginatedResponseDto } from '@/common/dto/pagination.dto';

@Injectable()
export class ProcessesService {
  private readonly logger = new Logger(ProcessesService.name);

  async create(dto: CreateProcessDto, userId: string) {
    const slug = this.generateSlug(dto.title);

    // Check for duplicate slug
    const existing = await prisma.process.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('A process with this title already exists');
    }

    const process = await prisma.process.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        content: dto.content,
        area: dto.area,
        metadata: dto.metadata,
        ownerId: userId,
        status: 'DRAFT',
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    this.logger.log(`Process created: ${process.id} by ${userId}`);
    return process;
  }

  async findAll(query: PaginationQueryDto, filters?: { area?: string; status?: string }) {
    const { limit = 20, offset = 0 } = query;

    const where: any = {
      deletedAt: null,
    };

    if (filters?.area) {
      where.area = filters.area;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const [processes, total] = await Promise.all([
      prisma.process.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.process.count({ where }),
    ]);

    return {
      data: processes,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + processes.length < total,
      },
      links: {
        self: `/api/v1/processes?limit=${limit}&offset=${offset}`,
        next: offset + limit < total 
          ? `/api/v1/processes?limit=${limit}&offset=${offset + limit}` 
          : null,
        prev: offset > 0 
          ? `/api/v1/processes?limit=${limit}&offset=${Math.max(0, offset - limit)}` 
          : null,
      },
    };
  }

  async findOne(id: string) {
    const process = await prisma.process.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 5,
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!process || process.deletedAt) {
      throw new NotFoundException(`Process ${id} not found`);
    }

    return process;
  }

  async findBySlug(slug: string) {
    const process = await prisma.process.findUnique({
      where: { slug },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!process || process.deletedAt) {
      throw new NotFoundException(`Process not found`);
    }

    return process;
  }

  async update(id: string, dto: UpdateProcessDto, userId: string) {
    const process = await this.findOne(id);

    // Check ownership (admins can update any)
    if (process.ownerId !== userId) {
      // TODO: Check if user is admin
      throw new ForbiddenException('You can only update your own processes');
    }

    // If title changed, update slug
    let slug = process.slug;
    if (dto.title && dto.title !== process.title) {
      slug = this.generateSlug(dto.title);
      const existing = await prisma.process.findUnique({ where: { slug } });
      if (existing && existing.id !== id) {
        throw new ConflictException('A process with this title already exists');
      }
    }

    const updated = await prisma.process.update({
      where: { id },
      data: {
        ...dto,
        slug,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    this.logger.log(`Process updated: ${id} by ${userId}`);
    return updated;
  }

  async publish(id: string, userId: string) {
    const process = await this.findOne(id);

    if (process.status === 'PUBLISHED') {
      return process;
    }

    // Create a version snapshot
    await prisma.processVersion.create({
      data: {
        processId: id,
        version: process.currentVersion,
        title: process.title,
        content: process.content || '',
        createdById: userId,
        changeNotes: 'Published version',
      },
    });

    const updated = await prisma.process.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        currentVersion: process.currentVersion + 1,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    this.logger.log(`Process published: ${id} by ${userId}`);
    return updated;
  }

  async archive(id: string, userId: string) {
    await this.findOne(id);

    const updated = await prisma.process.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
      },
    });

    this.logger.log(`Process archived: ${id} by ${userId}`);
    return updated;
  }

  async delete(id: string, userId: string) {
    await this.findOne(id);

    // Soft delete
    await prisma.process.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.log(`Process deleted: ${id} by ${userId}`);
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }
}
