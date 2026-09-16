import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zId } from './ids';
import { defineResource } from './resource';

const Post = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  title: z.string().min(1),
  body: z.string().min(1),
});

function makePosts() {
  return defineResource({
    path: '/posts',
    entity: Post,
    create: Post.omit({ id: true }),
    query: z.object({ userId: zId().optional() }),
    operations: ['list', 'get', 'create', 'replace', 'patch', 'remove'],
    pagination: 'offset',
  });
}

describe('defineResource', () => {
  it('derives a route per enabled operation', () => {
    const posts = makePosts();
    expect(posts.routes).toEqual({
      list: { method: 'GET', path: '' },
      get: { method: 'GET', path: ':id' },
      create: { method: 'POST', path: '' },
      replace: { method: 'PUT', path: ':id' },
      patch: { method: 'PATCH', path: ':id' },
      remove: { method: 'DELETE', path: ':id' },
    });
  });

  it('only derives routes for enabled operations', () => {
    const posts = defineResource({
      path: '/posts',
      entity: Post,
      create: Post.omit({ id: true }),
      operations: ['list', 'get'],
    });
    expect(Object.keys(posts.routes)).toEqual(['list', 'get']);
  });

  it('merges offset/limit into listQuery when pagination is offset', () => {
    const posts = makePosts();
    const parsed = posts.listQuery.parse({ userId: '1' });
    expect(parsed).toEqual({ userId: 1, offset: 0, limit: 20 });
  });

  it('leaves listQuery untouched without pagination', () => {
    const posts = defineResource({
      path: '/posts',
      entity: Post,
      create: Post.omit({ id: true }),
      query: z.object({ userId: zId().optional() }),
      operations: ['list'],
    });
    expect(posts.listQuery.parse({ userId: '1' })).toEqual({ userId: 1 });
  });

  it('defaults listQuery to an empty object when no query is given', () => {
    const posts = defineResource({
      path: '/posts',
      entity: Post,
      create: Post.omit({ id: true }),
      operations: ['list'],
      pagination: 'offset',
    });
    expect(posts.listQuery.parse({})).toEqual({ offset: 0, limit: 20 });
  });
});
