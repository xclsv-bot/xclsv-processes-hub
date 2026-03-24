import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type FlagType = 'OUTDATED' | 'INCORRECT' | 'UNCLEAR' | 'MISSING_INFO' | 'DUPLICATE' | 'OTHER';
export type FlagStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';

export interface ProcessFlag {
  id: string;
  processId: string;
  processTitle: string;
  type: FlagType;
  description: string;
  reporterId: string;
  reporterName: string;
  status: FlagStatus;
  resolution?: string;
  resolvedById?: string;
  resolvedByName?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

// In-memory store for flags (use DB in production)
const flags = new Map<string, ProcessFlag>();

@Injectable()
export class FlagsService {
  private readonly logger = new Logger(FlagsService.name);

  async createFlag(
    processId: string,
    type: FlagType,
    description: string,
    reporterId: string,
  ): Promise<ProcessFlag> {
    const process = await prisma.process.findUnique({
      where: { id: processId },
      select: { title: true },
    });

    if (!process) {
      throw new NotFoundException('Process not found');
    }

    const reporter = await prisma.user.findUnique({
      where: { id: reporterId },
      select: { name: true },
    });

    const flag: ProcessFlag = {
      id: `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      processId,
      processTitle: process.title,
      type,
      description,
      reporterId,
      reporterName: reporter?.name || 'Unknown',
      status: 'OPEN',
      createdAt: new Date(),
    };

    flags.set(flag.id, flag);

    this.logger.log(`Flag created: ${flag.id} for ${processId}`);
    return flag;
  }

  async resolveFlag(
    flagId: string,
    resolverId: string,
    resolution: string,
    dismiss: boolean = false,
  ): Promise<ProcessFlag> {
    const flag = flags.get(flagId);
    
    if (!flag) {
      throw new NotFoundException('Flag not found');
    }

    const resolver = await prisma.user.findUnique({
      where: { id: resolverId },
      select: { name: true },
    });

    flag.status = dismiss ? 'DISMISSED' : 'RESOLVED';
    flag.resolution = resolution;
    flag.resolvedById = resolverId;
    flag.resolvedByName = resolver?.name || 'Unknown';
    flag.resolvedAt = new Date();

    this.logger.log(`Flag ${flagId} ${flag.status.toLowerCase()}`);
    return flag;
  }

  async updateStatus(flagId: string, status: FlagStatus): Promise<ProcessFlag> {
    const flag = flags.get(flagId);
    
    if (!flag) {
      throw new NotFoundException('Flag not found');
    }

    flag.status = status;
    return flag;
  }

  async getFlagsForProcess(processId: string): Promise<ProcessFlag[]> {
    return Array.from(flags.values())
      .filter(f => f.processId === processId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getOpenFlags(limit: number = 50): Promise<ProcessFlag[]> {
    return Array.from(flags.values())
      .filter(f => f.status === 'OPEN' || f.status === 'IN_PROGRESS')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getMyFlags(reporterId: string): Promise<ProcessFlag[]> {
    return Array.from(flags.values())
      .filter(f => f.reporterId === reporterId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getFlagStats(): Promise<{
    total: number;
    byStatus: Record<FlagStatus, number>;
    byType: Record<FlagType, number>;
  }> {
    const allFlags = Array.from(flags.values());
    
    const byStatus = allFlags.reduce((acc, f) => {
      acc[f.status] = (acc[f.status] || 0) + 1;
      return acc;
    }, {} as Record<FlagStatus, number>);

    const byType = allFlags.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, {} as Record<FlagType, number>);

    return {
      total: allFlags.length,
      byStatus,
      byType,
    };
  }
}
