import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { MediaService } from './media.service';
import { RequirePermissions } from '@/modules/authorization';
import { Permission } from '@/modules/authorization/permissions';
import { CurrentUser, Public } from '@/common/decorators';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @Public()  // MVP: Allow public uploads
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        processId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId?: string,
    @Query('processId') processId?: string,
  ) {
    // MVP: Default to Z's user if no auth
    const uploaderId = userId || 'cc2ed391-2f1c-4ffb-83f5-bb4218c61ad3';
    return this.mediaService.upload(
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
      },
      uploaderId,
      processId,
    );
  }

  @Get('files/:filename')
  @Public()
  @ApiOperation({ summary: 'Get a file by filename' })
  @ApiResponse({ status: 200, description: 'File content' })
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    const { buffer, mimeType } = await this.mediaService.getFile(filename);
    res.set('Content-Type', mimeType);
    res.send(buffer);
  }

  @Get('process/:processId')
  @Public()
  @ApiOperation({ summary: 'Get all media for a process' })
  @ApiResponse({ status: 200, description: 'List of media files' })
  async getMediaForProcess(@Param('processId') processId: string) {
    return this.mediaService.getMediaForProcess(processId);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PROCESS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a media file' })
  @ApiResponse({ status: 204, description: 'File deleted' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.mediaService.delete(id, userId);
  }
}
