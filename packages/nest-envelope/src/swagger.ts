import {
  envelopeOpenApiSchema,
  toOpenApiSchema,
} from '@smallmodelstudio/contract';
import { ApiResponse } from '@nestjs/swagger';
import type { z } from 'zod';

export interface ApiEnvelopeResponseOptions {
  status?: number;
  /** Wrap `schema` as a list with pagination `meta.page`, instead of a single value. */
  paginated?: boolean;
}

/**
 * Documents a response as the `{ data, meta }` success envelope for `schema`.
 * For routes built from a resource contract, prefer `nest-zod`'s `@Operation`,
 * which derives this from the contract directly.
 */
export function ApiEnvelopeResponse(
  schema: z.ZodType,
  options: ApiEnvelopeResponseOptions = {},
): MethodDecorator {
  const itemSchema = toOpenApiSchema(schema);
  const dataSchema = options.paginated
    ? { type: 'array', items: itemSchema }
    : itemSchema;
  return ApiResponse({
    status: options.status ?? 200,
    schema: envelopeOpenApiSchema(dataSchema, {
      paginated: options.paginated ?? false,
    }),
  });
}
