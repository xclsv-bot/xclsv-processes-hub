import { ApiProperty } from '@nestjs/swagger';
import { ProcessArea, ProcessStatus } from './create-process.dto';

export class ProcessResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  content: string | null;

  @ApiProperty({ enum: ProcessStatus })
  status: ProcessStatus;

  @ApiProperty({ enum: ProcessArea })
  area: ProcessArea;

  @ApiProperty()
  currentVersion: number;

  @ApiProperty()
  ownerId: string;

  @ApiProperty({ nullable: true })
  owner?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  publishedAt: Date | null;
}
