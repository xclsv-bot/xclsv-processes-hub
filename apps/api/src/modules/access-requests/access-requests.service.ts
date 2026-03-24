import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface AccessRequest {
  id: string;
  processId: string;
  processTitle: string;
  requesterId: string;
  requesterName: string;
  requestedPermissions: string[];
  reason: string;
  status: AccessRequestStatus;
  reviewerId?: string;
  reviewerName?: string;
  reviewNote?: string;
  createdAt: Date;
  reviewedAt?: Date;
}

// In-memory store (use DB in production)
const accessRequests = new Map<string, AccessRequest>();

@Injectable()
export class AccessRequestsService {
  private readonly logger = new Logger(AccessRequestsService.name);

  async createRequest(
    processId: string,
    requesterId: string,
    permissions: string[],
    reason: string,
  ): Promise<AccessRequest> {
    const process = await prisma.process.findUnique({
      where: { id: processId },
      select: { title: true },
    });

    if (!process) throw new NotFoundException('Process not found');

    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      select: { name: true },
    });

    const request: AccessRequest = {
      id: `ar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      processId,
      processTitle: process.title,
      requesterId,
      requesterName: requester?.name || 'Unknown',
      requestedPermissions: permissions,
      reason,
      status: 'PENDING',
      createdAt: new Date(),
    };

    accessRequests.set(request.id, request);
    this.logger.log(`Access request created: ${request.id}`);
    return request;
  }

  async approveRequest(requestId: string, reviewerId: string, note?: string): Promise<AccessRequest> {
    const request = accessRequests.get(requestId);
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request already processed');

    const reviewer = await prisma.user.findUnique({
      where: { id: reviewerId },
      select: { name: true },
    });

    // Grant the permissions
    await prisma.processPermission.upsert({
      where: { processId_userId: { processId: request.processId, userId: request.requesterId } },
      create: {
        processId: request.processId,
        userId: request.requesterId,
        canView: request.requestedPermissions.includes('view'),
        canEdit: request.requestedPermissions.includes('edit'),
        canDelete: request.requestedPermissions.includes('delete'),
        canPublish: request.requestedPermissions.includes('publish'),
        canVerify: request.requestedPermissions.includes('verify'),
      },
      update: {
        canView: request.requestedPermissions.includes('view'),
        canEdit: request.requestedPermissions.includes('edit'),
        canDelete: request.requestedPermissions.includes('delete'),
        canPublish: request.requestedPermissions.includes('publish'),
        canVerify: request.requestedPermissions.includes('verify'),
      },
    });

    request.status = 'APPROVED';
    request.reviewerId = reviewerId;
    request.reviewerName = reviewer?.name || 'Unknown';
    request.reviewNote = note;
    request.reviewedAt = new Date();

    this.logger.log(`Access request ${requestId} approved by ${reviewerId}`);
    return request;
  }

  async rejectRequest(requestId: string, reviewerId: string, reason: string): Promise<AccessRequest> {
    const request = accessRequests.get(requestId);
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request already processed');

    const reviewer = await prisma.user.findUnique({
      where: { id: reviewerId },
      select: { name: true },
    });

    request.status = 'REJECTED';
    request.reviewerId = reviewerId;
    request.reviewerName = reviewer?.name || 'Unknown';
    request.reviewNote = reason;
    request.reviewedAt = new Date();

    this.logger.log(`Access request ${requestId} rejected by ${reviewerId}`);
    return request;
  }

  async cancelRequest(requestId: string, requesterId: string): Promise<void> {
    const request = accessRequests.get(requestId);
    if (!request) throw new NotFoundException('Request not found');
    if (request.requesterId !== requesterId) throw new BadRequestException('Not your request');
    if (request.status !== 'PENDING') throw new BadRequestException('Cannot cancel');

    request.status = 'CANCELLED';
    this.logger.log(`Access request ${requestId} cancelled`);
  }

  async getPendingRequests(processId?: string): Promise<AccessRequest[]> {
    return Array.from(accessRequests.values())
      .filter(r => r.status === 'PENDING' && (!processId || r.processId === processId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getMyRequests(requesterId: string): Promise<AccessRequest[]> {
    return Array.from(accessRequests.values())
      .filter(r => r.requesterId === requesterId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
