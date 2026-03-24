import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderStepsDto {
  @ApiProperty({ 
    type: [String], 
    example: ['step-id-3', 'step-id-1', 'step-id-2'],
    description: 'Ordered array of step IDs representing the new sequence'
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  stepIds: string[];
}
