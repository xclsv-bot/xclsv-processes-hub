import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RelatedProcessDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  area: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  slug?: string;
}

export class RelationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fromProcessId: string;

  @ApiProperty()
  toProcessId: string;

  @ApiProperty()
  relationType: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: RelatedProcessDto })
  relatedProcess: RelatedProcessDto;
}

export class RelationsListResponseDto {
  @ApiProperty({ type: [RelationResponseDto] })
  relations: RelationResponseDto[];

  @ApiProperty()
  total: number;
}
