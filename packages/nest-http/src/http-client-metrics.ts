import { metrics, type Counter } from '@opentelemetry/api';

// Package-local rather than routed through `nest-metrics`: packages in the
// same layer stay independent of each other (see
// docs/README-architecture.md#packages-and-layers).
const meter = metrics.getMeter('@smallmodelstudio/nest-http');

const clientRetries: Counter = meter.createCounter('http_client_retries_total', {
  description: 'Retried outgoing HTTP requests, labeled by method',
});

export function recordRetry(method: string): void {
  clientRetries.add(1, { method });
}
