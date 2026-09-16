import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { HttpException, Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs';
import { defineCounter, defineHistogram } from './metrics';

type RouteLabels = Record<'method' | 'route', string>;

type RouteStatusLabels = RouteLabels & Record<'status', string>;

function statusClassOf(status: number): string {
  return `${Math.floor(status / 100)}xx`;
}

function routeLabels(request: FastifyRequest): RouteLabels {
  return {
    method: request.method,
    route: request.routeOptions.url ?? request.url,
  };
}

/**
 * Request-rate, error and duration metrics per route. Bound as a global
 * `APP_INTERCEPTOR`, this only ever sees requests that matched a route (same
 * limitation as any Nest interceptor) — an unmatched-route 404 isn't
 * counted here.
 *
 * The instruments are instance fields, created when Nest DI instantiates
 * this provider — not module-level constants — so `metrics.getMeter()` is
 * only called once an OTel SDK (if any) has already had the chance to
 * register a real MeterProvider first.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly requestCount = defineCounter<RouteStatusLabels>(
    'http_server_requests_total',
    { description: 'HTTP requests, labeled by method, route and status class' },
  );

  private readonly requestDuration = defineHistogram<RouteStatusLabels>(
    'http_server_request_duration_ms',
    {
      description:
        'HTTP request duration, labeled by method, route and status class',
      unit: 'ms',
    },
  );

  private readonly requestErrors = defineCounter<RouteLabels>(
    'http_server_request_errors_total',
    {
      description:
        'HTTP requests whose handler threw, labeled by method and route',
    },
  );

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    const labels = routeLabels(request);
    const start = performance.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.record(labels, reply.statusCode, start);
        },
        error: (error: unknown) => {
          this.requestErrors.add(1, labels);
          const status =
            error instanceof HttpException ? error.getStatus() : 500;
          this.record(labels, status, start);
        },
      }),
    );
  }

  private record(labels: RouteLabels, status: number, start: number): void {
    const attributes = { ...labels, status: statusClassOf(status) };
    this.requestCount.add(1, attributes);
    this.requestDuration.record(performance.now() - start, attributes);
  }
}
