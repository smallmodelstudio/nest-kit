# @smallmodelstudio/nest-resource

```ts
@Module({
  imports: [
    ResourceModule.forFeature(posts, { adapter: inMemoryAdapter(posts, { seed }) }),
  ],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(posts) private readonly repository: ResourceRepository<typeof posts>,
  ) {}

  findAll(query: PostsQuery) {
    return this.repository.list(query);
  }
}
```

- `ResourceRepository<typeof contract>` — the interface every adapter
  implements: `list`, `get`, `create`, `replace`, `patch`, `remove`.
- `ResourceModule.forFeature(contract, { adapter })` provides an adapter
  value under the token `@InjectRepository(contract)` resolves, keyed by the
  contract's `path` — the same contract used on both sides always resolves
  to the same repository.
- `inMemoryAdapter(contract, { seed, filter })` — an array-backed repository
  for a playground or a unit test. `filter(entity, query)` runs before
  offset/limit pagination, for a query field beyond pagination (e.g.
  `userId`).
- `httpProxyAdapter(contract, httpService)` — proxies every operation to an
  upstream exposing the same contract, through a `NestHttpService` from
  `@smallmodelstudio/nest-http` (so correlation-id forwarding and retry
  metrics apply). Needs a `NestHttpService` instance, so wire it with an
  ordinary Nest provider rather than through `ResourceModule.forFeature`
  directly:

  ```ts
  providers: [
    {
      provide: getRepositoryToken(posts),
      inject: [NEST_HTTP_CLIENT],
      useFactory: (http: NestHttpService) => httpProxyAdapter(posts, http),
    },
  ],
  ```

`nest-drizzle`'s `drizzleAdapter(table)` (phase 5) is a third implementation
of the same interface.
