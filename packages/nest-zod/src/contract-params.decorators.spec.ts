import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { defineResource, zId } from '@smallmodelstudio/contract';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import {
  ContractBody,
  ContractParam,
  ContractQuery,
} from './contract-params.decorators';
import { ZodValidationPipe } from './zod-validation.pipe';

const Post = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
});

const posts = defineResource({
  path: '/posts',
  entity: Post,
  create: Post.omit({ id: true }),
  query: z.object({ userId: zId().optional() }),
  operations: ['list', 'get', 'create', 'patch'],
  pagination: 'offset',
});

function pipeAt(target: object, key: string, argKey: string) {
  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    target.constructor,
    key,
  ) as Record<string, { pipes: ZodValidationPipe[] }>;
  return args[argKey]?.pipes[0];
}

describe('ContractQuery', () => {
  it('validates against the resource listQuery (offset/limit included)', () => {
    class Controller {
      handler(@ContractQuery(posts) query: unknown) {
        return query;
      }
    }
    const pipe = pipeAt(new Controller(), 'handler', '4:0'); // QUERY:0
    expect(pipe?.transform({ userId: '1' })).toEqual({
      userId: 1,
      offset: 0,
      limit: 20,
    });
  });
});

describe('ContractParam', () => {
  it('validates the id param with zId()', () => {
    class Controller {
      handler(@ContractParam(posts, 'id') id: unknown) {
        return id;
      }
    }
    const pipe = pipeAt(new Controller(), 'handler', '5:0'); // PARAM:0
    expect(pipe?.transform('42')).toBe(42);
    expect(() => pipe?.transform('0x1')).toThrow();
  });
});

describe('ContractBody', () => {
  it('uses the full create schema for create', () => {
    class Controller {
      handler(@ContractBody(posts, 'create') body: unknown) {
        return body;
      }
    }
    const pipe = pipeAt(new Controller(), 'handler', '3:0'); // BODY:0
    expect(() => pipe?.transform({})).toThrow();
    expect(pipe?.transform({ title: 'hi' })).toEqual({ title: 'hi' });
  });

  it('uses a partial create schema for patch', () => {
    class Controller {
      handler(@ContractBody(posts, 'patch') body: unknown) {
        return body;
      }
    }
    const pipe = pipeAt(new Controller(), 'handler', '3:0'); // BODY:0
    expect(pipe?.transform({})).toEqual({});
  });
});
