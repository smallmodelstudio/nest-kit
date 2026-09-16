# @smallmodelstudio/nest-errors

A global exception filter that turns any thrown error into the error envelope,
driven by an extensible list of mappers.

```ts
app.useGlobalFilters(new GlobalExceptionFilter());
```

Built-in mappers cover `HttpException`, Zod validation errors (400, with
field paths in the message), and `@smallmodelstudio/http-client`'s
`UpstreamError` (timeout → 504; an upstream 4xx passed through with the same
status but a generic message, since the upstream's own message might
describe its shape rather than this service's; anything else → 502).
Anything else falls back to a generic 500. Pass your own mappers to the
constructor to extend or override this — they're checked before the
built-ins:

```ts
app.useGlobalFilters(new GlobalExceptionFilter([myUpstreamErrorMapper]));
```

A second, optional constructor argument supplies the response's correlation
id — wire in `RequestContext.correlationId` from `@smallmodelstudio/nest-context`
if you're using it (`nest-errors` doesn't depend on it directly); without
one, a fresh id is generated per response:

```ts
app.useGlobalFilters(
  new GlobalExceptionFilter([], () => RequestContext.correlationId()),
);
```

See [the architecture doc](../../docs/README-architecture.md#response-shapes)
for the exact error shape.
