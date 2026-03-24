import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@xclsv/database';

export interface UsageRecord {
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  feature: string;
  cost?: number;
}

// Approximate costs per 1K tokens (as of 2024)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
  'text-embedding-ada-002': { input: 0.0001, output: 0 },
};

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  async trackUsage(record: UsageRecord): Promise<void> {
    const costs = MODEL_COSTS[record.model] || { input: 0, output: 0 };
    const cost = 
      (record.inputTokens / 1000) * costs.input +
      (record.outputTokens / 1000) * costs.output;

    // Store in audit log for now (could be separate table)
    await prisma.auditLog.create({
      data: {
        userId: record.userId,
        operation: 'AI_USAGE',
        entityType: 'ai',
        entityId: record.feature,
        changes: {
          model: record.model,
          inputTokens: record.inputTokens,
          outputTokens: record.outputTokens,
          cost: cost.toFixed(6),
          feature: record.feature,
        },
      },
    });

    this.logger.log(
      `AI usage: ${record.feature} - ${record.inputTokens}/${record.outputTokens} tokens ($${cost.toFixed(4)})`
    );
  }

  async getUserUsage(userId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      userId,
      operation: 'AI_USAGE',
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const records = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const summary = records.reduce(
      (acc: { totalInputTokens: number; totalOutputTokens: number; totalCost: number; requestCount: number }, record) => {
        const changes = record.changes as any;
        acc.totalInputTokens += changes.inputTokens || 0;
        acc.totalOutputTokens += changes.outputTokens || 0;
        acc.totalCost += parseFloat(changes.cost || 0);
        acc.requestCount += 1;
        return acc;
      },
      { totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, requestCount: 0 }
    );

    return {
      summary,
      records: records.slice(0, 100), // Last 100 records
    };
  }

  async getSystemUsage(startDate?: Date, endDate?: Date) {
    const where: any = {
      operation: 'AI_USAGE',
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const records = await prisma.auditLog.findMany({ where });

    const byUser = new Map<string, { tokens: number; cost: number; requests: number }>();
    const byFeature = new Map<string, { tokens: number; cost: number; requests: number }>();

    for (const record of records) {
      const changes = record.changes as any;
      const tokens = (changes.inputTokens || 0) + (changes.outputTokens || 0);
      const cost = parseFloat(changes.cost || 0);

      // By user
      const userStats = byUser.get(record.userId) || { tokens: 0, cost: 0, requests: 0 };
      userStats.tokens += tokens;
      userStats.cost += cost;
      userStats.requests += 1;
      byUser.set(record.userId, userStats);

      // By feature
      const feature = changes.feature || 'unknown';
      const featureStats = byFeature.get(feature) || { tokens: 0, cost: 0, requests: 0 };
      featureStats.tokens += tokens;
      featureStats.cost += cost;
      featureStats.requests += 1;
      byFeature.set(feature, featureStats);
    }

    return {
      totalRequests: records.length,
      byUser: Object.fromEntries(byUser),
      byFeature: Object.fromEntries(byFeature),
    };
  }
}
