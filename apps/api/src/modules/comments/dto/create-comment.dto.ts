import { IsString, IsOptional, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ 
    example: 'This process looks great! One suggestion...',
    maxLength: 2000 
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ 
    description: 'Parent comment ID for threaded replies',
    example: 'uuid-of-parent-comment'
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
