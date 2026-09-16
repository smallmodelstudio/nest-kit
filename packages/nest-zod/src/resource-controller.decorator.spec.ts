import { PATH_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger';
import { defineResource } from '@smallmodelstudio/contract';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { ResourceController } from './resource-controller.decorator';

const posts = defineResource({
  path: '/posts',
  entity: z.object({ id: z.number() }),
  create: z.object({}),
  operations: ['list'],
});

describe('ResourceController', () => {
  it('sets the controller path and Swagger tag from the resource', () => {
    @ResourceController(posts)
    class PostsController {}

    expect(Reflect.getMetadata(PATH_METADATA, PostsController)).toBe('/posts');
    expect(Reflect.getMetadata(DECORATORS.API_TAGS, PostsController)).toEqual([
      'posts',
    ]);
  });
});
