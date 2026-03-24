import { IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProcessArea {
  EVENTS = 'EVENTS',
  INFLUENCER = 'INFLUENCER',
  PARTNERS = 'PARTNERS',
  CRM = 'CRM',
  OPERATIONS = 'OPERATIONS',
  FINANCE = 'FINANCE',
  HR = 'HR',
  GENERAL = 'GENERAL',
}

export enum ProcessStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ProcessType {
  PROCESS = 'PROCESS',
  DOCUMENT = 'DOCUMENT',
}

export class CreateProcessDto {
  @ApiProperty({ example: 'Ambassador Onboarding Process' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Step-by-step guide for onboarding new ambassadors' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: '# Introduction\n\nThis process covers...' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ enum: ProcessArea, example: ProcessArea.EVENTS })
  @IsEnum(ProcessArea)
  area: ProcessArea;

  @ApiPropertyOptional({ enum: ProcessType, example: ProcessType.PROCESS })
  @IsOptional()
  @IsEnum(ProcessType)
  type?: ProcessType;

  @ApiPropertyOptional({ type: Object, example: { priority: 'high' } })
  @IsOptional()
  metadata?: Record<string, any>;
}
