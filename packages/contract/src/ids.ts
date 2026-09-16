import { z } from 'zod';

// Only digits, no leading zero: rejects hex (`0x1`), exponential notation
// (`1e2`), a leading `+` and whitespace before any conversion happens.
const POSITIVE_INT_PATTERN = /^[1-9]\d*$/;

// Same idea, but allows `0` and a leading `-` for general-purpose strict
// integers (offsets, limits, signed fields).
const STRICT_INT_PATTERN = /^-?(0|[1-9]\d*)$/;

/**
 * A path/query id: digits only, no leading zero, converted to a number.
 * Used for entity primary keys and foreign keys.
 */
export function zId() {
  return z
    .string()
    .regex(POSITIVE_INT_PATTERN, 'Must be a positive integer')
    .transform(Number);
}

export interface ZStrictIntOptions {
  min?: number;
  max?: number;
}

/**
 * A general strict integer, converted from its raw string form. Unlike
 * `z.coerce.number()`, it rejects hex, exponential notation, a leading `+`
 * and whitespace, since the regex checks the raw string before conversion.
 */
export function zStrictInt(options: ZStrictIntOptions = {}) {
  return z
    .string()
    .regex(STRICT_INT_PATTERN, 'Must be a strict integer')
    .transform(Number)
    .refine(
      (value) => options.min === undefined || value >= options.min,
      `Must be >= ${options.min}`,
    )
    .refine(
      (value) => options.max === undefined || value <= options.max,
      `Must be <= ${options.max}`,
    );
}
