import { NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { httpExceptionMapper, zodErrorMapper } from './mapper';

describe('httpExceptionMapper', () => {
  it('supports HttpException instances', () => {
    expect(httpExceptionMapper.supports(new NotFoundException())).toBe(true);
    expect(httpExceptionMapper.supports(new Error('boom'))).toBe(false);
  });

  it('maps status, message and error name', () => {
    const mapping = httpExceptionMapper.toResponse(
      new NotFoundException('Post not found'),
    );
    expect(mapping).toEqual({
      statusCode: 404,
      message: 'Post not found',
      error: 'Not Found',
    });
  });

  it('joins array messages from class-validator-style responses', () => {
    const exception = new NotFoundException(['a', 'b']);
    expect(httpExceptionMapper.toResponse(exception).message).toBe('a; b');
  });
});

describe('zodErrorMapper', () => {
  it('supports ZodError instances', () => {
    const result = z.object({ title: z.string() }).safeParse({});
    expect(zodErrorMapper.supports(result.error)).toBe(true);
    expect(zodErrorMapper.supports(new Error('boom'))).toBe(false);
  });

  it('maps to 400 with field paths in the message', () => {
    const result = z
      .object({ title: z.string(), body: z.string() })
      .safeParse({ title: 1 });
    const mapping = zodErrorMapper.toResponse(result.error);
    expect(mapping.statusCode).toBe(400);
    expect(mapping.error).toBe('Bad Request');
    expect(mapping.message).toContain('title:');
    expect(mapping.message).toContain('body:');
  });
});
