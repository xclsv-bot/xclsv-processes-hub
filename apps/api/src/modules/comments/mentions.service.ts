import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { prisma } from '@xclsv/database';

interface MentionInfo {
  userId: string;
  username: string;
  startIndex: number;
  endIndex: number;
}

@Injectable()
export class MentionsService {
  private readonly logger = new Logger(MentionsService.name);
  private readonly mentionRegex = /@(\w+)/g;

  /**
   * Parse @mentions from comment content
   */
  parseMentions(content: string): string[] {
    const matches = content.matchAll(this.mentionRegex);
    const usernames = new Set<string>();
    for (const match of matches) {
      usernames.add(match[1].toLowerCase());
    }
    return Array.from(usernames);
  }

  /**
   * Validate and resolve mentioned users
   * Returns only users who exist and have access to the process
   */
  async validateMentions(
    usernames: string[],
    processId: string
  ): Promise<Array<{ id: string; name: string }>> {
    if (usernames.length === 0) return [];

    // Find users by name (case-insensitive partial match)
    const users = await prisma.user.findMany({
      where: {
        OR: usernames.map((username) => ({
          name: { contains: username, mode: 'insensitive' as const },
        })),
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    // TODO: Add process permission check here
    // For now, allow mentioning any active user

    return users;
  }

  /**
   * Store mention relationships for a comment
   */
  async storeMentions(commentId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;

    await prisma.commentMention.createMany({
      data: userIds.map((userId) => ({
        commentId,
        mentionedUserId: userId,
      })),
      skipDuplicates: true,
    });

    this.logger.log(`Stored ${userIds.length} mentions for comment ${commentId}`);
  }

  /**
   * Update mentions when a comment is edited
   */
  async updateMentions(commentId: string, newUserIds: string[]): Promise<void> {
    // Delete existing mentions
    await prisma.commentMention.deleteMany({
      where: { commentId },
    });

    // Add new mentions
    await this.storeMentions(commentId, newUserIds);
  }

  /**
   * Get comments that mention the current user
   */
  async getMyMentions(
    userId: string,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<{ mentions: any[]; total: number }> {
    const { page = 1, pageSize = 20 } = options;

    const [mentions, total] = await Promise.all([
      prisma.commentMention.findMany({
        where: { mentionedUserId: userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          comment: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
              process: {
                select: { id: true, title: true },
              },
            },
          },
        },
      }),
      prisma.commentMention.count({
        where: { mentionedUserId: userId },
      }),
    ]);

    return {
      mentions: mentions.map((m) => ({
        id: m.id,
        commentId: m.commentId,
        comment: {
          id: m.comment.id,
          content: m.comment.deletedAt ? '[Comment deleted]' : m.comment.content,
          author: m.comment.user,
          processId: m.comment.process.id,
          processTitle: m.comment.process.title,
          createdAt: m.comment.createdAt,
        },
        createdAt: m.createdAt,
      })),
      total,
    };
  }
}
