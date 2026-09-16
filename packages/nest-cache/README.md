# @smallmodelstudio/nest-cache

```ts
{ provide: APP_INTERCEPTOR, useClass: HttpCacheInterceptor }
```

Wraps `@nestjs/cache-manager`'s `CacheInterceptor`:

- Keyed on the route pattern (`request.routeOptions.url`), not the raw
  request URL — Fastify bakes the query string into `request.url`, which
  would otherwise fragment the cache key per query combination for routes
  that don't want that.
- Never caches `/health*`, regardless of `@CacheTTL()`/exclusion config — a
  stale "ok" would defeat a liveness/readiness probe.
- Sets an `X-Cache: HIT`/`MISS` response header and records an
  `http_cache_lookups_total` OpenTelemetry counter, labeled by result.

Needs `@nestjs/cache-manager`'s `CacheModule` registered separately (it reads
the cache manager off the same `CACHE_MANAGER` token).
