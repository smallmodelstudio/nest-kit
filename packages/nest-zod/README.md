# @smallmodelstudio/nest-zod

Turns a `@smallmodelstudio/contract` resource into a working, documented Nest
controller: a validation pipe, contract-aware param decorators, and
route/Swagger decorators derived from the contract.

```ts
@ResourceController(posts) // @Controller + @ApiTags + shared error docs
export class PostsController {
  constructor(private readonly service: PostsService) {}

  @Operation(posts, 'list') // @Get() + envelope docs + cache TTL metadata
  findAll(@ContractQuery(posts) query: PostsQuery) {
    return this.service.findAll(query);
  }

  @Operation(posts, 'get')
  findOne(@ContractParam(posts, 'id') id: number) {
    return this.service.findOne(id);
  }

  @Operation(posts, 'create')
  create(@ContractBody(posts, 'create') body: CreatePost) {
    return this.service.create(body);
  }
}
```

See [the architecture doc](../../docs/README-architecture.md#generated-code)
for the full generated-code shape.
