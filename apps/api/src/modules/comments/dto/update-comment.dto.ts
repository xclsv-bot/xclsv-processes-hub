import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommentDto {
  @ApiProperty({ 
    example: 'Updated comment content...',
    maxLength: 2000 
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}
