import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineOperation } from './operation';

describe('defineOperation', () => {
  it('returns the config as given, for a non-CRUD route', () => {
    const operation = defineOperation({
      method: 'GET',
      path: '/posts/:id/comments',
      params: z.object({ id: z.string() }),
      response: z.array(z.object({ id: z.number() })),
    });
    expect(operation.method).toBe('GET');
    expect(operation.path).toBe('/posts/:id/comments');
  });
});
