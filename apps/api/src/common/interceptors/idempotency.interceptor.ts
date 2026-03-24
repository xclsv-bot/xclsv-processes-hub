import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

// In-memory store for development (use Redis in production)
const idempotencyStore = new Map<string, { response: any; timestamp: number }>();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only apply to POST and PATCH
    if (!['POST', 'PATCH'].includes(method)) {
      return next.handle();
    }

    const idempotencyKey = request.headers['x-idempotency-key'];
    if (!idempotencyKey) {
      return next.handle();
    }

    // Check for existing response
    const cached = idempotencyStore.get(idempotencyKey);
    if (cached) {
      if (Date.now() - cached.timestamp < IDEMPOTENCY_TTL) {
        return of(cached.response);
      }
      idempotencyStore.delete(idempotencyKey);
    }

    return next.handle().pipe(
      tap((response) => {
        idempotencyStore.set(idempotencyKey, {
          response,
          timestamp: Date.now(),
        });
      }),
    );
  }
}
