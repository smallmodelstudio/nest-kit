import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { defineResource } from '@smallmodelstudio/contract';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { CACHE_TTL_METADATA_KEY, Operation } from './operation.decorator';

const Post = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
});

const posts = defineResource({
  path: '/posts',
  entity: Post,
  create: Post.omit({ id: true }),
  operations: ['list', 'get', 'create'],
  cache: { get: 60_000 },
});

function applyOperation(operation: 'list' | 'get' | 'create') {
  class Controller {
    handler() {
      return undefined;
    }
  }
  Operation(posts, operation)(
    Controller.prototype,
    'handler',
    Object.getOwnPropertyDescriptor(Controller.prototype, 'handler')!,
  );
  // Only used to read decorator metadata off it, never called unbound.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  return Controller.prototype.handler;
}

describe('Operation', () => {
  it('applies the route method and path from the resource', () => {
    const handler = applyOperation('get');
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':id');
    // Nest's RequestMethod.GET === 0
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(0);
  });

  it('sets cache metadata when the resource declares it', () => {
    const handler = applyOperation('get');
    expect(Reflect.getMetadata(CACHE_TTL_METADATA_KEY, handler)).toBe(60_000);
  });

  it('does not set cache metadata when the resource has none for that operation', () => {
    const handler = applyOperation('list');
    expect(
      Reflect.getMetadata(CACHE_TTL_METADATA_KEY, handler),
    ).toBeUndefined();
  });

  it('throws for an operation the resource does not enable', () => {
    class Controller {
      handler() {
        return undefined;
      }
    }
    expect(() =>
      Operation(posts, 'remove')(
        Controller.prototype,
        'handler',
        Object.getOwnPropertyDescriptor(Controller.prototype, 'handler')!,
      ),
    ).toThrow(/no 'remove' operation/);
  });
});
