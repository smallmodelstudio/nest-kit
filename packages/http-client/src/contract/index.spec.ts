import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { createContractClient, type ResourceContractLike } from './index';

const Widget = z.object({ id: z.number().int().positive(), name: z.string() });
const CreateWidget = Widget.omit({ id: true });
const WidgetQuery = z.object({
  ownerId: z.number().optional(),
  offset: z.number().default(0),
  limit: z.number().default(20),
});

const allRoutes = {
  list: { method: 'GET', path: '' },
  get: { method: 'GET', path: ':id' },
  create: { method: 'POST', path: '' },
  replace: { method: 'PUT', path: ':id' },
  patch: { method: 'PATCH', path: ':id' },
  remove: { method: 'DELETE', path: ':id' },
} as const;

const widgets: ResourceContractLike<typeof Widget, typeof CreateWidget, typeof WidgetQuery> = {
  path: '/widgets',
  entity: Widget,
  create: CreateWidget,
  listQuery: WidgetQuery,
  operations: ['list', 'get', 'create', 'replace', 'patch', 'remove'],
  pagination: 'offset',
  routes: allRoutes,
};

const EmptyQuery = z.object({});

const readOnlyWidgets: ResourceContractLike<typeof Widget, typeof CreateWidget, typeof EmptyQuery> = {
  path: '/widgets',
  entity: Widget,
  create: CreateWidget,
  listQuery: EmptyQuery,
  operations: ['list', 'get'],
  routes: { list: allRoutes.list, get: allRoutes.get },
};

function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

const meta = { timestamp: '2024-01-01T00:00:00.000Z', correlationId: 'abc' };

describe('createContractClient', () => {
  it('unwraps a paginated list envelope into a PaginatedResult', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      makeResponse(200, {
        data: [{ id: 1, name: 'a' }],
        meta: { ...meta, page: { offset: 0, limit: 20, total: 1 } },
      }),
    );
    const client = createContractClient(widgets, { baseUrl: 'https://api.test', fetch: fetchFn });

    await expect(client.list({ ownerId: 5 })).resolves.toEqual({
      items: [{ id: 1, name: 'a' }],
      page: { offset: 0, limit: 20, total: 1 },
    });
    const [url] = fetchFn.mock.calls[0] as [URL];
    expect(url.pathname).toBe('/widgets');
    expect(url.searchParams.get('ownerId')).toBe('5');
  });

  it('unwraps a plain list envelope into an array when the resource is unpaginated', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(makeResponse(200, { data: [{ id: 1, name: 'a' }], meta }));
    const client = createContractClient(readOnlyWidgets, {
      baseUrl: 'https://api.test',
      fetch: fetchFn,
    });

    await expect(client.list()).resolves.toEqual([{ id: 1, name: 'a' }]);
  });

  it('unwraps a single-entity envelope for get', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(makeResponse(200, { data: { id: 1, name: 'a' }, meta }));
    const client = createContractClient(widgets, { baseUrl: 'https://api.test', fetch: fetchFn });

    await expect(client.get(1)).resolves.toEqual({ id: 1, name: 'a' });
    const [url] = fetchFn.mock.calls[0] as [URL];
    expect(url.pathname).toBe('/widgets/1');
  });

  it('posts a create body to the resource path and unwraps the created entity', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(makeResponse(201, { data: { id: 2, name: 'b' }, meta }));
    const client = createContractClient(widgets, { baseUrl: 'https://api.test', fetch: fetchFn });

    await expect(client.create({ name: 'b' })).resolves.toEqual({ id: 2, name: 'b' });
    const [url, init] = fetchFn.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe('/widgets');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'b' }));
  });

  it('puts a replace body to the entity path', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(makeResponse(200, { data: { id: 1, name: 'c' }, meta }));
    const client = createContractClient(widgets, { baseUrl: 'https://api.test', fetch: fetchFn });

    await client.replace(1, { name: 'c' });
    const [url, init] = fetchFn.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe('/widgets/1');
    expect(init.method).toBe('PUT');
  });

  it('patches a partial body to the entity path', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(makeResponse(200, { data: { id: 1, name: 'd' }, meta }));
    const client = createContractClient(widgets, { baseUrl: 'https://api.test', fetch: fetchFn });

    await client.patch(1, { name: 'd' });
    const [url, init] = fetchFn.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe('/widgets/1');
    expect(init.method).toBe('PATCH');
  });

  it('sends a DELETE and resolves null for remove', async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeResponse(200, { data: null, meta }));
    const client = createContractClient(widgets, { baseUrl: 'https://api.test', fetch: fetchFn });

    await expect(client.remove(1)).resolves.toBeNull();
    const [, init] = fetchFn.mock.calls[0] as [URL, RequestInit];
    expect(init.method).toBe('DELETE');
  });

  it('throws for an operation the resource does not declare', async () => {
    const client = createContractClient(readOnlyWidgets, { baseUrl: 'https://api.test' });
    await expect(client.remove(1)).rejects.toThrow(/does not declare/);
  });
});
