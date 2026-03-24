import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { MentionsService } from './mentions.service';
import { CommentEditHistoryService } from './comment-edit-history.service';

@Module({
  controllers: [CommentsController],
  providers: [CommentsService, MentionsService, CommentEditHistoryService],
  exports: [CommentsService, MentionsService, CommentEditHistoryService],
})
export class CommentsModule {}
