import type { ArgumentsHost } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { GlobalExceptionFilter } from './global-exception.filter';

function fakeHost(url: string) {
  const send = vi.fn();
  const status = vi.fn().mockReturnValue({ send });
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ url }),
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, send };
}

describe('GlobalExceptionFilter', () => {
  it('sends an error envelope for an HttpException', () => {
    const filter = new GlobalExceptionFilter();
    const { host, status, send } = fakeHost('/posts/999');

    filter.catch(new NotFoundException('Post not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Post not found',
        error: 'Not Found',
        path: '/posts/999',
      }),
    );
  });

  it('maps a ZodError to a 400', () => {
    const filter = new GlobalExceptionFilter();
    const { host, status } = fakeHost('/posts');
    const result = z.object({ title: z.string() }).safeParse({});

    filter.catch(result.error, host);

    expect(status).toHaveBeenCalledWith(400);
  });

  it('falls back to a generic 500 for unknown errors', () => {
    const filter = new GlobalExceptionFilter();
    const { host, status, send } = fakeHost('/posts');
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
    consoleError.mockRestore();
  });

  it('checks extra mappers before the built-ins', () => {
    class CustomError extends Error {}
    const filter = new GlobalExceptionFilter([
      {
        supports: (error) => error instanceof CustomError,
        toResponse: () => ({
          statusCode: 418,
          message: "I'm a teapot",
          error: 'Teapot',
        }),
      },
    ]);
    const { host, status } = fakeHost('/posts');

    filter.catch(new CustomError('brew'), host);

    expect(status).toHaveBeenCalledWith(418);
  });
});
