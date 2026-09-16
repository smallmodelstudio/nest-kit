import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  errorEnvelopeSchema,
  isPaginatedResult,
  paginatedEnvelopeSchema,
  successEnvelopeSchema,
} from './envelope';

describe('successEnvelopeSchema', () => {
  it('wraps the data schema with meta', () => {
    const schema = successEnvelopeSchema(z.object({ id: z.number() }));
    const result = schema.parse({
      data: { id: 1 },
      meta: { timestamp: 'now', correlationId: 'abc' },
    });
    expect(result.data).toEqual({ id: 1 });
  });
});

describe('paginatedEnvelopeSchema', () => {
  it('wraps an array with page info in meta', () => {
    const schema = paginatedEnvelopeSchema(z.object({ id: z.number() }));
    const result = schema.parse({
      data: [{ id: 1 }],
      meta: {
        timestamp: 'now',
        correlationId: 'abc',
        page: { offset: 0, limit: 20, total: 1 },
      },
    });
    expect(result.meta.page.total).toBe(1);
  });
});

describe('errorEnvelopeSchema', () => {
  it('matches the documented error shape', () => {
    expect(
      errorEnvelopeSchema.safeParse({
        statusCode: 404,
        message: 'Not Found',
        error: 'Not Found',
        path: '/posts/999',
        timestamp: 'now',
        correlationId: 'abc',
      }).success,
    ).toBe(true);
  });
});

describe('isPaginatedResult', () => {
  it('recognises a paginated result', () => {
    expect(
      isPaginatedResult({
        items: [],
        page: { offset: 0, limit: 20, total: 0 },
      }),
    ).toBe(true);
  });

  it('rejects plain values', () => {
    expect(isPaginatedResult({ id: 1 })).toBe(false);
    expect(isPaginatedResult([1, 2, 3])).toBe(false);
    expect(isPaginatedResult(null)).toBe(false);
  });
});
