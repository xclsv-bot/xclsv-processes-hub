import { Module, Global } from '@nestjs/common';
import { AuthorizationGuard } from './authorization.guard';

@Global()
@Module({
  providers: [AuthorizationGuard],
  exports: [AuthorizationGuard],
})
export class AuthorizationModule {}
