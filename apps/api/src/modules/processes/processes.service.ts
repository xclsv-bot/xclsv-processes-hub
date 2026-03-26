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
        exampleContent: dto.exampleContent,
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

  async findAll(query: PaginationQueryDto, filters?: { area?: string; status?: string; type?: string }) {
    const { limit = 20, offset = 0 } = query;

    const where: any = {
      deletedAt: null,
      // Default to showing only PROCESS type unless explicitly requesting DOCUMENT or ALL
      type: filters?.type === 'ALL' ? undefined : (filters?.type || 'PROCESS'),
    };

    // Remove type from where if it's undefined (ALL requested)
    if (where.type === undefined) {
      delete where.type;
    }

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

    // MVP: Allow any updates for now
    // TODO: Check if user is admin or owner
    // if (process.ownerId !== userId) {
    //   throw new ForbiddenException('You can only update your own processes');
    // }

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

  // Version History Methods
  async getVersionHistory(processId: string) {
    await this.findOne(processId); // Verify process exists

    const versions = await prisma.processVersion.findMany({
      where: { processId },
      orderBy: { version: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      data: versions.map(v => ({
        id: v.id,
        version: v.version,
        title: v.title,
        changeNotes: v.changeNotes,
        createdAt: v.createdAt,
        createdBy: v.createdBy,
      })),
      total: versions.length,
    };
  }

  async getVersion(processId: string, version: number) {
    await this.findOne(processId); // Verify process exists

    const versionData = await prisma.processVersion.findUnique({
      where: {
        processId_version: { processId, version },
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!versionData) {
      throw new NotFoundException(`Version ${version} not found for process ${processId}`);
    }

    return versionData;
  }

  async compareVersions(processId: string, v1: number, v2: number) {
    const [version1, version2] = await Promise.all([
      this.getVersion(processId, v1),
      this.getVersion(processId, v2),
    ]);

    // Simple diff - split content into lines and compare
    const lines1 = (version1.content || '').split('\n');
    const lines2 = (version2.content || '').split('\n');

    const diff = this.computeDiff(lines1, lines2);

    return {
      version1: {
        version: version1.version,
        title: version1.title,
        createdAt: version1.createdAt,
        createdBy: version1.createdBy,
        content: version1.content,
      },
      version2: {
        version: version2.version,
        title: version2.title,
        createdAt: version2.createdAt,
        createdBy: version2.createdBy,
        content: version2.content,
      },
      diff,
      summary: {
        linesAdded: diff.filter(d => d.type === 'added').length,
        linesRemoved: diff.filter(d => d.type === 'removed').length,
        linesUnchanged: diff.filter(d => d.type === 'unchanged').length,
      },
    };
  }

  async restoreVersion(processId: string, version: number, userId: string) {
    const process = await this.findOne(processId);
    const versionToRestore = await this.getVersion(processId, version);

    // Create a snapshot of current state before restoring
    await prisma.processVersion.create({
      data: {
        processId,
        version: process.currentVersion,
        title: process.title,
        content: process.content || '',
        createdById: userId,
        changeNotes: `Auto-saved before restoring to version ${version}`,
      },
    });

    // Restore the content from the old version
    const updated = await prisma.process.update({
      where: { id: processId },
      data: {
        title: versionToRestore.title,
        content: versionToRestore.content,
        currentVersion: process.currentVersion + 1,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create a version noting the restoration
    await prisma.processVersion.create({
      data: {
        processId,
        version: process.currentVersion + 1,
        title: versionToRestore.title,
        content: versionToRestore.content,
        createdById: userId,
        changeNotes: `Restored from version ${version}`,
      },
    });

    this.logger.log(`Process ${processId} restored to version ${version} by ${userId}`);
    return updated;
  }

  private computeDiff(lines1: string[], lines2: string[]): Array<{ type: 'added' | 'removed' | 'unchanged'; line: string }> {
    const diff: Array<{ type: 'added' | 'removed' | 'unchanged'; line: string }> = [];
    
    // Simple line-by-line diff (not a full LCS algorithm, but good enough for MVP)
    const set1 = new Set(lines1);
    const set2 = new Set(lines2);

    // Check lines in version 1
    for (const line of lines1) {
      if (set2.has(line)) {
        diff.push({ type: 'unchanged', line });
      } else {
        diff.push({ type: 'removed', line });
      }
    }

    // Check for new lines in version 2
    for (const line of lines2) {
      if (!set1.has(line)) {
        diff.push({ type: 'added', line });
      }
    }

    return diff;
  }
}
