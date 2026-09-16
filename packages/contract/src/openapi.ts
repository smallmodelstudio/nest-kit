import { z } from 'zod';
import { metaSchema, paginatedMetaSchema } from './envelope';

export interface ToOpenApiSchemaOptions {
  io?: 'input' | 'output';
}

/**
 * Converts a Zod schema to an OpenAPI 3.0 schema object. A schema registered
 * with `.meta({ id })` becomes a `$ref` into `components.schemas` instead of
 * an inline schema; pair this with `mergeOpenApiComponents` so the ref
 * resolves.
 */
export function toOpenApiSchema(
  schema: z.ZodType,
  options: ToOpenApiSchemaOptions = {},
): Record<string, unknown> {
  const id = schema.meta()?.id;
  if (id) {
    return { $ref: `#/components/schemas/${id}` };
  }
  return z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: options.io ?? 'output',
    unrepresentable: 'any',
  });
}

export interface EnvelopeOpenApiSchemaOptions {
  paginated?: boolean;
}

/**
 * Builds the `{ data, meta }` envelope's OpenAPI schema around an
 * already-converted `dataSchema` (typically `toOpenApiSchema(entity)`, or an
 * array wrapping it). Building it this way, instead of running the whole
 * envelope through `z.toJSONSchema` at once, keeps a `$ref`'d `dataSchema`
 * (e.g. a resource entity) a real `$ref` — `z.toJSONSchema` has no way to
 * know that a named schema nested inside a larger, unnamed one should point
 * at `components.schemas` instead of being inlined under a local `$defs`.
 */
export function envelopeOpenApiSchema(
  dataSchema: Record<string, unknown>,
  options: EnvelopeOpenApiSchemaOptions = {},
): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      data: dataSchema,
      meta: toOpenApiSchema(
        options.paginated ? paginatedMetaSchema : metaSchema,
      ),
    },
    required: ['data', 'meta'],
  };
}

/** Every schema registered via `.meta({ id })`, converted to OpenAPI 3.0 schema objects. */
export function collectOpenApiComponents(): Record<string, unknown> {
  const { schemas } = z.toJSONSchema(z.globalRegistry, {
    target: 'openapi-3.0',
    unrepresentable: 'any',
  });
  return schemas;
}

export interface OpenApiDocumentLike {
  components?: {
    schemas?: Record<string, unknown>;
  };
}

/**
 * Merges every `.meta({ id })`-registered schema into `document.components.schemas`,
 * so `toOpenApiSchema`'s `$ref`s resolve. Call after `SwaggerModule.createDocument`
 * and before `SwaggerModule.setup`.
 */
export function mergeOpenApiComponents(document: OpenApiDocumentLike): void {
  const schemas = collectOpenApiComponents();
  document.components = {
    ...document.components,
    schemas: { ...document.components?.schemas, ...schemas },
  };
}
