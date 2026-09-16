# @smallmodelstudio/nest-testing

```ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { createTestApp, api, withEnvOverrides, mockUpstream, nockLifecycle, fake } from '@smallmodelstudio/nest-testing';

// Once per spec file (or a shared setup file).
const lifecycle = nockLifecycle();
beforeAll(lifecycle.setUp);
afterEach(lifecycle.tearDownEach);
afterAll(lifecycle.tearDownAll);

const app = await createTestApp(AppModule, { plugins: [...] }); // same shape as nest-bootstrap's createApp
await api(app).get('/posts').expect(200);

mockUpstream('https://jsonplaceholder.typicode.com').get('/posts/1').reply(200, fake(Post));

await withEnvOverrides({ CACHE_TTL_MS: '0' }, async () => { /* ... */ });
```

- `createTestApp(module, { plugins, configure })` boots on the same Fastify
  adapter and plugin list shape as `@smallmodelstudio/nest-bootstrap`'s
  `createApp`, so a test app can't quietly drift from what `main.ts` runs.
- `api(app)` is a typed `supertest` entry point.
- `mockUpstream(baseUrl)` wraps `nock`. `nockLifecycle()` returns plain
  `setUp`/`tearDownEach`/`tearDownAll` functions — wire them into your own
  test runner's hooks yourself, so this package has no runtime dependency on
  any particular test runner; real network calls are blocked except to the
  loopback address supertest itself uses.
- `fake(schema)` generates a plain fixture value from a Zod schema —
  strings become `"<field>-<n>"`, numbers an incrementing counter. Not
  format-aware; good enough to exercise a contract's shape in a test.
- `ErrorEnvelope` (from `@smallmodelstudio/contract`) and `SuccessEnvelope`
  (from `@smallmodelstudio/nest-envelope`) are re-exported for convenience.
