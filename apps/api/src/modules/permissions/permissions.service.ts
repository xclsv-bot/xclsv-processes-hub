import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ProcessPermissionDetail {
  id: string;
  processId: string;
  userId: string;
  userName: string;
  userEmail: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canVerify: boolean;
  grantedAt: Date;
}

export interface PermissionGrant {
  userId: string;
  canView?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canPublish?: boolean;
  canVerify?: boolean;
}

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  async getProcessPermissions(processId: string): Promise<ProcessPermissionDetail[]> {
    const permissions = await prisma.processPermission.findMany({
      where: { processId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return permissions.map(p => ({
      id: p.id,
      processId: p.processId,
      userId: p.userId,
      userName: p.user.name,
      userEmail: p.user.email,
      canView: p.canView,
      canEdit: p.canEdit,
      canDelete: p.canDelete,
      canPublish: p.canPublish,
      canVerify: p.canVerify,
      grantedAt: p.createdAt,
    }));
  }

  async getUserPermissions(userId: string): Promise<{ processId: string; processTitle: string; permissions: string[] }[]> {
    const permissions = await prisma.processPermission.findMany({
      where: { userId },
      include: {
        process: { select: { id: true, title: true } },
      },
    });

    return permissions.map(p => ({
      processId: p.processId,
      processTitle: p.process.title,
      permissions: [
        p.canView && 'view',
        p.canEdit && 'edit',
        p.canDelete && 'delete',
        p.canPublish && 'publish',
        p.canVerify && 'verify',
      ].filter(Boolean) as string[],
    }));
  }

  async grantPermissions(processId: string, grants: PermissionGrant[], granterId: string): Promise<void> {
    const process = await prisma.process.findUnique({ where: { id: processId } });
    if (!process) throw new NotFoundException('Process not found');

    for (const grant of grants) {
      await prisma.processPermission.upsert({
        where: { processId_userId: { processId, userId: grant.userId } },
        create: {
          processId,
          userId: grant.userId,
          canView: grant.canView ?? true,
          canEdit: grant.canEdit ?? false,
          canDelete: grant.canDelete ?? false,
          canPublish: grant.canPublish ?? false,
          canVerify: grant.canVerify ?? false,
        },
        update: {
          canView: grant.canView,
          canEdit: grant.canEdit,
          canDelete: grant.canDelete,
          canPublish: grant.canPublish,
          canVerify: grant.canVerify,
        },
      });
    }
    this.logger.log(`Permissions granted on ${processId} by ${granterId}`);
  }

  async revokePermission(processId: string, userId: string): Promise<void> {
    await prisma.processPermission.deleteMany({ where: { processId, userId } });
    this.logger.log(`Permission revoked: ${userId} from ${processId}`);
  }

  async checkPermission(processId: string, userId: string, permission: 'view' | 'edit' | 'delete' | 'publish' | 'verify'): Promise<boolean> {
    const process = await prisma.process.findUnique({ where: { id: processId }, select: { ownerId: true } });
    if (process?.ownerId === userId) return true;

    const perm = await prisma.processPermission.findUnique({
      where: { processId_userId: { processId, userId } },
    });
    if (!perm) return false;

    switch (permission) {
      case 'view': return perm.canView;
      case 'edit': return perm.canEdit;
      case 'delete': return perm.canDelete;
      case 'publish': return perm.canPublish;
      case 'verify': return perm.canVerify;
      default: return false;
    }
  }
}
