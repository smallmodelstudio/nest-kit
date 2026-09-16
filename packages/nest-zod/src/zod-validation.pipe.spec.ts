import { z } from 'zod';
import { ZodError } from 'zod';
import { describe, expect, it } from 'vitest';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  it('returns the parsed value', () => {
    const pipe = new ZodValidationPipe(z.object({ title: z.string() }));
    expect(pipe.transform({ title: 'hello' })).toEqual({ title: 'hello' });
  });

  it('throws a ZodError for invalid input', () => {
    const pipe = new ZodValidationPipe(z.object({ title: z.string() }));
    expect(() => pipe.transform({})).toThrow(ZodError);
  });
});
