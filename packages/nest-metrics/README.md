# @smallmodelstudio/nest-metrics

Typed counters and histograms over the OpenTelemetry API — no-ops until an
OTel SDK (e.g. `@smallmodelstudio/otel`) registers a real `MeterProvider`:

```ts
import { defineCounter } from '@smallmodelstudio/nest-metrics';

const upstreamRetries = defineCounter('upstream_retries_total', {
  description: 'Retries issued against the upstream API',
});

upstreamRetries.add(1);
```

Plus a generic per-route interceptor:

```ts
{ provide: APP_INTERCEPTOR, useClass: MetricsInterceptor }
```

Records three instruments, labeled by HTTP method, route pattern and status
class (`2xx`/`4xx`/`5xx`):

- `http_server_requests_total` (counter)
- `http_server_request_duration_ms` (histogram)
- `http_server_request_errors_total` (counter; a handler that threw, before
  the status class is known)

Only ever sees requests that matched a route, the same as any Nest
interceptor — pair with `nest-context`'s correlation hook if you also need
metrics for unmatched routes.
