import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class VersionsService {
  private readonly logger = new Logger(VersionsService.name);

  async getVersions(processId: string) {
    const versions = await prisma.processVersion.findMany({
      where: { processId },
      orderBy: { version: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return versions;
  }

  async getVersion(processId: string, versionNumber: number) {
    const version = await prisma.processVersion.findFirst({
      where: {
        processId,
        version: versionNumber,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!version) {
      throw new NotFoundException(`Version ${versionNumber} not found`);
    }

    return version;
  }

  async createVersion(processId: string, userId: string, changeNotes?: string) {
    // Get current process
    const process = await prisma.process.findUnique({
      where: { id: processId },
    });

    if (!process) {
      throw new NotFoundException('Process not found');
    }

    // Create new version
    const version = await prisma.processVersion.create({
      data: {
        processId,
        version: process.currentVersion,
        title: process.title,
        content: process.content || '',
        changeNotes: changeNotes || 'Manual version save',
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Increment process version
    await prisma.process.update({
      where: { id: processId },
      data: { currentVersion: process.currentVersion + 1 },
    });

    this.logger.log(`Version ${version.version} created for process ${processId}`);
    return version;
  }

  async restoreVersion(processId: string, versionNumber: number, userId: string) {
    const version = await this.getVersion(processId, versionNumber);
    const process = await prisma.process.findUnique({
      where: { id: processId },
    });

    if (!process) {
      throw new NotFoundException('Process not found');
    }

    // Save current state as a version first
    await this.createVersion(processId, userId, `Before restoring to v${versionNumber}`);

    // Restore the process to the old version
    const updated = await prisma.process.update({
      where: { id: processId },
      data: {
        title: version.title,
        content: version.content,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    this.logger.log(`Process ${processId} restored to version ${versionNumber}`);
    return updated;
  }

  async compareVersions(processId: string, v1: number, v2: number) {
    const [version1, version2] = await Promise.all([
      this.getVersion(processId, v1),
      this.getVersion(processId, v2),
    ]);

    return {
      version1: {
        version: version1.version,
        title: version1.title,
        content: version1.content,
        createdAt: version1.createdAt,
        createdBy: version1.createdBy,
      },
      version2: {
        version: version2.version,
        title: version2.title,
        content: version2.content,
        createdAt: version2.createdAt,
        createdBy: version2.createdBy,
      },
      diff: {
        titleChanged: version1.title !== version2.title,
        contentChanged: version1.content !== version2.content,
      },
    };
  }
}
