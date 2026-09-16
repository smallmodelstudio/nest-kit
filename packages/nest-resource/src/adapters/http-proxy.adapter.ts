import {
  paginatedEnvelopeSchema,
  successEnvelopeSchema,
  type OperationName,
  type ResourceTypes,
} from '@smallmodelstudio/contract';
import type { NestHttpService } from '@smallmodelstudio/nest-http';
import { z } from 'zod';
import type {
  AnyResourceContract,
  ResourceListResult,
  ResourceRepository,
} from '../resource-repository';

function operationPath(
  contract: AnyResourceContract,
  op: OperationName,
  id?: number | string,
): string {
  const route = contract.routes[op];
  if (!route) {
    throw new Error(`Resource "${contract.path}" does not declare a "${op}" operation`);
  }
  return route.path === ''
    ? contract.path
    : `${contract.path}/${route.path.replace(':id', String(id))}`;
}

/**
 * Proxies a resource's CRUD operations to an upstream exposing the same
 * contract, through `NestHttpService` — so correlation-id forwarding and
 * retry metrics apply to every call. Builds requests the same way
 * `@smallmodelstudio/http-client/contract`'s `createContractClient` does;
 * duplicated rather than shared, since that lives in a lower layer this
 * package could import but which has no reason to depend back up on it.
 */
export function httpProxyAdapter<R extends AnyResourceContract>(
  contract: R,
  http: NestHttpService,
): ResourceRepository<R> {
  return {
    async list(query) {
      const raw = await http.get(operationPath(contract, 'list'), {
        query: query as Record<string, string | number | boolean | undefined>,
      });
      if (contract.pagination === 'offset') {
        const parsed = paginatedEnvelopeSchema(contract.entity).parse(raw);
        return { items: parsed.data, page: parsed.meta.page } as ResourceListResult<R>;
      }
      const parsed = successEnvelopeSchema(z.array(contract.entity)).parse(raw);
      return parsed.data as ResourceListResult<R>;
    },

    async get(id) {
      const raw = await http.get(operationPath(contract, 'get', id));
      return successEnvelopeSchema(contract.entity).parse(raw).data as ResourceTypes<R>['entity'];
    },

    async create(body) {
      const raw = await http.post(operationPath(contract, 'create'), body);
      return successEnvelopeSchema(contract.entity).parse(raw).data as ResourceTypes<R>['entity'];
    },

    async replace(id, body) {
      const raw = await http.put(operationPath(contract, 'replace', id), body);
      return successEnvelopeSchema(contract.entity).parse(raw).data as ResourceTypes<R>['entity'];
    },

    async patch(id, body) {
      const raw = await http.patch(operationPath(contract, 'patch', id), body);
      return successEnvelopeSchema(contract.entity).parse(raw).data as ResourceTypes<R>['entity'];
    },

    async remove(id) {
      await http.delete(operationPath(contract, 'remove', id));
      return null;
    },
  };
}
