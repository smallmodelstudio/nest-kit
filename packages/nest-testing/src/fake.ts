import type { z } from 'zod';
import type { core } from 'zod';

// A process-wide counter, not reset between calls, so two `fake()` calls in
// the same test never produce colliding values by accident (e.g. two fake
// posts that both got `id: 1`).
let counter = 0;
function next(): number {
  counter += 1;
  return counter;
}

/**
 * Generates a plain fixture value from a Zod schema — enough to exercise a
 * contract's entity shape in a test without hand-writing one. Not
 * format-aware (no fake emails/names): strings become `"<field>-<n>"`,
 * numbers an incrementing counter, covering the schema shapes a contract
 * entity actually uses. Anything else throws, naming the unsupported type.
 */
export function fake<S extends z.ZodType>(schema: S): z.output<S> {
  return fakeValue(schema) as z.output<S>;
}

// Walks `core.$ZodType` (not the classic `z.ZodType`) throughout: a def's
// nested schemas (`element`, `shape`, `innerType`, ...) are typed at that
// more general, core level, which the classic `z.ZodType` passed into
// `fake()` is always assignable down to.
function fakeValue(schema: core.$ZodType, keyHint?: string): unknown {
  const def = schema._zod.def;
  switch (def.type) {
    case 'object': {
      const { shape } = def as unknown as {
        shape: Record<string, core.$ZodType>;
      };
      const result: Record<string, unknown> = {};
      for (const [key, valueSchema] of Object.entries(shape)) {
        result[key] = fakeValue(valueSchema, key);
      }
      return result;
    }
    case 'array': {
      const { element } = def as unknown as { element: core.$ZodType };
      return [fakeValue(element, keyHint)];
    }
    case 'string':
      return `${keyHint ?? 'string'}-${next()}`;
    case 'number':
      return next();
    case 'boolean':
      return true;
    case 'literal': {
      const { values } = def as unknown as { values: unknown[] };
      return values[0];
    }
    case 'enum': {
      const { entries } = def as unknown as {
        entries: Record<string, unknown>;
      };
      return Object.values(entries)[0];
    }
    case 'optional':
    case 'nullable': {
      const { innerType } = def as unknown as { innerType: core.$ZodType };
      return fakeValue(innerType, keyHint);
    }
    case 'default': {
      const { defaultValue } = def as unknown as { defaultValue: unknown };
      return defaultValue;
    }
    default:
      throw new Error(`fake(): unsupported Zod schema type "${def.type}"`);
  }
}
