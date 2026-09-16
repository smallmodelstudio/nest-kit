import type { PaginatedResult, ResourceContract, ResourceTypes } from '@smallmodelstudio/contract';
import type { z } from 'zod';

/** A resource contract with its type parameters widened, so this package works with any resource. */
export type AnyResourceContract = ResourceContract<
  z.ZodType,
  z.ZodObject,
  z.ZodObject,
  'offset' | undefined
>;

// Not conditioned on `R['pagination']`: TypeScript doesn't reliably infer a
// literal type (`'offset'`, here) through an *optional* generic property
// across `defineResource`'s call sites (confirmed with a minimal repro —
// `interface C<P extends 'offset' | undefined = undefined> { p?: P }`
// infers `P` as `undefined` even when called with `{ p: 'offset' }`).
// `nest-envelope`'s `TransformInterceptor` already resolves this the same
// way at runtime, via `isPaginatedResult()` — that's the pattern this
// mirrors, rather than relying on a compile-time guarantee that doesn't
// actually hold.
export type ResourceListResult<R extends AnyResourceContract> =
  | PaginatedResult<ResourceTypes<R>['entity']>
  | ResourceTypes<R>['entity'][];

/**
 * What every adapter (in-memory, HTTP-proxy, `nest-drizzle`'s
 * `drizzleAdapter`) implements, and what a generated service depends on
 * through `@InjectRepository(contract)` instead of a concrete adapter.
 */
export interface ResourceRepository<R extends AnyResourceContract> {
  list(query: ResourceTypes<R>['query']): Promise<ResourceListResult<R>>;
  get(id: number | string): Promise<ResourceTypes<R>['entity']>;
  create(body: ResourceTypes<R>['create']): Promise<ResourceTypes<R>['entity']>;
  replace(
    id: number | string,
    body: ResourceTypes<R>['create'],
  ): Promise<ResourceTypes<R>['entity']>;
  patch(id: number | string, body: ResourceTypes<R>['patch']): Promise<ResourceTypes<R>['entity']>;
  remove(id: number | string): Promise<null>;
}
