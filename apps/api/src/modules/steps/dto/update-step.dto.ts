import { IsString, IsOptional, IsArray, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStepDto {
  @ApiPropertyOptional({ example: 'Review client requirements (updated)' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description for the step' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ 
    type: [String], 
    description: 'Replace all step owners with this list of user IDs'
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  ownerIds?: string[];

  @ApiPropertyOptional({ 
    type: [String], 
    description: 'Replace all step tools with this list of tool IDs'
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  toolIds?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  metadata?: Record<string, any>;
}
