import { PartialType } from '@nestjs/swagger';
import { CreateProcessDto } from './create-process.dto';
import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProcessStatus, ProcessType } from './create-process.dto';

export class UpdateProcessDto extends PartialType(CreateProcessDto) {
  @ApiPropertyOptional({ enum: ProcessStatus })
  @IsOptional()
  @IsEnum(ProcessStatus)
  status?: ProcessStatus;

  @ApiPropertyOptional({ enum: ProcessType })
  @IsOptional()
  @IsEnum(ProcessType)
  type?: ProcessType;

  @ApiPropertyOptional({ description: 'Owner user ID' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
