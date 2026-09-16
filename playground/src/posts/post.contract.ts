import {
  defineResource,
  zId,
  type ResourceTypes,
} from '@smallmodelstudio/contract';
import { z } from 'zod';

export const Post = z
  .object({
    id: z.number().int().positive(),
    userId: z.number().int().positive(),
    title: z.string().min(1),
    body: z.string().min(1),
  })
  .meta({ id: 'Post' });

export const posts = defineResource({
  path: '/posts',
  entity: Post,
  create: Post.omit({ id: true }).meta({ id: 'CreatePost' }),
  query: z.object({ userId: zId().optional() }),
  operations: ['list', 'get', 'create', 'replace', 'patch', 'remove'],
  pagination: 'offset',
  cache: { get: 60_000 },
});

export type Post = ResourceTypes<typeof posts>['entity'];
export type CreatePost = ResourceTypes<typeof posts>['create'];
export type PostsQuery = ResourceTypes<typeof posts>['query'];
