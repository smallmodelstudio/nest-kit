import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { ApiEnvelopeResponse } from './swagger';

describe('ApiEnvelopeResponse', () => {
  it('applies without throwing', () => {
    class Fake {
      method() {
        return undefined;
      }
    }
    expect(() =>
      ApiEnvelopeResponse(z.object({ id: z.number() }))(
        Fake.prototype,
        'method',
        Object.getOwnPropertyDescriptor(Fake.prototype, 'method')!,
      ),
    ).not.toThrow();
  });
});
