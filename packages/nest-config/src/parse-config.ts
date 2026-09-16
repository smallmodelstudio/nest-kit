import type { z } from 'zod';

/**
 * Parses `source` (defaults to `process.env`) against `schema` and throws a
 * readable error listing every failing field if it doesn't validate.
 * `schema`'s own `.transform()` is what turns flat env var names into the
 * nested shape a consumer actually wants — this stays a thin wrapper around
 * `schema.safeParse()` on purpose, so that shape lives in one place: the
 * schema itself.
 */
export function parseConfig<S extends z.ZodType>(
  schema: S,
  source: Record<string, string | undefined> = process.env,
): z.output<S> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data;
}
