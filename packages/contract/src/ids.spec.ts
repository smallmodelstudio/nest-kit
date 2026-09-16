import { describe, expect, it } from 'vitest';
import { zId, zStrictInt } from './ids';

describe('zId', () => {
  it.each(['1', '42', '999999'])('accepts %s', (input) => {
    expect(zId().parse(input)).toBe(Number(input));
  });

  it.each([
    ['0x1', 'hex'],
    ['1e2', 'exponential notation'],
    ['+1', 'a leading +'],
    [' 1', 'leading whitespace'],
    ['1 ', 'trailing whitespace'],
    ['0', 'zero'],
    ['01', 'a leading zero'],
    ['-1', 'a negative number'],
    ['1.5', 'a decimal'],
    ['abc', 'non-numeric input'],
    ['', 'an empty string'],
  ])('rejects %s (%s)', (input) => {
    expect(zId().safeParse(input).success).toBe(false);
  });
});

describe('zStrictInt', () => {
  it('accepts zero and negative numbers', () => {
    expect(zStrictInt().parse('0')).toBe(0);
    expect(zStrictInt().parse('-5')).toBe(-5);
  });

  it.each(['0x1', '1e2', '+1', ' 1', '01', '1.5'])('rejects %s', (input) => {
    expect(zStrictInt().safeParse(input).success).toBe(false);
  });

  it('enforces min', () => {
    expect(zStrictInt({ min: 0 }).safeParse('-1').success).toBe(false);
    expect(zStrictInt({ min: 0 }).parse('0')).toBe(0);
  });

  it('enforces max', () => {
    expect(zStrictInt({ max: 100 }).safeParse('101').success).toBe(false);
    expect(zStrictInt({ max: 100 }).parse('100')).toBe(100);
  });
});
