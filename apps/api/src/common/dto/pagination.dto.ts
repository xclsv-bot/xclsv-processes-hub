import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Filter by area/department' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by type (PROCESS or DOCUMENT)' })
  @IsOptional()
  @IsString()
  type?: string;
}

export class PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export class PaginatedResponseDto<T> {
  data: T[];
  pagination: PaginationMeta;
  links: {
    self: string;
    next: string | null;
    prev: string | null;
  };
}
