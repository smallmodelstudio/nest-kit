# @smallmodelstudio/http-client

`fetch`-based HTTP client. No Nest, no required peers.

```ts
import { createHttpClient } from '@smallmodelstudio/http-client';

const client = createHttpClient({ baseUrl: 'https://example.com', timeoutMs: 5000 });
const data = await client.get('/things');
```

- Retries only safe methods (`GET`, `HEAD`, `OPTIONS`, `PUT`, `DELETE`) on a
  network error, a timeout, or a 5xx — never a 4xx, and never `POST`/`PATCH`.
- Full-jitter exponential backoff between retries (`backoff: { baseDelayMs,
  maxDelayMs }`).
- Each attempt gets its own timeout via `AbortSignal` (`timeoutMs`, default
  10000ms).
- `headers` can be a function, called fresh per attempt — pass a correlation
  id that's read at request time, not client-construction time.
- Every failure becomes an `UpstreamError` with a `kind`: `'TIMEOUT'`,
  `'NETWORK_ERROR'` or `'BAD_RESPONSE'` (with `status`/`body` from the
  upstream). `@smallmodelstudio/nest-errors`' built-in mapper turns this into
  a response: timeout → 504, an upstream 4xx passed through with a generic
  message, anything else → 502.

## `@smallmodelstudio/http-client/contract`

Optional subpath — needs `zod` (an optional peer, only required if you
import this subpath). Builds a typed client straight from a resource
contract. It doesn't import `@smallmodelstudio/contract` itself (both are
layer-0 packages, kept independent of each other); a real contract from
`defineResource()` satisfies its structural type without a cast:

```ts
import { createContractClient } from '@smallmodelstudio/http-client/contract';
import { posts } from './post.contract';

const client = createContractClient(posts, { baseUrl: 'https://example.com' });
const { items, page } = await client.list({ userId: 1 });
const post = await client.get(1);
await client.create({ userId: 1, title: 'New post', body: '...' });
```

Every method sends and unwraps the same `{ data, meta }` envelope a
`nest-zod`-backed service returns: a paginated `list` reassembles a
`PaginatedResult` from `data` + `meta.page`; every response is run through
the contract's own Zod schemas via `.parse()`, so a shape mismatch throws
instead of returning silently-wrong data. Calling a method for an operation
the resource doesn't declare (`operations: [...]`) throws.
