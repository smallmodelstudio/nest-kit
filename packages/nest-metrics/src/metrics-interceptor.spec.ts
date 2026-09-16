import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import type { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { firstValueFrom, of, throwError } from 'rxjs';
import { MetricsInterceptor } from './metrics-interceptor';
import { dataPointsFor, setUpTestMeterProvider } from './otel-test-support';

describe('MetricsInterceptor', () => {
  let reader: PeriodicExportingMetricReader;
  let cleanup: () => Promise<void>;

  beforeEach(() => {
    ({ reader, cleanup } = setUpTestMeterProvider());
  });

  afterEach(() => cleanup());

  const makeContext = (
    routeUrl: string,
    statusCode = 200,
  ): ExecutionContext => {
    const request = {
      method: 'GET',
      routeOptions: { url: routeUrl },
      url: routeUrl,
    };
    const reply = { statusCode };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => reply,
      }),
    } as unknown as ExecutionContext;
  };

  it('records a request count and duration on success', async () => {
    const interceptor = new MetricsInterceptor();
    const next: CallHandler = { handle: () => of({ ok: true }) };

    await firstValueFrom(interceptor.intercept(makeContext('/posts'), next));

    const counts = await dataPointsFor(reader, 'http_server_requests_total');
    const point = counts.find(
      (candidate) =>
        candidate.attributes['route'] === '/posts' &&
        candidate.attributes['status'] === '2xx',
    );
    expect(point?.value).toBe(1);

    const durations = await dataPointsFor(
      reader,
      'http_server_request_duration_ms',
    );
    expect(durations).toHaveLength(1);
  });

  it('records an error and a status-derived request count on failure', async () => {
    const interceptor = new MetricsInterceptor();
    const next: CallHandler = {
      handle: () => throwError(() => new BadRequestException('bad input')),
    };

    await expect(
      firstValueFrom(interceptor.intercept(makeContext('/posts'), next)),
    ).rejects.toThrow('bad input');

    const errors = await dataPointsFor(
      reader,
      'http_server_request_errors_total',
    );
    expect(
      errors.find((point) => point.attributes['route'] === '/posts')?.value,
    ).toBe(1);

    const counts = await dataPointsFor(reader, 'http_server_requests_total');
    const point = counts.find(
      (candidate) => candidate.attributes['status'] === '4xx',
    );
    expect(point?.value).toBe(1);
  });

  it('falls back to a 5xx status for a non-HttpException error', async () => {
    const interceptor = new MetricsInterceptor();
    const next: CallHandler = {
      handle: () => throwError(() => new Error('boom')),
    };

    await expect(
      firstValueFrom(interceptor.intercept(makeContext('/posts'), next)),
    ).rejects.toThrow('boom');

    const counts = await dataPointsFor(reader, 'http_server_requests_total');
    const point = counts.find(
      (candidate) => candidate.attributes['status'] === '5xx',
    );
    expect(point?.value).toBe(1);
  });
});
