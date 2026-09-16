# @smallmodelstudio/nest-health

```ts
@Module({ imports: [NestHealthModule.forRoot({ drainDelayMs: 5000 })] })
export class AppModule {}
```

- `GET /health/live` — checks nothing; must never fail because of a
  downstream fault, or Kubernetes restarts every pod in a loop for
  something none of them can fix.
- `GET /health/ready` — runs whatever indicators you provide under
  `HEALTH_READY_INDICATORS` (a `HealthIndicatorFunction[]` from
  `@nestjs/terminus`), and fails during the shutdown drain window.

```ts
providers: [
  {
    provide: HEALTH_READY_INDICATORS,
    inject: [HttpHealthIndicator],
    useFactory: (http: HttpHealthIndicator) => [
      () => http.pingCheck('upstream', 'https://example.com/ping'),
    ],
  },
],
```

On `SIGTERM`/`SIGINT` (with `app.enableShutdownHooks()` on), `/health/ready`
starts failing immediately — before Nest closes the HTTP server — and stays
failing for `drainDelayMs` (default 5000ms) before shutdown actually
proceeds. That gives Kubernetes time to stop routing new traffic before the
server itself stops accepting connections.
