import { Body, Param, Query } from '@nestjs/common';
import { zId } from '@smallmodelstudio/contract';
import type { AnyResourceContract } from './any-resource-contract';
import { ZodValidationPipe } from './zod-validation.pipe';

/** Validates the whole query object against the resource's `listQuery` schema. */
export function ContractQuery(
  resource: AnyResourceContract,
): ParameterDecorator {
  return Query(new ZodValidationPipe(resource.listQuery));
}

/**
 * Validates a single path param. Phase 1 only supports the `id` param, which
 * every CRUD operation's path uses.
 */
export function ContractParam(
  _resource: AnyResourceContract,
  name: string,
): ParameterDecorator {
  return Param(name, new ZodValidationPipe(zId()));
}

/** Validates the body against the resource's `create` schema, or its `.partial()` for `patch`. */
export function ContractBody(
  resource: AnyResourceContract,
  operation: 'create' | 'replace' | 'patch',
): ParameterDecorator {
  const schema =
    operation === 'patch' ? resource.create.partial() : resource.create;
  return Body(new ZodValidationPipe(schema));
}
