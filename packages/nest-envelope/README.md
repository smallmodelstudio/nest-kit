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

An optional constructor argument supplies `meta.correlationId` — wire in
`RequestContext.correlationId` from `@smallmodelstudio/nest-context` if
you're using it (`nest-envelope` doesn't depend on it directly); without
one, a fresh id is generated per response:

```ts
app.useGlobalInterceptors(
  new TransformInterceptor(() => RequestContext.correlationId()),
);
```

For routes built from a resource contract, prefer `@smallmodelstudio/nest-zod`'s
`@Operation`, which derives the same documentation from the contract directly.

See [the architecture doc](../../docs/README-architecture.md#response-shapes)
for the exact response shapes.
