import {
  applyDecorators,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  SetMetadata,
} from '@nestjs/common';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import {
  envelopeOpenApiSchema,
  toOpenApiSchema,
  type HttpMethod,
  type OperationName,
} from '@smallmodelstudio/contract';
import { z } from 'zod';
import type { AnyResourceContract } from './any-resource-contract';

export const CACHE_TTL_METADATA_KEY = 'nest-kit:cache-ttl';

const ROUTE_DECORATORS: Record<HttpMethod, (path: string) => MethodDecorator> =
  {
    GET: Get,
    POST: Post,
    PUT: Put,
    PATCH: Patch,
    DELETE: Delete,
  };

function buildResponseSchema(
  resource: AnyResourceContract,
  operation: OperationName,
): Record<string, unknown> {
  if (operation === 'list') {
    const entitySchema = toOpenApiSchema(resource.entity);
    return resource.pagination === 'offset'
      ? envelopeOpenApiSchema(
          { type: 'array', items: entitySchema },
          { paginated: true },
        )
      : envelopeOpenApiSchema({ type: 'array', items: entitySchema });
  }
  if (operation === 'remove') {
    return envelopeOpenApiSchema(toOpenApiSchema(z.null()));
  }
  return envelopeOpenApiSchema(toOpenApiSchema(resource.entity));
}

function buildRequestBodySchema(
  resource: AnyResourceContract,
  operation: OperationName,
): z.ZodType | undefined {
  if (operation === 'patch') return resource.create.partial();
  if (operation === 'create' || operation === 'replace') return resource.create;
  return undefined;
}

/** Applies the route, an `@ApiResponse` and cache metadata for `operation`, from the resource contract. */
export function Operation(
  resource: AnyResourceContract,
  operation: OperationName,
): MethodDecorator {
  const route = resource.routes[operation];
  if (!route) {
    throw new Error(
      `Resource '${resource.path}' has no '${operation}' operation`,
    );
  }

  const responseSchema = buildResponseSchema(resource, operation);
  const decorators = [
    ROUTE_DECORATORS[route.method](route.path),
    ApiResponse({
      status: operation === 'create' ? 201 : 200,
      schema: responseSchema,
    }),
  ];

  const requestBodySchema = buildRequestBodySchema(resource, operation);
  if (requestBodySchema) {
    decorators.push(
      ApiBody({
        schema: toOpenApiSchema(requestBodySchema, { io: 'input' }),
      }),
    );
  }

  const cacheTtl = resource.cache?.[operation];
  if (cacheTtl !== undefined) {
    decorators.push(SetMetadata(CACHE_TTL_METADATA_KEY, cacheTtl));
  }

  return applyDecorators(...decorators);
}
