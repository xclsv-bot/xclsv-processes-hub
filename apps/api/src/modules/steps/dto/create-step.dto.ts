import { IsString, IsOptional, IsArray, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStepDto {
  @ApiProperty({ example: 'Review client requirements' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Review the client brief and confirm all requirements are documented' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ 
    type: [String], 
    example: ['user-id-1', 'user-id-2'],
    description: 'Array of user IDs to assign as step owners'
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  ownerIds?: string[];

  @ApiPropertyOptional({ 
    type: [String], 
    example: ['tool-id-1', 'tool-id-2'],
    description: 'Array of tool IDs to tag for this step'
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  toolIds?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  metadata?: Record<string, any>;
}
