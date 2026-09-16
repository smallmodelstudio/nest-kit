import { metrics, type Counter } from '@opentelemetry/api';

// `metrics.getMeter()` returns a real Meter once an OTel SDK has registered
// a MeterProvider, and a no-op Meter otherwise (unit/e2e tests, or no SDK at
// all) — so this is always safe to call. Package-local rather than routed
// through `nest-metrics`: packages in the same layer stay independent of
// each other (see docs/README-architecture.md#packages-and-layers).
const meter = metrics.getMeter('@smallmodelstudio/nest-cache');

const cacheLookups: Counter = meter.createCounter('http_cache_lookups_total', {
  description: 'HttpCacheInterceptor lookups, labeled by result',
});

export function recordCacheLookup(result: 'hit' | 'miss'): void {
  cacheLookups.add(1, { result });
}
