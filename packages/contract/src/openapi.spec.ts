import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  envelopeOpenApiSchema,
  mergeOpenApiComponents,
  toOpenApiSchema,
} from './openapi';

describe('toOpenApiSchema', () => {
  it('returns a $ref for a schema registered with .meta({ id })', () => {
    const schema = z.object({ id: z.number() }).meta({ id: 'OpenApiSpecPost' });
    expect(toOpenApiSchema(schema)).toEqual({
      $ref: '#/components/schemas/OpenApiSpecPost',
    });
  });

  it('inlines a schema with no id', () => {
    const schema = z.object({ title: z.string() });
    const result = toOpenApiSchema(schema);
    expect(result['type']).toBe('object');
    expect(result['properties']).toMatchObject({ title: { type: 'string' } });
  });

  it('represents optional and nullable fields correctly under openapi-3.0', () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
      nullable: z.string().nullable(),
    });
    const result = toOpenApiSchema(schema) as {
      required: string[];
      properties: Record<string, { type?: unknown; nullable?: unknown }>;
    };
    // OpenAPI 3.0 has no `null` type keyword: nullable fields use `nullable: true`.
    expect(result.properties['nullable']).toMatchObject({
      type: 'string',
      nullable: true,
    });
    // `nullable` must still be present (just possibly `null`); `optional`
    // may be absent entirely, so only it is missing from `required`.
    expect(result.required).toEqual(['required', 'nullable']);
    expect(result.properties['optional']).toEqual({ type: 'string' });
  });
});

describe('envelopeOpenApiSchema', () => {
  it('keeps a nested named schema as a real $ref, not a local definition', () => {
    // Regression test: running the whole envelope through z.toJSONSchema in one
    // call (rather than assembling it from already-converted parts) inlines a
    // named nested schema under a local `definitions`/`$defs` block instead of
    // pointing at `#/components/schemas/<id>`.
    const Widget = z
      .object({ id: z.number() })
      .meta({ id: 'OpenApiSpecEnvelopeWidget' });
    const result = envelopeOpenApiSchema(toOpenApiSchema(Widget)) as {
      properties: { data: unknown };
    };
    expect(result.properties.data).toEqual({
      $ref: '#/components/schemas/OpenApiSpecEnvelopeWidget',
    });
  });

  it('wraps data and meta with required set for both', () => {
    const result = envelopeOpenApiSchema({ type: 'string' }) as {
      required: string[];
    };
    expect(result.required).toEqual(['data', 'meta']);
  });

  it('includes page in meta when paginated', () => {
    const result = envelopeOpenApiSchema(
      { type: 'array', items: { type: 'string' } },
      { paginated: true },
    ) as { properties: { meta: { properties: Record<string, unknown> } } };
    expect(result.properties.meta.properties).toHaveProperty('page');
  });
});

describe('mergeOpenApiComponents', () => {
  it('adds every .meta({ id })-registered schema into components.schemas', () => {
    const Widget = z
      .object({ id: z.number(), name: z.string() })
      .meta({ id: 'OpenApiSpecWidget' });
    // Force registration/inclusion by referencing the schema.
    toOpenApiSchema(Widget);

    const document: { components?: { schemas?: Record<string, unknown> } } = {};
    mergeOpenApiComponents(document);

    expect(document.components?.schemas?.['OpenApiSpecWidget']).toMatchObject({
      type: 'object',
      properties: { name: { type: 'string' } },
    });
  });

  it('preserves schemas already on the document', () => {
    const document = {
      components: { schemas: { Existing: { type: 'string' } } },
    };
    mergeOpenApiComponents(document);
    expect(document.components.schemas['Existing']).toEqual({
      type: 'string',
    });
  });
});
