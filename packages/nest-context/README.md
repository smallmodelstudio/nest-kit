# @smallmodelstudio/nest-context

Per-request context, available anywhere in the async call graph a request
triggers:

```ts
import { RequestContext } from '@smallmodelstudio/nest-context';

RequestContext.correlationId(); // available in any interceptor, filter, or logger
```

Register the hook that populates it once, on the raw Fastify instance (it has
to run for unmatched routes too, so it can't be a Nest interceptor or guard):

```ts
import { registerCorrelationIdHook } from '@smallmodelstudio/nest-context';

registerCorrelationIdHook(app.getHttpAdapter().getInstance());
```

A client-supplied `x-correlation-id` header is honoured when present and
valid; otherwise the id falls back to the active OpenTelemetry span's trace
id, then to a random UUID. Either way it's echoed back as a response header
and kept in `AsyncLocalStorage` for the rest of the request.
