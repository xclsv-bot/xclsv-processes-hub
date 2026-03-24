import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { prisma } from '@xclsv/database';
import { CreateToolDto, ToolResponseDto } from './dto';

@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async create(dto: CreateToolDto): Promise<ToolResponseDto> {
    const slug = this.slugify(dto.name);

    // Check for existing tool with same name or slug
    const existing = await prisma.tool.findFirst({
      where: {
        OR: [
          { name: { equals: dto.name, mode: 'insensitive' } },
          { slug },
        ],
      },
    });

    if (existing) {
      throw new ConflictException(`Tool "${dto.name}" already exists`);
    }

    const tool = await prisma.tool.create({
      data: {
        name: dto.name,
        slug,
        icon: dto.icon,
        color: dto.color,
        description: dto.description,
        url: dto.url,
      },
    });

    this.logger.log(`Created tool: ${tool.name} (${tool.id})`);
    return this.toDto(tool);
  }

  async findAll(): Promise<ToolResponseDto[]> {
    const tools = await prisma.tool.findMany({
      orderBy: { name: 'asc' },
    });
    return tools.map(this.toDto);
  }

  async findOne(id: string): Promise<ToolResponseDto> {
    const tool = await prisma.tool.findUnique({
      where: { id },
    });

    if (!tool) {
      throw new NotFoundException(`Tool ${id} not found`);
    }

    return this.toDto(tool);
  }

  async update(id: string, dto: Partial<CreateToolDto>): Promise<ToolResponseDto> {
    const existing = await prisma.tool.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Tool ${id} not found`);
    }

    // If name is changing, update slug and check for conflicts
    let slug = existing.slug;
    if (dto.name && dto.name !== existing.name) {
      slug = this.slugify(dto.name);
      const conflict = await prisma.tool.findFirst({
        where: {
          OR: [
            { name: { equals: dto.name, mode: 'insensitive' } },
            { slug },
          ],
          NOT: { id },
        },
      });
      if (conflict) {
        throw new ConflictException(`Tool "${dto.name}" already exists`);
      }
    }

    const tool = await prisma.tool.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        icon: dto.icon,
        color: dto.color,
        description: dto.description,
        url: dto.url,
      },
    });

    this.logger.log(`Updated tool: ${tool.name} (${tool.id})`);
    return this.toDto(tool);
  }

  async remove(id: string): Promise<void> {
    const existing = await prisma.tool.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Tool ${id} not found`);
    }

    await prisma.tool.delete({
      where: { id },
    });

    this.logger.log(`Deleted tool: ${existing.name} (${id})`);
  }

  async seed(): Promise<ToolResponseDto[]> {
    // Standard XCLSV tools
    const defaultTools = [
      { name: 'Asana', icon: '📋', color: '#F06A6A', description: 'Project management', url: 'https://app.asana.com' },
      { name: 'Apollo', icon: '🎯', color: '#5A67D8', description: 'Sales prospecting', url: 'https://app.apollo.io' },
      { name: 'QuickBooks', icon: '📊', color: '#2CA01C', description: 'Accounting', url: 'https://quickbooks.intuit.com' },
      { name: 'Ramp', icon: '💳', color: '#FFD700', description: 'Corporate cards & expenses', url: 'https://ramp.com' },
      { name: 'Slack', icon: '💬', color: '#4A154B', description: 'Team communication', url: 'https://slack.com' },
      { name: '8090', icon: '🏭', color: '#3B82F6', description: 'Software factory', url: 'https://factory.8090.dev' },
      { name: 'Google Docs', icon: '📝', color: '#4285F4', description: 'Document creation', url: 'https://docs.google.com' },
      { name: 'Google Sheets', icon: '📈', color: '#0F9D58', description: 'Spreadsheets', url: 'https://sheets.google.com' },
      { name: 'Customer.io', icon: '📧', color: '#FF5C35', description: 'Email marketing', url: 'https://fly.customer.io' },
      { name: 'LinkedIn', icon: '💼', color: '#0A66C2', description: 'Professional networking', url: 'https://linkedin.com' },
      { name: 'DocuSign', icon: '✍️', color: '#FFCC00', description: 'Electronic signatures', url: 'https://docusign.com' },
      { name: 'Vercel', icon: '▲', color: '#000000', description: 'Deployment platform', url: 'https://vercel.com' },
      { name: 'Neon', icon: '🐘', color: '#00E599', description: 'Serverless Postgres', url: 'https://neon.tech' },
      { name: 'Homebase', icon: '🏠', color: '#FF6B6B', description: 'Scheduling & payroll', url: 'https://joinhomebase.com' },
    ];

    const created: ToolResponseDto[] = [];

    for (const tool of defaultTools) {
      try {
        const result = await this.create(tool);
        created.push(result);
      } catch (e) {
        // Tool already exists, skip
        this.logger.debug(`Tool ${tool.name} already exists, skipping`);
      }
    }

    return created;
  }

  private toDto(tool: any): ToolResponseDto {
    return {
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      icon: tool.icon,
      color: tool.color,
      description: tool.description,
      url: tool.url,
      createdAt: tool.createdAt,
      updatedAt: tool.updatedAt,
    };
  }
}
