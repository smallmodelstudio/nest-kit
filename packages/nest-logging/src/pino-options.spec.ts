import { afterEach, describe, expect, it } from 'vitest';
import { customLogLevel, defaultLevel } from './pino-options';

describe('defaultLevel', () => {
  const original = process.env['NODE_ENV'];

  afterEach(() => {
    if (original === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = original;
    }
  });

  it('is silent in test', () => {
    process.env['NODE_ENV'] = 'test';
    expect(defaultLevel()).toBe('silent');
  });

  it('is info in production', () => {
    process.env['NODE_ENV'] = 'production';
    expect(defaultLevel()).toBe('info');
  });

  it('is debug otherwise', () => {
    process.env['NODE_ENV'] = 'development';
    expect(defaultLevel()).toBe('debug');
  });
});

describe('customLogLevel', () => {
  it('is error on a 5xx status', () => {
    expect(customLogLevel(undefined, { statusCode: 500 })).toBe('error');
  });

  it('is error when an error is passed, regardless of status', () => {
    expect(customLogLevel(undefined, { statusCode: 200 }, new Error('x'))).toBe(
      'error',
    );
  });

  it('is warn on a 4xx status', () => {
    expect(customLogLevel(undefined, { statusCode: 404 })).toBe('warn');
  });

  it('is info otherwise', () => {
    expect(customLogLevel(undefined, { statusCode: 200 })).toBe('info');
  });
});
