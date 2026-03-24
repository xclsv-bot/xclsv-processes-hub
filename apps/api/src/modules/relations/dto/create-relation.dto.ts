import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRelationDto {
  @ApiProperty({ description: 'ID of the process to link to' })
  @IsString()
  relatedProcessId: string;

  @ApiPropertyOptional({ 
    description: 'Type of relationship',
    enum: ['supports', 'references', 'parent', 'child'],
    default: 'supports'
  })
  @IsOptional()
  @IsString()
  @IsIn(['supports', 'references', 'parent', 'child'])
  relationType?: string = 'supports';
}
