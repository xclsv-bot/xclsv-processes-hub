import { PartialType } from '@nestjs/swagger';
import { CreateProcessDto } from './create-process.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProcessStatus } from './create-process.dto';

export class UpdateProcessDto extends PartialType(CreateProcessDto) {
  @ApiPropertyOptional({ enum: ProcessStatus })
  @IsOptional()
  @IsEnum(ProcessStatus)
  status?: ProcessStatus;
}
