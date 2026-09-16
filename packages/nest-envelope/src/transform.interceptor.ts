import { randomUUID } from 'node:crypto';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { isPaginatedResult } from '@smallmodelstudio/contract';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

export interface SuccessEnvelope<T> {
  data: T;
  meta: {
    timestamp: string;
    correlationId: string;
    page?: { offset: number; limit: number; total: number };
  };
}

/**
 * Wraps every handler's return value in `{ data, meta }`. A value shaped like
 * `{ items, page }` (see `PaginatedResult` in `@smallmodelstudio/contract`) is
 * unwrapped into `data: items` with `meta.page` set.
 *
 * `getCorrelationId` (optional) supplies `meta.correlationId` — e.g.
 * `() => RequestContext.correlationId()` from `@smallmodelstudio/nest-context`.
 * `nest-envelope` doesn't depend on `nest-context` directly (packages in the
 * same layer stay independent of each other); without it, or when it returns
 * `undefined`, a fresh id is generated per response instead.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  SuccessEnvelope<T>
> {
  constructor(private readonly getCorrelationId?: () => string | undefined) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessEnvelope<T>> {
    return next.handle().pipe(
      map((value) => {
        const timestamp = new Date().toISOString();
        const correlationId = this.getCorrelationId?.() ?? randomUUID();
        if (isPaginatedResult(value)) {
          return {
            data: value.items,
            meta: { timestamp, correlationId, page: value.page },
          } as SuccessEnvelope<T>;
        }
        return { data: value, meta: { timestamp, correlationId } };
      }),
    );
  }
}
