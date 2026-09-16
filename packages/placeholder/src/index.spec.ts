import { describe, expect, it } from 'vitest';
import { ping } from './index';

describe('ping', () => {
  it('returns pong', () => {
    expect(ping()).toBe('pong');
  });
});
