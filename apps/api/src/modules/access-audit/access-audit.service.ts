import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AccessAuditEntry {
  id: string;
  userId: string;
  userName: string;
  processId: string;
  processTitle: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface AccessAuditQuery {
  userId?: string;
  processId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AccessAuditService {
  private readonly logger = new Logger(AccessAuditService.name);

  async logAccess(
    userId: string,
    processId: string,
    action: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        entityType: 'ProcessAccess',
        entityId: processId,
        operation: 'CREATE',
        userId,
        changes: {
          action,
          ...details,
        },
        ipAddress,
        userAgent,
      },
    });

    this.logger.debug(`Access logged: ${userId} ${action} ${processId}`);
  }

  async queryAccessLogs(query: AccessAuditQuery): Promise<{ data: AccessAuditEntry[]; total: number }> {
    const { userId, processId, action, startDate, endDate, limit = 50, offset = 0 } = query;

    const where: any = {
      entityType: 'ProcessAccess',
    };

    if (userId) where.userId = userId;
    if (processId) where.entityId = processId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Get process titles
    const processIds = [...new Set(logs.map(l => l.entityId))];
    const processes = await prisma.process.findMany({
      where: { id: { in: processIds } },
      select: { id: true, title: true },
    });
    const processMap = new Map(processes.map(p => [p.id, p.title]));

    const entries: AccessAuditEntry[] = logs.map(l => ({
      id: l.id,
      userId: l.userId,
      userName: l.user.name,
      processId: l.entityId,
      processTitle: processMap.get(l.entityId) || 'Unknown',
      action: (l.changes as any)?.action || l.operation,
      details: l.changes as Record<string, any>,
      ipAddress: l.ipAddress || undefined,
      userAgent: l.userAgent || undefined,
      timestamp: l.createdAt,
    }));

    return { data: entries, total };
  }

  async getAccessSummary(processId: string): Promise<{
    totalAccesses: number;
    uniqueUsers: number;
    lastAccess?: Date;
    topUsers: { userId: string; userName: string; count: number }[];
  }> {
    const logs = await prisma.auditLog.findMany({
      where: { entityType: 'ProcessAccess', entityId: processId },
      include: { user: { select: { id: true, name: true } } },
    });

    const userCounts = new Map<string, { name: string; count: number }>();
    for (const log of logs) {
      const existing = userCounts.get(log.userId) || { name: log.user.name, count: 0 };
      existing.count++;
      userCounts.set(log.userId, existing);
    }

    const topUsers = Array.from(userCounts.entries())
      .map(([userId, { name, count }]) => ({ userId, userName: name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalAccesses: logs.length,
      uniqueUsers: userCounts.size,
      lastAccess: logs.length > 0 ? logs[0].createdAt : undefined,
      topUsers,
    };
  }

  async getUserAccessHistory(userId: string, limit: number = 50): Promise<AccessAuditEntry[]> {
    const result = await this.queryAccessLogs({ userId, limit });
    return result.data;
  }
}
