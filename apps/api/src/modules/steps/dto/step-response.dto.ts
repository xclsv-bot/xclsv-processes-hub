import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StepOwnerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;
}

export class StepToolDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  icon?: string;

  @ApiPropertyOptional()
  color?: string;

  @ApiPropertyOptional()
  url?: string;
}

export class StepResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  processId: string;

  @ApiProperty()
  sequence: number;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  isHandoff: boolean;

  @ApiProperty({ type: [StepOwnerDto] })
  owners: StepOwnerDto[];

  @ApiProperty({ type: [StepToolDto] })
  tools: StepToolDto[];

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class StepsListResponseDto {
  @ApiProperty({ type: [StepResponseDto] })
  steps: StepResponseDto[];

  @ApiProperty()
  totalSteps: number;

  @ApiProperty({ description: 'Step IDs where ownership changes (handoff points)' })
  handoffPoints: string[];
}
