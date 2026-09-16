import { z } from 'zod';
import { HttpClient, type HttpClientOptions } from '../http-client';

// This package deliberately doesn't import `@smallmodelstudio/contract`,
// even for types: both are layer-0 packages (no Nest dependency, usable
// standalone or from a frontend), and dependency-cruiser enforces that
// layer-0 packages don't depend on each other, the same as
// `nest-zod`/`nest-resource` each redeclare their own `AnyResourceContract`
// rather than import one. What follows is a structural stand-in for
// `contract`'s `ResourceContract`/`ResourceTypes` — a real resource built
// with `defineResource()` satisfies it without any cast, since TypeScript
// types are structural.

export type OperationName = 'list' | 'get' | 'create' | 'replace' | 'patch' | 'remove';

interface ResourceRouteLike {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
}

export interface ResourceContractLike<
  TEntity extends z.ZodType = z.ZodType,
  TCreate extends z.ZodObject = z.ZodObject,
  TListQuery extends z.ZodType = z.ZodType,
> {
  path: string;
  entity: TEntity;
  create: TCreate;
  listQuery: TListQuery;
  operations: readonly OperationName[];
  pagination?: 'offset';
  routes: Partial<Record<OperationName, ResourceRouteLike>>;
}

type ResourceTypesLike<R extends ResourceContractLike> = {
  entity: z.infer<R['entity']>;
  create: z.infer<R['create']>;
  patch: Partial<z.infer<R['create']>>;
  query: z.infer<R['listQuery']>;
};

export interface PageInfo {
  offset: number;
  limit: number;
  total: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: PageInfo;
}

const metaSchema = z.object({ timestamp: z.string(), correlationId: z.string() });
const pageInfoSchema = z.object({
  offset: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
});

function envelopeSchema<T extends z.ZodType>(data: T) {
  return z.object({ data, meta: metaSchema });
}

function paginatedEnvelopeSchema<T extends z.ZodType>(item: T) {
  return z.object({ data: z.array(item), meta: metaSchema.extend({ page: pageInfoSchema }) });
}

// Not conditioned on the resource's `pagination` field: TypeScript doesn't
// reliably infer a literal type through an *optional* generic property
// across `defineResource`'s call sites (see the same note on
// `nest-resource`'s `ResourceListResult`). Callers narrow with
// `isPaginatedResult()` from `@smallmodelstudio/contract`, the same way
// `nest-envelope`'s `TransformInterceptor` does server-side.
export type ContractClientResult<R extends ResourceContractLike> =
  | PaginatedResult<ResourceTypesLike<R>['entity']>
  | ResourceTypesLike<R>['entity'][];

export interface ContractClient<R extends ResourceContractLike> {
  /** Every query field is optional here, since offset/limit fall back to the contract's own defaults server-side. */
  list(query?: Partial<ResourceTypesLike<R>['query']>): Promise<ContractClientResult<R>>;
  get(id: number | string): Promise<ResourceTypesLike<R>['entity']>;
  create(body: ResourceTypesLike<R>['create']): Promise<ResourceTypesLike<R>['entity']>;
  replace(
    id: number | string,
    body: ResourceTypesLike<R>['create'],
  ): Promise<ResourceTypesLike<R>['entity']>;
  patch(
    id: number | string,
    body: ResourceTypesLike<R>['patch'],
  ): Promise<ResourceTypesLike<R>['entity']>;
  remove(id: number | string): Promise<null>;
}

function operationPath(
  resource: ResourceContractLike,
  op: OperationName,
  id?: number | string,
): string {
  const route = resource.routes[op];
  if (!route) {
    throw new Error(`Resource "${resource.path}" does not declare a "${op}" operation`);
  }
  return route.path === ''
    ? resource.path
    : `${resource.path}/${route.path.replace(':id', String(id))}`;
}

/**
 * A typed client built from a resource contract: one method per CRUD
 * operation, hitting the same routes `nest-zod`'s `@ResourceController`
 * generates. Unwraps the `{ data, meta }` success envelope (and, for a
 * paginated `list`, reassembles a `PaginatedResult` from `data` +
 * `meta.page`), and runs every response through the contract's own Zod
 * schemas via `.parse()` as a runtime safety net.
 */
export function createContractClient<R extends ResourceContractLike>(
  resource: R,
  options: HttpClientOptions = {},
): ContractClient<R> {
  const client = new HttpClient(options);

  return {
    async list(query) {
      const raw = await client.get(
        operationPath(resource, 'list'),
        query === undefined
          ? undefined
          : { query: query as Record<string, string | number | boolean | undefined> },
      );
      if (resource.pagination === 'offset') {
        const parsed = paginatedEnvelopeSchema(resource.entity).parse(raw);
        return {
          items: parsed.data,
          page: parsed.meta.page,
        } as ContractClientResult<R>;
      }
      const parsed = envelopeSchema(z.array(resource.entity)).parse(raw);
      return parsed.data as ContractClientResult<R>;
    },

    async get(id) {
      const raw = await client.get(operationPath(resource, 'get', id));
      return envelopeSchema(resource.entity).parse(raw).data as ResourceTypesLike<R>['entity'];
    },

    async create(body) {
      const raw = await client.post(operationPath(resource, 'create'), body);
      return envelopeSchema(resource.entity).parse(raw).data as ResourceTypesLike<R>['entity'];
    },

    async replace(id, body) {
      const raw = await client.put(operationPath(resource, 'replace', id), body);
      return envelopeSchema(resource.entity).parse(raw).data as ResourceTypesLike<R>['entity'];
    },

    async patch(id, body) {
      const raw = await client.patch(operationPath(resource, 'patch', id), body);
      return envelopeSchema(resource.entity).parse(raw).data as ResourceTypesLike<R>['entity'];
    },

    async remove(id) {
      await client.delete(operationPath(resource, 'remove', id));
      return null;
    },
  };
}
