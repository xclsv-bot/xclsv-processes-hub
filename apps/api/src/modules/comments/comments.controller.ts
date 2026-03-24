import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CommentsService } from './comments.service';
import { MentionsService } from './mentions.service';
import { CommentEditHistoryService } from './comment-edit-history.service';
import { CreateCommentDto, UpdateCommentDto, CommentResponseDto, CommentsListResponseDto } from './dto';

@ApiTags('Comments')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly mentionsService: MentionsService,
    private readonly editHistoryService: CommentEditHistoryService,
  ) {}

  /**
   * POST /api/v1/processes/:processId/comments
   * Create a new comment on a process
   */
  @Post('processes/:processId/comments')
  @ApiOperation({ summary: 'Create a comment on a process' })
  @ApiParam({ name: 'processId', description: 'Process ID' })
  @ApiResponse({ status: 201, description: 'Comment created', type: CommentResponseDto })
  @ApiResponse({ status: 404, description: 'Process not found' })
  async create(
    @Param('processId') processId: string,
    @Body() dto: CreateCommentDto,
    @Request() req: { user: { id: string } },
  ): Promise<{ data: CommentResponseDto }> {
    const comment = await this.commentsService.create(processId, dto, req.user.id);
    return { data: comment };
  }

  /**
   * GET /api/v1/processes/:processId/comments
   * List comments for a process with pagination
   */
  @Get('processes/:processId/comments')
  @ApiOperation({ summary: 'List comments for a process' })
  @ApiParam({ name: 'processId', description: 'Process ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, enum: ['newest', 'oldest', 'most_replies'] })
  @ApiResponse({ status: 200, description: 'Comments retrieved', type: CommentsListResponseDto })
  async findAll(
    @Param('processId') processId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('sort') sort?: 'newest' | 'oldest' | 'most_replies',
  ): Promise<{ data: CommentsListResponseDto }> {
    const result = await this.commentsService.findAll(processId, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      sort: sort || 'newest',
      includeReplies: true,
    });
    return { data: result };
  }

  /**
   * GET /api/v1/comments/:id/thread
   * Get a comment with its full thread
   */
  @Get('comments/:id/thread')
  @ApiOperation({ summary: 'Get a comment thread' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment thread retrieved', type: CommentResponseDto })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async getThread(@Param('id') id: string): Promise<{ data: CommentResponseDto }> {
    const comment = await this.commentsService.getThread(id);
    return { data: comment };
  }

  /**
   * PUT /api/v1/comments/:id
   * Update a comment (owner only)
   */
  @Put('comments/:id')
  @ApiOperation({ summary: 'Update a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment updated', type: CommentResponseDto })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @Request() req: { user: { id: string } },
  ): Promise<{ data: CommentResponseDto }> {
    const comment = await this.commentsService.update(id, dto, req.user.id);
    return { data: comment };
  }

  /**
   * DELETE /api/v1/comments/:id
   * Soft delete a comment
   */
  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 204, description: 'Comment deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async remove(
    @Param('id') id: string,
    @Request() req: { user: { id: string; role: string } },
  ): Promise<void> {
    const isAdmin = req.user.role === 'ADMIN';
    await this.commentsService.remove(id, req.user.id, isAdmin);
  }

  /**
   * PATCH /api/v1/comments/:id/resolve
   * Toggle comment resolved status
   */
  @Patch('comments/:id/resolve')
  @ApiOperation({ summary: 'Toggle comment resolved status' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment resolve status toggled', type: CommentResponseDto })
  async toggleResolved(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ): Promise<{ data: CommentResponseDto }> {
    const comment = await this.commentsService.toggleResolved(id, req.user.id);
    return { data: comment };
  }

  /**
   * GET /api/v1/comments/mentions/me
   * Get comments mentioning the current user
   */
  @Get('comments/mentions/me')
  @ApiOperation({ summary: 'Get comments mentioning the current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Mentions retrieved' })
  async getMyMentions(
    @Request() req: { user: { id: string } },
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const result = await this.mentionsService.getMyMentions(req.user.id, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
    return { data: result };
  }

  /**
   * GET /api/v1/comments/:id/edit-history
   * Get edit history for a comment
   */
  @Get('comments/:id/edit-history')
  @ApiOperation({ summary: 'Get edit history for a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Edit history retrieved' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async getEditHistory(@Param('id') id: string) {
    const history = await this.editHistoryService.getEditHistory(id);
    return { data: history };
  }

  /**
   * POST /api/v1/comments/:id/revert/:editHistoryId
   * Revert comment to a previous version
   */
  @Post('comments/:id/revert/:editHistoryId')
  @ApiOperation({ summary: 'Revert comment to a previous version' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiParam({ name: 'editHistoryId', description: 'Edit history entry ID' })
  @ApiResponse({ status: 200, description: 'Comment reverted' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async revertToVersion(
    @Param('id') id: string,
    @Param('editHistoryId') editHistoryId: string,
    @Request() req: { user: { id: string } },
  ) {
    const result = await this.editHistoryService.revertToVersion(id, editHistoryId, req.user.id);
    return { data: result };
  }
}
