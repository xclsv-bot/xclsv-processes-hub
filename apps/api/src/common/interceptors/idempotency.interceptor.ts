import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '@/modules/cache/cache.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only apply to POST and PATCH
    if (!['POST', 'PATCH'].includes(method)) {
      return next.handle();
    }

    const idempotencyKey = request.headers['x-idempotency-key'];
    if (!idempotencyKey || !this.cacheService) {
      return next.handle();
    }

    // Check for existing response
    const cached = await this.cacheService.getIdempotencyKey(idempotencyKey);
    if (cached) {
      return of(cached);
    }

    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheService.setIdempotencyKey(idempotencyKey, response);
      }),
    );
  }
}
