import { defineResource, zId } from '@smallmodelstudio/contract';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { inMemoryAdapter } from './in-memory.adapter';

const Widget = z
  .object({ id: z.number().int().positive(), ownerId: z.number().int().positive(), name: z.string() })
  .meta({ id: 'Widget' });

const widgets = defineResource({
  path: '/widgets',
  entity: Widget,
  create: Widget.omit({ id: true }),
  query: z.object({ ownerId: zId().optional() }),
  operations: ['list', 'get', 'create', 'replace', 'patch', 'remove'],
  pagination: 'offset',
});

const unpaginatedWidgets = defineResource({
  path: '/widgets',
  entity: Widget,
  create: Widget.omit({ id: true }),
  operations: ['list', 'get'],
});

describe('inMemoryAdapter', () => {
  it('paginates list() with offset/limit and reports total against the unfiltered set', async () => {
    const seed = Array.from({ length: 3 }, (_, i) => ({ id: i + 1, ownerId: 1, name: `w${i}` }));
    const repository = inMemoryAdapter(widgets, { seed });

    const page = await repository.list({ ownerId: undefined, offset: 1, limit: 1 });
    expect(page).toEqual({
      items: [{ id: 2, ownerId: 1, name: 'w1' }],
      page: { offset: 1, limit: 1, total: 3 },
    });
  });

  it('applies a custom filter before pagination', async () => {
    const seed = [
      { id: 1, ownerId: 1, name: 'a' },
      { id: 2, ownerId: 2, name: 'b' },
    ];
    const repository = inMemoryAdapter(widgets, {
      seed,
      filter: (entity, query) => query.ownerId === undefined || entity.ownerId === query.ownerId,
    });

    const page = await repository.list({ ownerId: 2, offset: 0, limit: 20 });
    expect(page).toEqual({ items: [{ id: 2, ownerId: 2, name: 'b' }], page: { offset: 0, limit: 20, total: 1 } });
  });

  it('returns a plain array from list() when the resource is unpaginated', async () => {
    const seed = [{ id: 1, ownerId: 1, name: 'a' }];
    const repository = inMemoryAdapter(unpaginatedWidgets, { seed });

    await expect(repository.list({})).resolves.toEqual(seed);
  });

  it('assigns an autoincrementing id on create, continuing after the seed', async () => {
    const repository = inMemoryAdapter(widgets, { seed: [{ id: 5, ownerId: 1, name: 'a' }] });

    const created = await repository.create({ ownerId: 1, name: 'b' });
    expect(created.id).toBe(6);
  });

  it('gets, replaces, patches and removes an existing entity', async () => {
    const repository = inMemoryAdapter(widgets, { seed: [{ id: 1, ownerId: 1, name: 'a' }] });

    await expect(repository.get(1)).resolves.toEqual({ id: 1, ownerId: 1, name: 'a' });

    const replaced = await repository.replace(1, { ownerId: 2, name: 'b' });
    expect(replaced).toEqual({ id: 1, ownerId: 2, name: 'b' });

    const patched = await repository.patch(1, { name: 'c' });
    expect(patched).toEqual({ id: 1, ownerId: 2, name: 'c' });

    await expect(repository.remove(1)).resolves.toBeNull();
    await expect(repository.get(1)).rejects.toThrow();
  });

  it('throws NotFoundException for a missing id', async () => {
    const repository = inMemoryAdapter(widgets, {});
    await expect(repository.get(999)).rejects.toThrow('/widgets/999 not found');
  });
});
