import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto, PaginatedResponseDto } from '@/common/dto/pagination.dto';

@Injectable()
export class ProcessesService {
  async findAll(query: PaginationQueryDto): Promise<PaginatedResponseDto<any>> {
    // TODO: Implement with Prisma
    const { limit = 20, offset = 0 } = query;

    return {
      data: [],
      pagination: {
        total: 0,
        limit,
        offset,
        hasMore: false,
      },
      links: {
        self: `/api/v1/processes?limit=${limit}&offset=${offset}`,
        next: null,
        prev: offset > 0 ? `/api/v1/processes?limit=${limit}&offset=${Math.max(0, offset - limit)}` : null,
      },
    };
  }

  async findOne(id: string) {
    // TODO: Implement with Prisma
    throw new NotFoundException(`Process ${id} not found`);
  }
}
