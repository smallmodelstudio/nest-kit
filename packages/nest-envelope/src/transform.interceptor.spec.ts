import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { TransformInterceptor } from './transform.interceptor';

function handlerReturning(value: unknown): CallHandler {
  return { handle: () => of(value) };
}

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor();
  const context = {} as ExecutionContext;

  it('wraps a plain value in { data, meta }', async () => {
    const result = await new Promise((resolve) => {
      interceptor
        .intercept(context, handlerReturning({ id: 1 }))
        .subscribe(resolve);
    });
    expect(result).toMatchObject({ data: { id: 1 } });
    expect(
      (result as { meta: { correlationId: string } }).meta.correlationId,
    ).toBeTruthy();
  });

  it('unwraps a paginated result into data + meta.page', async () => {
    const value = {
      items: [{ id: 1 }],
      page: { offset: 0, limit: 20, total: 1 },
    };
    const result = await new Promise((resolve) => {
      interceptor
        .intercept(context, handlerReturning(value))
        .subscribe(resolve);
    });
    expect(result).toMatchObject({
      data: [{ id: 1 }],
      meta: { page: { offset: 0, limit: 20, total: 1 } },
    });
  });
});
