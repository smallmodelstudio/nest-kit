# @smallmodelstudio/nest-http

```ts
@Module({
  imports: [
    NestHttpModule.forRoot({
      baseUrl: 'https://example.com',
      timeoutMs: 5000,
      retries: 2,
      getCorrelationId: () => RequestContext.correlationId(),
    }),
  ],
})
export class AppModule {}

@Injectable()
export class ThingsService {
  constructor(@InjectHttpClient() private readonly http: NestHttpService) {}

  findAll() {
    return this.http.get('/things');
  }
}
```

Wraps `@smallmodelstudio/http-client`'s `HttpClient` for use inside a Nest app:

- `getCorrelationId` (optional) supplies the outgoing `x-correlation-id`
  header, read fresh per request — e.g.
  `() => RequestContext.correlationId()` from `@smallmodelstudio/nest-context`.
  `nest-http` doesn't depend on `nest-context` directly (packages in the same
  layer stay independent of each other).
- Every retried attempt (safe methods only — see `http-client`'s README)
  records an `http_client_retries_total` OpenTelemetry counter, labeled by
  method.
- `baseUrl`, `timeoutMs` and `retries` are config-driven the same way
  `ConfigKitModule.forRoot` itself is: compute them synchronously (from
  `process.env`, or `@smallmodelstudio/nest-config`'s exported
  `parseConfig()`) and pass the result into `forRoot()`.

`InjectHttpClient()` injects the `NestHttpService` `forRoot()` provides.
