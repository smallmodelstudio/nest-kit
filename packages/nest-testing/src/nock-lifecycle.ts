import nock from 'nock';

export interface NockLifecycle {
  // Typed as arrow-function properties, not method shorthand: these never
  // read `this`, and a method-shorthand signature would make passing
  // `lifecycle.setUp` straight to `beforeAll()` trip
  // `@typescript-eslint/unbound-method` for callers.
  setUp: () => void;
  tearDownEach: () => void;
  tearDownAll: () => void;
}

/**
 * Plain functions for `mockUpstream()`'s network-blocking lifecycle — wire
 * them into your own test runner's hooks:
 *
 * ```ts
 * import { beforeAll, afterEach, afterAll } from 'vitest';
 * const lifecycle = nockLifecycle();
 * beforeAll(lifecycle.setUp);
 * afterEach(lifecycle.tearDownEach);
 * afterAll(lifecycle.tearDownAll);
 * ```
 *
 * Returned as plain functions, not registered against a test runner
 * directly, so `nest-testing` has no runtime dependency on `vitest` (or any
 * other runner) at all — importing anything else from this package never
 * requires one to be resolvable.
 */
export function nockLifecycle(allowedHost = '127.0.0.1'): NockLifecycle {
  return {
    setUp: () => {
      nock.disableNetConnect();
      nock.enableNetConnect(allowedHost);
    },
    tearDownEach: () => {
      nock.cleanAll();
    },
    tearDownAll: () => {
      nock.enableNetConnect();
    },
  };
}
