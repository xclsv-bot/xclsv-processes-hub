import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { prisma } from '@xclsv/database';

export interface VerificationResult {
  processId: string;
  verifiedAt: Date;
  verifiedById: string;
  notes?: string;
  nextDueDate: Date;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  async verify(processId: string, userId: string, notes?: string): Promise<VerificationResult> {
    const process = await prisma.process.findUnique({
      where: { id: processId },
    });

    if (!process) {
      throw new NotFoundException('Process not found');
    }

    // Calculate next verification date
    const cadenceDays = process.verificationCadenceDays || 90;
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + cadenceDays);

    // Update process
    await prisma.process.update({
      where: { id: processId },
      data: {
        verificationStatus: 'VERIFIED',
        lastVerifiedAt: new Date(),
        verificationDueAt: nextDueDate,
      },
    });

    // Log verification
    await prisma.auditLog.create({
      data: {
        userId,
        operation: 'VERIFY',
        entityType: 'Process',
        entityId: processId,
        changes: {
          notes,
          verifiedAt: new Date().toISOString(),
          nextDueDate: nextDueDate.toISOString(),
        },
      },
    });

    this.logger.log(`Process ${processId} verified by ${userId}`);

    return {
      processId,
      verifiedAt: new Date(),
      verifiedById: userId,
      notes,
      nextDueDate,
    };
  }

  async setVerificationCadence(processId: string, cadenceDays: number, userId: string) {
    const process = await prisma.process.findUnique({
      where: { id: processId },
    });

    if (!process) {
      throw new NotFoundException('Process not found');
    }

    // Calculate new due date based on last verification
    const lastVerified = process.lastVerifiedAt || new Date();
    const nextDueDate = new Date(lastVerified);
    nextDueDate.setDate(nextDueDate.getDate() + cadenceDays);

    const updated = await prisma.process.update({
      where: { id: processId },
      data: {
        verificationCadenceDays: cadenceDays,
        verificationDueAt: nextDueDate,
      },
    });

    this.logger.log(`Verification cadence set to ${cadenceDays} days for ${processId}`);

    return updated;
  }

  async getOverdueProcesses(limit: number = 50) {
    const now = new Date();

    return prisma.process.findMany({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
        verificationDueAt: { lt: now },
        verificationStatus: { not: 'VERIFIED' },
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { verificationDueAt: 'asc' },
      take: limit,
    });
  }

  async getUpcomingVerifications(days: number = 30, limit: number = 50) {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return prisma.process.findMany({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
        verificationDueAt: {
          gte: now,
          lte: future,
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { verificationDueAt: 'asc' },
      take: limit,
    });
  }

  async markNeedsReview(processId: string, userId: string, reason: string) {
    await prisma.process.update({
      where: { id: processId },
      data: {
        verificationStatus: 'NEEDS_REVIEW',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        operation: 'MARK_NEEDS_REVIEW',
        entityType: 'Process',
        entityId: processId,
        changes: { reason },
      },
    });

    this.logger.log(`Process ${processId} marked as needs review`);
  }

  async getVerificationHistory(processId: string) {
    return prisma.auditLog.findMany({
      where: {
        entityType: 'Process',
        entityId: processId,
        operation: { in: ['VERIFY', 'MARK_NEEDS_REVIEW'] },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
