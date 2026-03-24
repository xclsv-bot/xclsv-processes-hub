import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { prisma } from '@xclsv/database';

export interface PermissionGrant {
  userId: string;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canVerify: boolean;
}

@Injectable()
export class OwnershipService {
  private readonly logger = new Logger(OwnershipService.name);

  async transferOwnership(processId: string, newOwnerId: string, currentUserId: string) {
    const process = await prisma.process.findUnique({
      where: { id: processId },
    });

    if (!process) {
      throw new NotFoundException('Process not found');
    }

    if (process.ownerId !== currentUserId) {
      throw new ForbiddenException('Only the owner can transfer ownership');
    }

    // Verify new owner exists
    const newOwner = await prisma.user.findUnique({
      where: { id: newOwnerId },
    });

    if (!newOwner) {
      throw new NotFoundException('New owner not found');
    }

    // Transfer ownership
    const updated = await prisma.process.update({
      where: { id: processId },
      data: { ownerId: newOwnerId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    // Log the transfer
    await prisma.auditLog.create({
      data: {
        userId: currentUserId,
        operation: 'TRANSFER_OWNERSHIP',
        entityType: 'Process',
        entityId: processId,
        changes: {
          previousOwner: currentUserId,
          newOwner: newOwnerId,
        },
      },
    });

    this.logger.log(`Ownership transferred: ${processId} from ${currentUserId} to ${newOwnerId}`);
    return updated;
  }

  async grantPermissions(processId: string, grant: PermissionGrant, granterId: string) {
    const process = await prisma.process.findUnique({
      where: { id: processId },
    });

    if (!process) {
      throw new NotFoundException('Process not found');
    }

    if (process.ownerId !== granterId) {
      throw new ForbiddenException('Only the owner can grant permissions');
    }

    // Upsert permission
    const permission = await prisma.processPermission.upsert({
      where: {
        processId_userId: {
          processId,
          userId: grant.userId,
        },
      },
      create: {
        processId,
        userId: grant.userId,
        canEdit: grant.canEdit,
        canDelete: grant.canDelete,
        canPublish: grant.canPublish,
        canVerify: grant.canVerify,
      },
      update: {
        canEdit: grant.canEdit,
        canDelete: grant.canDelete,
        canPublish: grant.canPublish,
        canVerify: grant.canVerify,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Permissions granted on ${processId} to ${grant.userId}`);
    return permission;
  }

  async revokePermissions(processId: string, userId: string, revokerId: string) {
    const process = await prisma.process.findUnique({
      where: { id: processId },
    });

    if (!process) {
      throw new NotFoundException('Process not found');
    }

    if (process.ownerId !== revokerId) {
      throw new ForbiddenException('Only the owner can revoke permissions');
    }

    await prisma.processPermission.delete({
      where: {
        processId_userId: {
          processId,
          userId,
        },
      },
    });

    this.logger.log(`Permissions revoked on ${processId} from ${userId}`);
  }

  async getPermissions(processId: string) {
    const permissions = await prisma.processPermission.findMany({
      where: { processId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return permissions;
  }

  async checkPermission(
    processId: string,
    userId: string,
    permission: 'edit' | 'delete' | 'publish' | 'verify',
  ): Promise<boolean> {
    const process = await prisma.process.findUnique({
      where: { id: processId },
    });

    if (!process) return false;

    // Owner has all permissions
    if (process.ownerId === userId) return true;

    // Check specific permission
    const userPermission = await prisma.processPermission.findUnique({
      where: {
        processId_userId: {
          processId,
          userId,
        },
      },
    });

    if (!userPermission) return false;

    switch (permission) {
      case 'edit': return userPermission.canEdit;
      case 'delete': return userPermission.canDelete;
      case 'publish': return userPermission.canPublish;
      case 'verify': return userPermission.canVerify;
      default: return false;
    }
  }
}
