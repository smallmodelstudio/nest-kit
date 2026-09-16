import { describe, expect, it } from 'vitest';
import { RequestContext } from './request-context';

describe('RequestContext', () => {
  it('returns undefined outside of run()', () => {
    expect(RequestContext.get()).toBeUndefined();
    expect(RequestContext.correlationId()).toBeUndefined();
  });

  it('exposes the data given to run() for the duration of the callback', () => {
    RequestContext.run({ correlationId: 'abc-123' }, () => {
      expect(RequestContext.get()).toEqual({ correlationId: 'abc-123' });
      expect(RequestContext.correlationId()).toBe('abc-123');
    });

    expect(RequestContext.get()).toBeUndefined();
  });

  it('keeps the context available across an async continuation started inside run()', async () => {
    const seenId = await RequestContext.run({ correlationId: 'async-id' }, () =>
      Promise.resolve().then(() => RequestContext.correlationId()),
    );

    expect(seenId).toBe('async-id');
  });

  it('isolates concurrent contexts from each other', async () => {
    const [first, second] = await Promise.all([
      RequestContext.run({ correlationId: 'first' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return RequestContext.correlationId();
      }),
      RequestContext.run({ correlationId: 'second' }, () =>
        Promise.resolve(RequestContext.correlationId()),
      ),
    ]);

    expect(first).toBe('first');
    expect(second).toBe('second');
  });
});
