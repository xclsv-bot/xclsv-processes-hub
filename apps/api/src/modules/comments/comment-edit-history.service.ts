import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { prisma } from '@xclsv/database';

export interface EditHistoryEntry {
  id: string;
  previousContent: string;
  editedBy: {
    id: string;
    name: string;
  };
  createdAt: Date;
}

@Injectable()
export class CommentEditHistoryService {
  private readonly logger = new Logger(CommentEditHistoryService.name);

  /**
   * Store previous content before an edit
   */
  async recordEdit(
    commentId: string,
    previousContent: string,
    editedById: string
  ): Promise<void> {
    await prisma.commentEdit.create({
      data: {
        commentId,
        previousContent,
        editedById,
      },
    });

    this.logger.log(`Recorded edit history for comment ${commentId}`);
  }

  /**
   * Get edit history for a comment
   */
  async getEditHistory(commentId: string): Promise<EditHistoryEntry[]> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    const edits = await prisma.commentEdit.findMany({
      where: { commentId },
      orderBy: { createdAt: 'desc' },
      include: {
        editedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return edits.map((edit) => ({
      id: edit.id,
      previousContent: edit.previousContent,
      editedBy: {
        id: edit.editedBy.id,
        name: edit.editedBy.name,
      },
      createdAt: edit.createdAt,
    }));
  }

  /**
   * Revert comment to a previous version (owner only)
   */
  async revertToVersion(
    commentId: string,
    editHistoryId: string,
    userId: string
  ): Promise<{ newContent: string }> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only revert your own comments');
    }

    const editEntry = await prisma.commentEdit.findUnique({
      where: { id: editHistoryId },
    });

    if (!editEntry || editEntry.commentId !== commentId) {
      throw new NotFoundException(`Edit history entry not found`);
    }

    // Store current content as new edit history entry
    await this.recordEdit(commentId, comment.content, userId);

    // Revert to previous content
    await prisma.comment.update({
      where: { id: commentId },
      data: { content: editEntry.previousContent },
    });

    this.logger.log(`Reverted comment ${commentId} to version ${editHistoryId}`);

    return { newContent: editEntry.previousContent };
  }
}
