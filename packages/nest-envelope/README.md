# @smallmodelstudio/nest-envelope

The `{ data, meta }` response envelope: a `TransformInterceptor` that wraps
every handler's return value, and an `ApiEnvelopeResponse` Swagger decorator
for documenting it from a Zod schema.

```ts
app.useGlobalInterceptors(new TransformInterceptor());
```

A handler returning `{ items, page }` (see `PaginatedResult` in
`@smallmodelstudio/contract`) is unwrapped into `data: items` with
`meta.page` set; anything else becomes `data` as-is.

For routes built from a resource contract, prefer `@smallmodelstudio/nest-zod`'s
`@Operation`, which derives the same documentation from the contract directly.

See [the architecture doc](../../docs/README-architecture.md#response-shapes)
for the exact response shapes.
