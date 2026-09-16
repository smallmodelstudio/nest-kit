import { NotFoundException } from '@nestjs/common';
import type { ResourceTypes } from '@smallmodelstudio/contract';
import type { AnyResourceContract, ResourceRepository } from '../resource-repository';

export interface InMemoryAdapterOptions<R extends AnyResourceContract> {
  seed?: ResourceTypes<R>['entity'][];
  /**
   * Extra filtering beyond offset/limit pagination — e.g. a query field like
   * `userId`. Runs before pagination is applied. Defaults to no filtering.
   */
  filter?: (entity: ResourceTypes<R>['entity'], query: ResourceTypes<R>['query']) => boolean;
}

type WithId = { id: number };

// A plain `async` method would work too, but `require-await` (correctly)
// flags one with no `await` in its body — and these can throw
// synchronously (`getOrThrow`), so simply returning `Promise.resolve(...)`
// around the call isn't enough: the throw would happen before the Promise
// wrapper does, escaping the returned promise instead of rejecting it. A
// `Promise` executor converts a synchronous throw inside it into a
// rejection, which is exactly the semantics `ResourceRepository`'s
// `Promise`-returning methods need.
function toPromise<T>(compute: () => T): Promise<T> {
  return new Promise((resolve) => {
    resolve(compute());
  });
}

/** An in-process array-backed `ResourceRepository`, for a playground or a unit test. */
export function inMemoryAdapter<R extends AnyResourceContract>(
  contract: R,
  options: InMemoryAdapterOptions<R> = {},
): ResourceRepository<R> {
  type Entity = ResourceTypes<R>['entity'] & WithId;

  const filter = options.filter;
  let items: Entity[] = (options.seed ?? []).map(
    (item) => ({ ...(item as object) }) as Entity,
  );
  let nextId = items.reduce((max, item) => Math.max(max, item.id), 0) + 1;

  function getOrThrow(id: number): Entity {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) {
      throw new NotFoundException(`${contract.path}/${id} not found`);
    }
    return item;
  }

  return {
    list(query) {
      return toPromise(() => {
        const filtered = filter ? items.filter((item) => filter(item, query)) : items;

        if (contract.pagination === 'offset') {
          const { offset, limit } = query as { offset: number; limit: number };
          const page = filtered.slice(offset, offset + limit);
          return {
            items: page,
            page: { offset, limit, total: filtered.length },
          };
        }
        return filtered;
      });
    },

    get(id) {
      return toPromise(() => getOrThrow(Number(id)));
    },

    create(body) {
      return toPromise(() => {
        const entity = { ...(body as object), id: nextId++ } as Entity;
        items.push(entity);
        return entity;
      });
    },

    replace(id, body) {
      return toPromise(() => {
        const existing = getOrThrow(Number(id));
        const replaced = { ...(body as object), id: existing.id } as Entity;
        items = items.map((item) => (item.id === existing.id ? replaced : item));
        return replaced;
      });
    },

    patch(id, body) {
      return toPromise(() => {
        const existing = getOrThrow(Number(id));
        const patched = { ...existing, ...(body as object) };
        items = items.map((item) => (item.id === existing.id ? patched : item));
        return patched;
      });
    },

    remove(id) {
      return toPromise(() => {
        const existing = getOrThrow(Number(id));
        items = items.filter((item) => item.id !== existing.id);
        return null;
      });
    },
  };
}
