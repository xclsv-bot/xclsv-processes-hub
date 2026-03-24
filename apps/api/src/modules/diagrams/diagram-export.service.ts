import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

interface ExportOptions {
  format: 'png' | 'svg';
  scale?: number; // 1, 2, or 4 for resolution
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  backgroundColor?: string;
  width?: number;
}

interface ExportResult {
  format: string;
  filename: string;
  filePath: string;
  fileSize: number;
  generatedAt: Date;
  metadata: {
    processTitle?: string;
    version?: string;
    exportDate: string;
  };
}

@Injectable()
export class DiagramExportService {
  private readonly logger = new Logger(DiagramExportService.name);
  private readonly tempDir = path.join(os.tmpdir(), 'xclsv-diagrams');

  constructor() {
    // Ensure temp directory exists
    fs.mkdir(this.tempDir, { recursive: true }).catch(() => {});
  }

  /**
   * WO-47: Export Mermaid diagram to PNG or SVG
   * Uses mermaid-cli (mmdc) for server-side rendering
   */
  async exportDiagram(
    mermaidSyntax: string,
    options: ExportOptions,
    metadata?: { processTitle?: string; version?: string }
  ): Promise<ExportResult> {
    const exportId = uuidv4();
    const inputFile = path.join(this.tempDir, `${exportId}.mmd`);
    const outputFile = path.join(this.tempDir, `${exportId}.${options.format}`);

    try {
      // Write Mermaid syntax to temp file
      await fs.writeFile(inputFile, mermaidSyntax, 'utf-8');

      // Build mmdc command
      const scale = options.scale || 2;
      const theme = options.theme || 'default';
      const width = options.width || 1200;

      // Configure puppeteer for headless rendering
      const puppeteerConfig = {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      };
      const configFile = path.join(this.tempDir, `${exportId}-config.json`);
      await fs.writeFile(configFile, JSON.stringify({ puppeteerConfig }), 'utf-8');

      const command = [
        'npx',
        '-y',
        '@mermaid-js/mermaid-cli@latest',
        '-i', inputFile,
        '-o', outputFile,
        '-t', theme,
        '-s', scale.toString(),
        '-w', width.toString(),
        '-p', configFile,
      ].join(' ');

      this.logger.log(`Executing: ${command}`);

      // Execute mermaid-cli
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 second timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diagrams
      });

      if (stderr && !stderr.includes('Generating')) {
        this.logger.warn(`mermaid-cli stderr: ${stderr}`);
      }

      // Get file stats
      const stats = await fs.stat(outputFile);

      // Cleanup config file
      await fs.unlink(configFile).catch(() => {});
      await fs.unlink(inputFile).catch(() => {});

      return {
        format: options.format,
        filename: `diagram-${exportId}.${options.format}`,
        filePath: outputFile,
        fileSize: stats.size,
        generatedAt: new Date(),
        metadata: {
          processTitle: metadata?.processTitle,
          version: metadata?.version,
          exportDate: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      this.logger.error(`Export failed: ${error.message}`);

      // Cleanup on error
      await fs.unlink(inputFile).catch(() => {});
      await fs.unlink(outputFile).catch(() => {});

      // Check if mermaid-cli is not installed
      if (error.message?.includes('not found') || error.message?.includes('ENOENT')) {
        throw new InternalServerErrorException(
          'Diagram export service not available. mermaid-cli required.'
        );
      }

      throw new InternalServerErrorException(`Failed to export diagram: ${error.message}`);
    }
  }

  /**
   * Read exported file as buffer (for streaming to client)
   */
  async getExportBuffer(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  /**
   * Cleanup old export files (call periodically)
   */
  async cleanupOldExports(maxAgeHours: number = 24): Promise<number> {
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
    let cleaned = 0;

    try {
      const files = await fs.readdir(this.tempDir);
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        if (stats.mtimeMs < cutoff) {
          await fs.unlink(filePath);
          cleaned++;
        }
      }
    } catch (error) {
      this.logger.warn(`Cleanup error: ${error}`);
    }

    return cleaned;
  }
}
