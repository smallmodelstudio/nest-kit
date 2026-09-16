export type UpstreamErrorKind = 'TIMEOUT' | 'NETWORK_ERROR' | 'BAD_RESPONSE';

export interface UpstreamErrorOptions {
  /** The upstream's status code, when `kind` is `BAD_RESPONSE`. */
  status?: number;
  /** The upstream's parsed response body, when `kind` is `BAD_RESPONSE`. */
  body?: unknown;
  cause?: unknown;
}

/**
 * Thrown for every failure talking to an upstream: a timed-out attempt, a
 * `fetch()` rejection (DNS, connection refused, …), or a non-2xx response
 * once retries (if any) are exhausted. `nest-errors`' built-in mapper turns
 * this into a response: `TIMEOUT` → 504, an upstream 4xx `BAD_RESPONSE` →
 * passed through with a generic message, anything else → 502.
 */
export class UpstreamError extends Error {
  readonly kind: UpstreamErrorKind;
  readonly status?: number;
  readonly body?: unknown;

  constructor(kind: UpstreamErrorKind, message: string, options: UpstreamErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'UpstreamError';
    this.kind = kind;
    if (options.status !== undefined) {
      this.status = options.status;
    }
    this.body = options.body;
  }
}
