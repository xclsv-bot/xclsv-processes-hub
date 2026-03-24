import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@xclsv/database';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/webm',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get('UPLOAD_DIR') || './uploads';
    this.baseUrl = this.configService.get('MEDIA_BASE_URL') || '/api/v1/media/files';
  }

  async upload(file: UploadedFile, userId: string, processId?: string): Promise<MediaFile> {
    // Validate file
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed`);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    // Ensure upload directory exists
    await fs.mkdir(this.uploadDir, { recursive: true });

    // Save file
    await fs.writeFile(filePath, file.buffer);

    // Store metadata in database
    const media = await prisma.media.create({
      data: {
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `${this.baseUrl}/${filename}`,
        uploadedById: userId,
        processId,
      },
    });

    this.logger.log(`File uploaded: ${filename} by ${userId}`);

    return {
      id: media.id,
      filename: media.filename,
      originalName: media.originalName,
      mimeType: media.mimeType,
      size: media.size,
      url: media.url,
    };
  }

  async getFile(filename: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const media = await prisma.media.findFirst({
      where: { filename },
    });

    if (!media) {
      throw new NotFoundException('File not found');
    }

    const filePath = path.join(this.uploadDir, filename);
    
    try {
      const buffer = await fs.readFile(filePath);
      return { buffer, mimeType: media.mimeType };
    } catch (error) {
      throw new NotFoundException('File not found on disk');
    }
  }

  async getMediaForProcess(processId: string): Promise<MediaFile[]> {
    const media = await prisma.media.findMany({
      where: { processId },
      orderBy: { createdAt: 'desc' },
    });

    return media.map((m: { id: string; filename: string; originalName: string; mimeType: string; size: number; url: string; thumbnailUrl: string | null }) => ({
      id: m.id,
      filename: m.filename,
      originalName: m.originalName,
      mimeType: m.mimeType,
      size: m.size,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl || undefined,
    }));
  }

  async delete(id: string, userId: string): Promise<void> {
    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Delete file from disk
    const filePath = path.join(this.uploadDir, media.filename);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      this.logger.warn(`Could not delete file: ${filePath}`);
    }

    // Delete from database
    await prisma.media.delete({
      where: { id },
    });

    this.logger.log(`Media deleted: ${id} by ${userId}`);
  }
}
