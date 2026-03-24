import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type WorkflowStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type WorkflowType = 'PUBLISH' | 'ARCHIVE' | 'DELETE' | 'MAJOR_UPDATE';

export interface ApprovalRequest {
  id: string;
  processId: string;
  processTitle: string;
  type: WorkflowType;
  requesterId: string;
  requesterName: string;
  approverId?: string;
  approverName?: string;
  status: WorkflowStatus;
  notes?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

// In-memory store for approval requests (use DB in production)
const approvalRequests = new Map<string, ApprovalRequest>();

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  async createApprovalRequest(
    processId: string,
    type: WorkflowType,
    requesterId: string,
    notes?: string,
  ): Promise<ApprovalRequest> {
    const process = await prisma.process.findUnique({
      where: { id: processId },
      include: { owner: { select: { id: true, name: true } } },
    });

    if (!process) {
      throw new NotFoundException('Process not found');
    }

    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      select: { name: true },
    });

    const request: ApprovalRequest = {
      id: `apr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      processId,
      processTitle: process.title,
      type,
      requesterId,
      requesterName: requester?.name || 'Unknown',
      status: 'PENDING',
      notes,
      createdAt: new Date(),
    };

    approvalRequests.set(request.id, request);

    this.logger.log(`Approval request created: ${request.id} for ${processId}`);
    return request;
  }

  async approve(requestId: string, approverId: string, notes?: string): Promise<ApprovalRequest> {
    const request = approvalRequests.get(requestId);
    
    if (!request) {
      throw new NotFoundException('Approval request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request is no longer pending');
    }

    const approver = await prisma.user.findUnique({
      where: { id: approverId },
      select: { name: true },
    });

    request.status = 'APPROVED';
    request.approverId = approverId;
    request.approverName = approver?.name || 'Unknown';
    request.resolvedAt = new Date();
    if (notes) request.notes = notes;

    // Execute the approved action
    await this.executeAction(request);

    this.logger.log(`Approval request ${requestId} approved by ${approverId}`);
    return request;
  }

  async reject(requestId: string, approverId: string, reason: string): Promise<ApprovalRequest> {
    const request = approvalRequests.get(requestId);
    
    if (!request) {
      throw new NotFoundException('Approval request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request is no longer pending');
    }

    const approver = await prisma.user.findUnique({
      where: { id: approverId },
      select: { name: true },
    });

    request.status = 'REJECTED';
    request.approverId = approverId;
    request.approverName = approver?.name || 'Unknown';
    request.notes = reason;
    request.resolvedAt = new Date();

    this.logger.log(`Approval request ${requestId} rejected by ${approverId}`);
    return request;
  }

  async cancel(requestId: string, requesterId: string): Promise<void> {
    const request = approvalRequests.get(requestId);
    
    if (!request) {
      throw new NotFoundException('Approval request not found');
    }

    if (request.requesterId !== requesterId) {
      throw new BadRequestException('Only the requester can cancel');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request is no longer pending');
    }

    request.status = 'CANCELLED';
    request.resolvedAt = new Date();

    this.logger.log(`Approval request ${requestId} cancelled`);
  }

  async getPendingRequests(approverId?: string): Promise<ApprovalRequest[]> {
    const pending = Array.from(approvalRequests.values())
      .filter(r => r.status === 'PENDING')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return pending;
  }

  async getMyRequests(requesterId: string): Promise<ApprovalRequest[]> {
    return Array.from(approvalRequests.values())
      .filter(r => r.requesterId === requesterId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getRequest(requestId: string): Promise<ApprovalRequest | undefined> {
    return approvalRequests.get(requestId);
  }

  private async executeAction(request: ApprovalRequest): Promise<void> {
    switch (request.type) {
      case 'PUBLISH':
        await prisma.process.update({
          where: { id: request.processId },
          data: { status: 'PUBLISHED', publishedAt: new Date() },
        });
        break;
      case 'ARCHIVE':
        await prisma.process.update({
          where: { id: request.processId },
          data: { status: 'ARCHIVED' },
        });
        break;
      case 'DELETE':
        await prisma.process.update({
          where: { id: request.processId },
          data: { deletedAt: new Date() },
        });
        break;
      // MAJOR_UPDATE is just tracking, no automatic action
    }
  }
}
