import {
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
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

  it('maps a plain string response body, using the exception name for error', () => {
    const exception = new HttpException('a plain string body', 400);
    expect(httpExceptionMapper.toResponse(exception)).toEqual({
      statusCode: 400,
      message: 'a plain string body',
      error: exception.name,
    });
  });

  it('falls back to the exception message and a STATUS_CODES-derived error for a body with no message/error, e.g. Terminus HealthCheckResult', () => {
    const exception = new ServiceUnavailableException({
      status: 'error',
      info: {},
      error: { upstream: { status: 'down' } },
      details: {},
    });

    const mapping = httpExceptionMapper.toResponse(exception);

    expect(mapping.statusCode).toBe(503);
    expect(mapping.message).toBe(exception.message);
    expect(mapping.error).toBe('Service Unavailable');
  });

  it('honours a string `error` field on the response body over the STATUS_CODES fallback', () => {
    const exception = new HttpException(
      { message: 'nope', error: 'Custom Error Name' },
      400,
    );
    expect(httpExceptionMapper.toResponse(exception).error).toBe(
      'Custom Error Name',
    );
  });

  it('falls back to the exception name when the status has no STATUS_CODES entry', () => {
    class WeirdException extends HttpException {
      constructor() {
        super({}, 599);
      }
    }
    const exception = new WeirdException();
    expect(httpExceptionMapper.toResponse(exception).error).toBe(
      exception.name,
    );
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
