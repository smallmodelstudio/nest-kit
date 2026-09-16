# @smallmodelstudio/nest-errors

A global exception filter that turns any thrown error into the error envelope,
driven by an extensible list of mappers.

```ts
app.useGlobalFilters(new GlobalExceptionFilter());
```

Built-in mappers cover `HttpException` and Zod validation errors (400, with
field paths in the message); anything else falls back to a generic 500. Pass
your own mappers to the constructor to extend or override this — they're
checked before the built-ins:

```ts
app.useGlobalFilters(new GlobalExceptionFilter([myUpstreamErrorMapper]));
```

See [the architecture doc](../../docs/README-architecture.md#response-shapes)
for the exact error shape.
