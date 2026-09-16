import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { fake } from './fake';

describe('fake', () => {
  it('generates every primitive the schema covers', () => {
    const schema = z.object({
      title: z.string(),
      count: z.number(),
      active: z.boolean(),
      kind: z.literal('post'),
      status: z.enum(['draft', 'published']),
    });

    const result = fake(schema);

    expect(result.title).toMatch(/^title-\d+$/);
    expect(typeof result.count).toBe('number');
    expect(result.active).toBe(true);
    expect(result.kind).toBe('post');
    expect(result.status).toBe('draft');
  });

  it('fakes each element of an array', () => {
    const result = fake(z.object({ tags: z.array(z.string()) }));
    expect(result.tags).toHaveLength(1);
    expect(result.tags[0]).toMatch(/^tags-\d+$/);
  });

  it('fakes the inner type of an optional or nullable field', () => {
    const schema = z.object({
      maybe: z.string().optional(),
      nullable: z.string().nullable(),
    });
    const result = fake(schema);
    expect(result.maybe).toMatch(/^maybe-\d+$/);
    expect(result.nullable).toMatch(/^nullable-\d+$/);
  });

  it('uses the declared value for a defaulted field', () => {
    const result = fake(z.object({ limit: z.number().default(20) }));
    expect(result.limit).toBe(20);
  });

  it('fakes nested objects', () => {
    const schema = z.object({ author: z.object({ name: z.string() }) });
    const result = fake(schema);
    expect(result.author.name).toMatch(/^name-\d+$/);
  });

  it('produces distinct values across calls', () => {
    const schema = z.object({ id: z.number() });
    const first = fake(schema);
    const second = fake(schema);
    expect(first.id).not.toBe(second.id);
  });

  it('throws a clear error for an unsupported schema type', () => {
    expect(() => fake(z.union([z.string(), z.number()]))).toThrow(
      /unsupported Zod schema type "union"/,
    );
  });
});
