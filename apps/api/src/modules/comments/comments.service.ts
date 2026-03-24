import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { prisma } from '@xclsv/database';
import { CreateCommentDto, UpdateCommentDto, CommentResponseDto, CommentsListResponseDto } from './dto';
import { MentionsService } from './mentions.service';
import { CommentEditHistoryService } from './comment-edit-history.service';

type SortOrder = 'newest' | 'oldest' | 'most_replies';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly mentionsService: MentionsService,
    private readonly editHistoryService: CommentEditHistoryService,
  ) {}

  /**
   * Create a new comment on a process
   */
  async create(
    processId: string,
    dto: CreateCommentDto,
    userId: string
  ): Promise<CommentResponseDto> {
    // Verify process exists
    const process = await prisma.process.findUnique({
      where: { id: processId, deletedAt: null },
    });
    if (!process) {
      throw new NotFoundException(`Process ${processId} not found`);
    }

    // If replying, verify parent comment exists and belongs to same process
    if (dto.parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: dto.parentId, processId, deletedAt: null },
      });
      if (!parent) {
        throw new BadRequestException(`Parent comment ${dto.parentId} not found`);
      }
    }

    const comment = await prisma.comment.create({
      data: {
        processId,
        userId,
        content: dto.content,
        parentId: dto.parentId,
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    // Process mentions
    const usernames = this.mentionsService.parseMentions(dto.content);
    if (usernames.length > 0) {
      const validUsers = await this.mentionsService.validateMentions(usernames, processId);
      await this.mentionsService.storeMentions(comment.id, validUsers.map((u) => u.id));
    }

    this.logger.log(`Created comment ${comment.id} on process ${processId}`);

    return this.toDto(comment);
  }

  /**
   * List comments for a process with pagination
   */
  async findAll(
    processId: string,
    options: {
      page?: number;
      pageSize?: number;
      sort?: SortOrder;
      includeReplies?: boolean;
    } = {}
  ): Promise<CommentsListResponseDto> {
    const { page = 1, pageSize = 20, sort = 'newest', includeReplies = true } = options;

    // Verify process exists
    const process = await prisma.process.findUnique({
      where: { id: processId, deletedAt: null },
    });
    if (!process) {
      throw new NotFoundException(`Process ${processId} not found`);
    }

    // Build sort order
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    }
    // Note: most_replies sorting requires a subquery or post-processing

    // Get top-level comments (no parent)
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          processId,
          parentId: null, // Only top-level comments
          // Don't filter deletedAt - we want to show "[deleted]" placeholder
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
          _count: {
            select: { replies: true },
          },
          ...(includeReplies && {
            replies: {
              where: {}, // Include even deleted for placeholder
              orderBy: { createdAt: 'asc' },
              include: {
                user: {
                  select: { id: true, name: true, avatarUrl: true },
                },
                _count: {
                  select: { replies: true },
                },
                replies: {
                  orderBy: { createdAt: 'asc' },
                  include: {
                    user: {
                      select: { id: true, name: true, avatarUrl: true },
                    },
                    _count: {
                      select: { replies: true },
                    },
                  },
                },
              },
            },
          }),
        },
      }),
      prisma.comment.count({
        where: { processId, parentId: null },
      }),
    ]);

    // Sort by most replies if needed
    let sortedComments = comments;
    if (sort === 'most_replies') {
      sortedComments = [...comments].sort((a, b) => b._count.replies - a._count.replies);
    }

    return {
      comments: sortedComments.map((c) => this.toDto(c)),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  /**
   * Get a specific comment thread
   */
  async getThread(commentId: string): Promise<CommentResponseDto> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: {
          select: { replies: true },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
            _count: {
              select: { replies: true },
            },
            replies: {
              orderBy: { createdAt: 'asc' },
              include: {
                user: {
                  select: { id: true, name: true, avatarUrl: true },
                },
                _count: {
                  select: { replies: true },
                },
              },
            },
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    return this.toDto(comment);
  }

  /**
   * Update a comment (owner only)
   */
  async update(
    commentId: string,
    dto: UpdateCommentDto,
    userId: string
  ): Promise<CommentResponseDto> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    if (comment.deletedAt) {
      throw new BadRequestException('Cannot edit a deleted comment');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // Store edit history
    await this.editHistoryService.recordEdit(commentId, comment.content, userId);

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: dto.content,
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    // Update mentions
    const usernames = this.mentionsService.parseMentions(dto.content);
    const validUsers = await this.mentionsService.validateMentions(usernames, updated.processId);
    await this.mentionsService.updateMentions(commentId, validUsers.map((u) => u.id));

    this.logger.log(`Updated comment ${commentId}`);

    return this.toDto(updated);
  }

  /**
   * Soft delete a comment
   */
  async remove(commentId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    if (comment.deletedAt) {
      throw new BadRequestException('Comment already deleted');
    }

    // Only owner or admin can delete
    if (comment.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Deleted comment ${commentId}`);
  }

  /**
   * Resolve/unresolve a comment
   */
  async toggleResolved(commentId: string, userId: string): Promise<CommentResponseDto> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        isResolved: !comment.isResolved,
        resolvedAt: comment.isResolved ? null : new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    this.logger.log(`${updated.isResolved ? 'Resolved' : 'Unresolve'} comment ${commentId}`);

    return this.toDto(updated);
  }

  private toDto(comment: any): CommentResponseDto {
    const isDeleted = !!comment.deletedAt;

    return {
      id: comment.id,
      processId: comment.processId,
      content: isDeleted ? '[Comment deleted]' : comment.content,
      parentId: comment.parentId ?? undefined,
      author: {
        id: comment.user.id,
        name: comment.user.name,
        avatarUrl: comment.user.avatarUrl ?? undefined,
      },
      replyCount: comment._count?.replies ?? 0,
      isEdited: comment.createdAt.getTime() !== comment.updatedAt.getTime(),
      isDeleted,
      isResolved: comment.isResolved,
      resolvedAt: comment.resolvedAt ?? undefined,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      replies: comment.replies?.map((r: any) => this.toDto(r)),
    };
  }
}
