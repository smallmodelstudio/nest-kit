import { z } from 'zod';
import { pageInfoSchema, type PageInfo } from './pagination';

export const metaSchema = z.object({
  timestamp: z.string(),
  correlationId: z.string(),
});

export const paginatedMetaSchema = metaSchema.extend({
  page: pageInfoSchema,
});

export function successEnvelopeSchema<T extends z.ZodType>(data: T) {
  return z.object({ data, meta: metaSchema });
}

export function paginatedEnvelopeSchema<T extends z.ZodType>(item: T) {
  return z.object({ data: z.array(item), meta: paginatedMetaSchema });
}

export const errorEnvelopeSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  error: z.string(),
  path: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

/** A `list` result carrying its own pagination info, ready for the envelope's `meta.page`. */
export interface PaginatedResult<T> {
  items: T[];
  page: PageInfo;
}

export function isPaginatedResult(
  value: unknown,
): value is PaginatedResult<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    'page' in value &&
    Array.isArray((value as { items: unknown }).items)
  );
}
