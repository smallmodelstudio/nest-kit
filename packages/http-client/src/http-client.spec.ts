import { describe, expect, it, vi } from 'vitest';
import { HttpClient } from './http-client';
import { UpstreamError } from './upstream-error';

function makeResponse(status: number, body: unknown): Response {
  const text = body === undefined ? '' : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
  } as unknown as Response;
}

const noBackoff = { baseDelayMs: 0, maxDelayMs: 0 };

describe('HttpClient', () => {
  it('resolves with the parsed JSON body on a successful GET', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse(200, { hello: 'world' }));
    const client = new HttpClient({ baseUrl: 'https://api.example.com', fetch: fetchFn });

    await expect(client.get('/things')).resolves.toEqual({ hello: 'world' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url] = fetchFn.mock.calls[0] as [URL];
    expect(url.toString()).toBe('https://api.example.com/things');
  });

  it('sends a JSON body and content-type for POST', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse(201, { id: 1 }));
    const client = new HttpClient({ baseUrl: 'https://api.example.com', fetch: fetchFn });

    await client.post('/things', { name: 'a thing' });

    const [, init] = fetchFn.mock.calls[0] as [URL, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'a thing' }));
    expect((init.headers as Headers).get('content-type')).toBe('application/json');
  });

  it('serializes query parameters, skipping undefined values', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse(200, []));
    const client = new HttpClient({ baseUrl: 'https://api.example.com', fetch: fetchFn });

    await client.get('/things', { query: { limit: 10, cursor: undefined } });

    const [url] = fetchFn.mock.calls[0] as [URL];
    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.has('cursor')).toBe(false);
  });

  it('resolves headers supplied as a function fresh per attempt', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse(200, {}));
    let calls = 0;
    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchFn,
      headers: () => ({ 'x-correlation-id': `id-${++calls}` }),
    });

    await client.get('/a');
    await client.get('/b');

    const firstInit = fetchFn.mock.calls[0]?.[1] as RequestInit;
    const secondInit = fetchFn.mock.calls[1]?.[1] as RequestInit;
    expect((firstInit.headers as Headers).get('x-correlation-id')).toBe('id-1');
    expect((secondInit.headers as Headers).get('x-correlation-id')).toBe('id-2');
  });

  it('retries a safe method on a 500, then succeeds', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(500, { message: 'boom' }))
      .mockResolvedValueOnce(makeResponse(200, { ok: true }));
    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchFn,
      backoff: noBackoff,
    });

    await expect(client.get('/things')).resolves.toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('does not retry POST on a 500', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse(500, { message: 'boom' }));
    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchFn,
      backoff: noBackoff,
    });

    await expect(client.post('/things', {})).rejects.toThrow(UpstreamError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('does not retry a 4xx even for a safe method', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse(404, { message: 'not found' }));
    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchFn,
      backoff: noBackoff,
    });

    const error = await client.get('/things').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).kind).toBe('BAD_RESPONSE');
    expect((error as UpstreamError).status).toBe(404);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('gives up after exhausting retries and throws the last UpstreamError', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse(503, {}));
    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchFn,
      retries: 2,
      backoff: noBackoff,
    });

    await expect(client.get('/things')).rejects.toThrow(UpstreamError);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('calls onRetry before each retried attempt', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(500, {}))
      .mockResolvedValueOnce(makeResponse(200, {}));
    const onRetry = vi.fn();
    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchFn,
      backoff: noBackoff,
      onRetry,
    });

    await client.get('/things');

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: '/things', attempt: 1 }),
    );
  });

  it('maps a fetch rejection to a NETWORK_ERROR UpstreamError', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchFn,
      retries: 0,
    });

    const error = await client.get('/things').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).kind).toBe('NETWORK_ERROR');
  });

  it('maps an AbortSignal timeout to a TIMEOUT UpstreamError', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));
    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchFn,
      retries: 0,
    });

    const error = await client.get('/things').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).kind).toBe('TIMEOUT');
  });

  it('returns undefined for an empty response body', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse(204, undefined));
    const client = new HttpClient({ baseUrl: 'https://api.example.com', fetch: fetchFn });

    await expect(client.delete('/things/1')).resolves.toBeUndefined();
  });
});
