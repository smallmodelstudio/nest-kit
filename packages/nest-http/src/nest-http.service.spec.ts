import { describe, expect, it, vi } from 'vitest';
import { NestHttpService, CORRELATION_ID_HEADER } from './nest-http.service';
import * as httpClientMetrics from './http-client-metrics';

function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe('NestHttpService', () => {
  it('forwards x-correlation-id from getCorrelationId()', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse(200, {}));
    const service = new NestHttpService({
      baseUrl: 'https://api.test',
      fetch: fetchFn,
      getCorrelationId: () => 'corr-1',
    });

    await service.get('/things');

    const [, init] = fetchFn.mock.calls[0] as [URL, RequestInit];
    expect((init.headers as Headers).get(CORRELATION_ID_HEADER)).toBe('corr-1');
  });

  it('sends no correlation id header when getCorrelationId is absent or returns undefined', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse(200, {}));
    const service = new NestHttpService({ baseUrl: 'https://api.test', fetch: fetchFn });

    await service.get('/things');

    const [, init] = fetchFn.mock.calls[0] as [URL, RequestInit];
    expect((init.headers as Headers).has(CORRELATION_ID_HEADER)).toBe(false);
  });

  it('preserves static headers alongside the correlation id', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse(200, {}));
    const service = new NestHttpService({
      baseUrl: 'https://api.test',
      fetch: fetchFn,
      headers: { 'x-api-key': 'secret' },
      getCorrelationId: () => 'corr-1',
    });

    await service.get('/things');

    const [, init] = fetchFn.mock.calls[0] as [URL, RequestInit];
    expect((init.headers as Headers).get('x-api-key')).toBe('secret');
    expect((init.headers as Headers).get(CORRELATION_ID_HEADER)).toBe('corr-1');
  });

  it('records a retry metric and calls a user onRetry for each retried attempt', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(500, {}))
      .mockResolvedValueOnce(makeResponse(200, {}));
    const recordRetrySpy = vi.spyOn(httpClientMetrics, 'recordRetry');
    const onRetry = vi.fn();
    const service = new NestHttpService({
      baseUrl: 'https://api.test',
      fetch: fetchFn,
      backoff: { baseDelayMs: 0, maxDelayMs: 0 },
      onRetry,
    });

    await service.get('/things');

    expect(recordRetrySpy).toHaveBeenCalledWith('GET');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('exposes post/put/patch/delete sugar over the same request path', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse(200, { ok: true }));
    const service = new NestHttpService({ baseUrl: 'https://api.test', fetch: fetchFn });

    await service.post('/things', { a: 1 });
    await service.put('/things/1', { a: 2 });
    await service.patch('/things/1', { a: 3 });
    await service.delete('/things/1');

    const calls = fetchFn.mock.calls as [URL, RequestInit][];
    const methods = calls.map(([, init]) => init.method);
    expect(methods).toEqual(['POST', 'PUT', 'PATCH', 'DELETE']);
  });
});
