# @smallmodelstudio/contract

Define a resource once in Zod and get validation, types and OpenAPI docs from
it. No Nest dependency — works in plain Node code or a frontend.

```ts
import { z } from 'zod';
import { defineResource, zId } from '@smallmodelstudio/contract';

const Post = z
  .object({
    id: z.number().int().positive(),
    userId: z.number().int().positive(),
    title: z.string().min(1),
    body: z.string().min(1),
  })
  .meta({ id: 'Post' });

const posts = defineResource({
  path: '/posts',
  entity: Post,
  create: Post.omit({ id: true }).meta({ id: 'CreatePost' }),
  query: z.object({ userId: zId().optional() }),
  operations: ['list', 'get', 'create', 'replace', 'patch', 'remove'],
  pagination: 'offset',
});
```

See [the architecture doc](../../docs/README-architecture.md#the-contract-model)
for the full contract model.
