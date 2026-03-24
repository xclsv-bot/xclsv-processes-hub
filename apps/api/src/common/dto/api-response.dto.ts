import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorDetail {
  @ApiProperty()
  field: string;

  @ApiProperty()
  constraint: string;

  @ApiProperty()
  message: string;
}

export class ApiErrorResponse {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  error: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [ApiErrorDetail], required: false })
  details?: ApiErrorDetail[];

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  path: string;
}

export class ApiSuccessResponse<T> {
  @ApiProperty()
  data: T;
}
