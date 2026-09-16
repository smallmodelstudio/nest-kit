export type HttpMethod = 'GET' | 'HEAD' | 'OPTIONS' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Retried on failure: GET, HEAD and OPTIONS never change state; PUT and
 * DELETE are idempotent by HTTP's own definition, so replaying them after a
 * dropped response is safe. POST and PATCH are never retried automatically.
 */
const SAFE_METHODS: ReadonlySet<HttpMethod> = new Set([
  'GET',
  'HEAD',
  'OPTIONS',
  'PUT',
  'DELETE',
]);

export function isSafeMethod(method: HttpMethod): boolean {
  return SAFE_METHODS.has(method);
}

export interface BackoffOptions {
  /** Base delay in ms before the first retry. Doubles per attempt. */
  baseDelayMs?: number;
  /** Upper bound on the computed delay, before jitter. */
  maxDelayMs?: number;
  /** Injectable source of randomness in [0, 1), for deterministic tests. */
  random?: () => number;
}

/**
 * Full-jitter exponential backoff: `random() * min(maxDelayMs, baseDelayMs *
 * 2^attempt)`. `attempt` is 0 for the delay before the first retry (i.e.
 * after the first failed attempt).
 */
export function backoffDelayMs(attempt: number, options: BackoffOptions = {}): number {
  const baseDelayMs = options.baseDelayMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 2000;
  const random = options.random ?? Math.random;
  const capped = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return Math.round(random() * capped);
}
