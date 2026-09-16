import { afterEach, describe, expect, it } from 'vitest';
import { withEnvOverrides } from './with-env-overrides';

describe('withEnvOverrides', () => {
  const KEY = 'NEST_TESTING_SPEC_VAR';

  afterEach(() => {
    delete process.env[KEY];
  });

  it('sets the override for the duration of fn and restores the original after', async () => {
    process.env[KEY] = 'original';

    const seenInsideFn = await withEnvOverrides({ [KEY]: 'override' }, () =>
      Promise.resolve(process.env[KEY]),
    );

    expect(seenInsideFn).toBe('override');
    expect(process.env[KEY]).toBe('original');
  });

  it('deletes the key afterwards when it was unset beforehand', async () => {
    delete process.env[KEY];

    await withEnvOverrides({ [KEY]: 'override' }, () =>
      Promise.resolve(undefined),
    );

    expect(process.env[KEY]).toBeUndefined();
  });

  it('restores the original even when fn throws', async () => {
    process.env[KEY] = 'original';

    await expect(
      withEnvOverrides({ [KEY]: 'override' }, () =>
        Promise.reject(new Error('boom')),
      ),
    ).rejects.toThrow('boom');

    expect(process.env[KEY]).toBe('original');
  });
});
