import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@xclsv/database';

export interface DashboardStats {
  totalProcesses: number;
  publishedProcesses: number;
  draftProcesses: number;
  myProcesses: number;
  recentActivity: ActivityItem[];
  processesByArea: { area: string; count: number }[];
  upcomingVerifications: VerificationItem[];
}

export interface ActivityItem {
  id: string;
  type: 'created' | 'updated' | 'published' | 'commented';
  processId: string;
  processTitle: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface VerificationItem {
  id: string;
  title: string;
  dueDate: Date;
  status: string;
  owner: { id: string; name: string };
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  async getDashboard(userId: string): Promise<DashboardStats> {
    const [
      totalProcesses,
      publishedProcesses,
      draftProcesses,
      myProcesses,
      processesByArea,
      recentActivity,
      upcomingVerifications,
    ] = await Promise.all([
      prisma.process.count({ where: { deletedAt: null } }),
      prisma.process.count({ where: { deletedAt: null, status: 'PUBLISHED' } }),
      prisma.process.count({ where: { deletedAt: null, status: 'DRAFT' } }),
      prisma.process.count({ where: { deletedAt: null, ownerId: userId } }),
      this.getProcessesByArea(),
      this.getRecentActivity(10),
      this.getUpcomingVerifications(userId, 5),
    ]);

    return {
      totalProcesses,
      publishedProcesses,
      draftProcesses,
      myProcesses,
      processesByArea,
      recentActivity,
      upcomingVerifications,
    };
  }

  private async getProcessesByArea(): Promise<{ area: string; count: number }[]> {
    const results = await prisma.process.groupBy({
      by: ['area'],
      where: { deletedAt: null },
      _count: { id: true },
    });

    return results.map(r => ({
      area: r.area,
      count: r._count.id,
    }));
  }

  private async getRecentActivity(limit: number): Promise<ActivityItem[]> {
    const audits = await prisma.auditLog.findMany({
      where: {
        entityType: 'Process',
        operation: { in: ['CREATE', 'UPDATE', 'PUBLISH'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    const processIds = audits.map(a => a.entityId);
    const processes = await prisma.process.findMany({
      where: { id: { in: processIds } },
      select: { id: true, title: true },
    });
    const processMap = new Map(processes.map(p => [p.id, p.title]));

    return audits.map(a => ({
      id: a.id,
      type: a.operation.toLowerCase() as any,
      processId: a.entityId,
      processTitle: processMap.get(a.entityId) || 'Unknown',
      userId: a.userId,
      userName: a.user.name,
      timestamp: a.createdAt,
    }));
  }

  private async getUpcomingVerifications(userId: string, limit: number): Promise<VerificationItem[]> {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const processes = await prisma.process.findMany({
      where: {
        deletedAt: null,
        verificationDueAt: {
          gte: now,
          lte: thirtyDaysLater,
        },
        OR: [
          { ownerId: userId },
          { permissions: { some: { userId, canVerify: true } } },
        ],
      },
      orderBy: { verificationDueAt: 'asc' },
      take: limit,
      include: {
        owner: { select: { id: true, name: true } },
      },
    });

    return processes.map(p => ({
      id: p.id,
      title: p.title,
      dueDate: p.verificationDueAt!,
      status: p.verificationStatus,
      owner: p.owner,
    }));
  }

  async trackActivity(
    userId: string,
    processId: string,
    action: 'view' | 'edit' | 'search',
  ): Promise<void> {
    await prisma.userActivity.create({
      data: {
        userId,
        activityType: action.toUpperCase(),
        entityType: 'Process',
        entityId: processId,
      },
    });
  }

  async getMyRecentProcesses(userId: string, limit: number = 10) {
    // Get recently viewed/edited processes
    const activities = await prisma.userActivity.findMany({
      where: {
        userId,
        entityType: 'Process',
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 2, // Get more to dedupe
      distinct: ['entityId'],
    });

    const processIds = activities.map(a => a.entityId);
    
    const processes = await prisma.process.findMany({
      where: {
        id: { in: processIds },
        deletedAt: null,
      },
      include: {
        owner: { select: { id: true, name: true } },
      },
    });

    // Sort by activity order
    const processMap = new Map(processes.map(p => [p.id, p]));
    return processIds
      .map(id => processMap.get(id))
      .filter(Boolean)
      .slice(0, limit);
  }
}
