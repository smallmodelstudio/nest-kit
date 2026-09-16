import { randomUUID } from 'node:crypto';
import { trace } from '@opentelemetry/api';
import type { FastifyInstance } from 'fastify';
import { RequestContext } from './request-context';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

// Bounds what a client-supplied header can do once it's echoed back in the
// response header and logged on every line for the request: no control
// characters (log-line injection), no unbounded length, nothing that isn't
// safe to drop straight into a header value. A trace id (32 lowercase hex)
// and a typical UUID both satisfy this; it's deliberately wider than either
// so a caller's own request-id scheme keeps working.
const MAX_CORRELATION_ID_LENGTH = 128;
const VALID_CORRELATION_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function isValidCorrelationId(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= MAX_CORRELATION_ID_LENGTH &&
    VALID_CORRELATION_ID_PATTERN.test(value)
  );
}

// Deliberately a raw Fastify `onRequest` hook rather than a Nest interceptor
// or guard: both of those only run once a route has matched, so a request to
// an unknown path (404, no controller at all) would reach an exception
// filter with no correlation id ever set. `onRequest` fires for every
// request — matched or not.
//
// `done()` is called from inside `RequestContext.run(...)` so the
// AsyncLocalStorage context covers the rest of this request's lifecycle —
// every hook, the handler, and the response — which is how downstream
// packages (`nest-errors`, `nest-envelope`, `nest-logging`) read the
// correlation id back, instead of each needing their own way to stash it on
// the request.
export function registerCorrelationIdHook(instance: FastifyInstance): void {
  instance.addHook('onRequest', (request, reply, done) => {
    const incoming = request.headers[CORRELATION_ID_HEADER];
    const incomingValue = Array.isArray(incoming) ? incoming[0] : incoming;
    const trimmedIncomingValue = incomingValue?.trim();
    const correlationId =
      trimmedIncomingValue && isValidCorrelationId(trimmedIncomingValue)
        ? trimmedIncomingValue
        : generateCorrelationId();

    request.correlationId = correlationId;
    void reply.header(CORRELATION_ID_HEADER, correlationId);

    RequestContext.run({ correlationId }, done);
  });
}

// Reuses OTel's active span's trace id as the default correlation id, when
// one is active (an OTel SDK is running and instrumenting incoming HTTP
// requests) — that threads the same identifier through the response
// envelope, the access log line, and every pino log line for the request.
// Without an active span (unit/e2e tests, or no `--import` at boot) this
// falls back to `randomUUID()`.
//
// A client-supplied `x-correlation-id` that passes `isValidCorrelationId()`
// above is still honoured as given, taking priority over the trace id — so
// the two can legitimately diverge for a client-driven correlation id. A
// header that fails validation (too long, or outside the allowed charset)
// falls back to this instead, the same as no header at all.
function generateCorrelationId(): string {
  return trace.getActiveSpan()?.spanContext().traceId ?? randomUUID();
}
