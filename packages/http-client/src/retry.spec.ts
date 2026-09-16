import { describe, expect, it } from 'vitest';
import { backoffDelayMs, isSafeMethod } from './retry';

describe('isSafeMethod', () => {
  it.each(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'] as const)('%s is safe', (method) => {
    expect(isSafeMethod(method)).toBe(true);
  });

  it.each(['POST', 'PATCH'] as const)('%s is not safe', (method) => {
    expect(isSafeMethod(method)).toBe(false);
  });
});

describe('backoffDelayMs', () => {
  it('doubles the base delay per attempt, before the max cap', () => {
    const random = () => 1;
    expect(backoffDelayMs(0, { baseDelayMs: 100, maxDelayMs: 10_000, random })).toBe(100);
    expect(backoffDelayMs(1, { baseDelayMs: 100, maxDelayMs: 10_000, random })).toBe(200);
    expect(backoffDelayMs(2, { baseDelayMs: 100, maxDelayMs: 10_000, random })).toBe(400);
  });

  it('caps the delay at maxDelayMs before applying jitter', () => {
    const random = () => 1;
    expect(backoffDelayMs(10, { baseDelayMs: 100, maxDelayMs: 500, random })).toBe(500);
  });

  it('applies jitter by scaling with the random source', () => {
    const random = () => 0.5;
    expect(backoffDelayMs(0, { baseDelayMs: 100, maxDelayMs: 10_000, random })).toBe(50);
  });

  it('defaults to a sane base and max delay', () => {
    const delay = backoffDelayMs(0, { random: () => 1 });
    expect(delay).toBe(100);
  });
});
