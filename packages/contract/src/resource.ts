import { z } from 'zod';
import type { HttpMethod } from './operation';
import { offsetQueryFields } from './pagination';

export type OperationName =
  'list' | 'get' | 'create' | 'replace' | 'patch' | 'remove';

export interface ResourceRoute {
  method: HttpMethod;
  /** Relative to the resource's base `path`: `''` or `':id'`. */
  path: string;
}

const ROUTES: Record<OperationName, ResourceRoute> = {
  list: { method: 'GET', path: '' },
  get: { method: 'GET', path: ':id' },
  create: { method: 'POST', path: '' },
  replace: { method: 'PUT', path: ':id' },
  patch: { method: 'PATCH', path: ':id' },
  remove: { method: 'DELETE', path: ':id' },
};

type EmptyQuery = z.ZodObject<Record<string, never>>;

/** `query`, extended with `offset`/`limit` when `pagination: 'offset'`. */
export type ListQuerySchema<
  TQuery extends z.ZodObject,
  TPagination extends 'offset' | undefined,
> = TPagination extends 'offset'
  ? z.ZodObject<TQuery['shape'] & typeof offsetQueryFields>
  : TQuery;

export interface ResourceConfig<
  TEntity extends z.ZodType,
  TCreate extends z.ZodObject,
  TQuery extends z.ZodObject = EmptyQuery,
  TPagination extends 'offset' | undefined = undefined,
> {
  path: string;
  entity: TEntity;
  create: TCreate;
  query?: TQuery;
  operations: readonly OperationName[];
  pagination?: TPagination;
  cache?: Partial<Record<OperationName, number>>;
}

export interface ResourceContract<
  TEntity extends z.ZodType,
  TCreate extends z.ZodObject,
  TQuery extends z.ZodObject = EmptyQuery,
  TPagination extends 'offset' | undefined = undefined,
> extends ResourceConfig<TEntity, TCreate, TQuery, TPagination> {
  routes: Partial<Record<OperationName, ResourceRoute>>;
  listQuery: ListQuerySchema<TQuery, TPagination>;
}

export function defineResource<
  TEntity extends z.ZodType,
  TCreate extends z.ZodObject,
  TQuery extends z.ZodObject = EmptyQuery,
  TPagination extends 'offset' | undefined = undefined,
>(
  config: ResourceConfig<TEntity, TCreate, TQuery, TPagination>,
): ResourceContract<TEntity, TCreate, TQuery, TPagination> {
  const routes: Partial<Record<OperationName, ResourceRoute>> = {};
  for (const operation of config.operations) {
    routes[operation] = ROUTES[operation];
  }

  const baseQuery = config.query ?? z.object({});
  const listQuery = (
    config.pagination === 'offset'
      ? baseQuery.extend(offsetQueryFields)
      : baseQuery
  ) as ListQuerySchema<TQuery, TPagination>;

  return { ...config, routes, listQuery };
}
