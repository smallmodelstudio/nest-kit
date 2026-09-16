import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseConfig } from './parse-config';

// Mirrors the shape of a typical service config: flat env var names in,
// nested config shape out, via the schema's own `.transform()`.
const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3000),
    UPSTREAM_BASE_URL: z.url().default('https://example.com'),
    UPSTREAM_TIMEOUT_MS: z.coerce.number().int().min(1).default(5000),
    CACHE_TTL_MS: z.coerce.number().int().min(0).default(30000),
  })
  .transform((env) => ({
    env: env.NODE_ENV,
    port: env.PORT,
    http: {
      baseUrl: env.UPSTREAM_BASE_URL,
      timeoutMs: env.UPSTREAM_TIMEOUT_MS,
    },
    cache: { ttlMs: env.CACHE_TTL_MS },
  }));

describe('parseConfig', () => {
  const validEnv = {
    NODE_ENV: 'development',
    PORT: '3000',
    UPSTREAM_BASE_URL: 'https://jsonplaceholder.typicode.com',
    UPSTREAM_TIMEOUT_MS: '5000',
  };

  it('accepts a valid environment, coerces types and builds the nested shape', () => {
    const result = parseConfig(schema, validEnv);

    expect(result).toEqual({
      env: 'development',
      port: 3000,
      http: {
        baseUrl: 'https://jsonplaceholder.typicode.com',
        timeoutMs: 5000,
      },
      cache: { ttlMs: 30000 },
    });
  });

  it('falls back to defaults when optional-looking values are absent', () => {
    const result = parseConfig(schema, {});

    expect(result.env).toBe('development');
    expect(result.port).toBe(3000);
  });

  it('reflects overridden env vars, coerced to the right types', () => {
    const result = parseConfig(schema, {
      ...validEnv,
      NODE_ENV: 'production',
      PORT: '8080',
    });

    expect(result.env).toBe('production');
    expect(result.port).toBe(8080);
  });

  it('rejects an invalid enum value', () => {
    expect(() =>
      parseConfig(schema, { ...validEnv, NODE_ENV: 'staging' }),
    ).toThrow(/Invalid environment variables/);
  });

  it('rejects a non-numeric value', () => {
    expect(() =>
      parseConfig(schema, { ...validEnv, PORT: 'not-a-number' }),
    ).toThrow(/Invalid environment variables/);
  });

  it('rejects a value outside the declared range', () => {
    expect(() => parseConfig(schema, { ...validEnv, PORT: '70000' })).toThrow(
      /Invalid environment variables/,
    );
  });

  it('rejects a malformed URL', () => {
    expect(() =>
      parseConfig(schema, { ...validEnv, UPSTREAM_BASE_URL: 'not-a-url' }),
    ).toThrow(/Invalid environment variables/);
  });

  it('accepts a zero value at the boundary', () => {
    const result = parseConfig(schema, { ...validEnv, CACHE_TTL_MS: '0' });

    expect(result.cache.ttlMs).toBe(0);
  });

  it('rejects a negative value below the boundary', () => {
    expect(() =>
      parseConfig(schema, { ...validEnv, CACHE_TTL_MS: '-1' }),
    ).toThrow(/Invalid environment variables/);
  });

  it('lists every failing field in the error message', () => {
    expect(() =>
      parseConfig(schema, { ...validEnv, NODE_ENV: 'staging', PORT: 'nope' }),
    ).toThrow(/NODE_ENV.*\n.*PORT|PORT.*\n.*NODE_ENV/s);
  });

  it('defaults the source to process.env', () => {
    const original = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    try {
      expect(parseConfig(schema).env).toBe('production');
    } finally {
      if (original === undefined) {
        delete process.env['NODE_ENV'];
      } else {
        process.env['NODE_ENV'] = original;
      }
    }
  });
});
