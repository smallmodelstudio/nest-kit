import { defineResource, zId } from '@smallmodelstudio/contract';
import { NestHttpService } from '@smallmodelstudio/nest-http';
import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { httpProxyAdapter } from './http-proxy.adapter';

const Widget = z
  .object({ id: z.number().int().positive(), name: z.string() })
  .meta({ id: 'Widget' });

const widgets = defineResource({
  path: '/widgets',
  entity: Widget,
  create: Widget.omit({ id: true }),
  query: z.object({ ownerId: zId().optional() }),
  operations: ['list', 'get', 'create', 'replace', 'patch', 'remove'],
  pagination: 'offset',
});

const readOnlyWidgets = defineResource({
  path: '/widgets',
  entity: Widget,
  create: Widget.omit({ id: true }),
  operations: ['list', 'get'],
});

function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

const meta = { timestamp: '2024-01-01T00:00:00.000Z', correlationId: 'abc' };

describe('httpProxyAdapter', () => {
  it('lists through the injected NestHttpService and unwraps the paginated envelope', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      makeResponse(200, {
        data: [{ id: 1, name: 'a' }],
        meta: { ...meta, page: { offset: 0, limit: 20, total: 1 } },
      }),
    );
    const http = new NestHttpService({
      baseUrl: 'https://upstream.test',
      fetch: fetchFn,
      getCorrelationId: () => 'corr-1',
    });
    const repository = httpProxyAdapter(widgets, http);

    await expect(repository.list({ ownerId: 5, offset: 0, limit: 20 })).resolves.toEqual({
      items: [{ id: 1, name: 'a' }],
      page: { offset: 0, limit: 20, total: 1 },
    });
    const [url, init] = fetchFn.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe('/widgets');
    expect((init.headers as Headers).get('x-correlation-id')).toBe('corr-1');
  });

  it('gets, creates, replaces, patches and removes through the upstream envelope', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(200, { data: { id: 1, name: 'a' }, meta }))
      .mockResolvedValueOnce(makeResponse(201, { data: { id: 2, name: 'b' }, meta }))
      .mockResolvedValueOnce(makeResponse(200, { data: { id: 1, name: 'c' }, meta }))
      .mockResolvedValueOnce(makeResponse(200, { data: { id: 1, name: 'd' }, meta }))
      .mockResolvedValueOnce(makeResponse(200, { data: null, meta }));
    const http = new NestHttpService({ baseUrl: 'https://upstream.test', fetch: fetchFn });
    const repository = httpProxyAdapter(widgets, http);

    await expect(repository.get(1)).resolves.toEqual({ id: 1, name: 'a' });
    await expect(repository.create({ name: 'b' })).resolves.toEqual({ id: 2, name: 'b' });
    await expect(repository.replace(1, { name: 'c' })).resolves.toEqual({ id: 1, name: 'c' });
    await expect(repository.patch(1, { name: 'd' })).resolves.toEqual({ id: 1, name: 'd' });
    await expect(repository.remove(1)).resolves.toBeNull();

    const methods = (fetchFn.mock.calls as [URL, RequestInit][]).map(([, init]) => init.method);
    expect(methods).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
  });

  it('throws for an operation the resource does not declare', async () => {
    const http = new NestHttpService({ baseUrl: 'https://upstream.test' });
    const repository = httpProxyAdapter(readOnlyWidgets, http);

    await expect(repository.remove(1)).rejects.toThrow(/does not declare/);
  });
});
