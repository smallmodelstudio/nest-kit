# Architecture

How nest-kit is organised: its packages and their layers, the contract model that
turns a Zod schema into an HTTP API, and the build and publishing rules every
package follows.

Build status for each package is tracked in [Roadmap](README-roadmap.md). This
document describes the design those phases put in place.

## Goals

- **Install only what you use.** Each package works on its own. There's no
  umbrella package, and nothing pulls in a dependency you didn't ask for.
- **A Zod contract is the single source of truth.** Types, validation, OpenAPI
  docs, typed clients, fake data and database tables all come from it.
- **Generated code stays readable.** The CLI writes ordinary Nest files that you
  own and edit. They refer to the contract instead of repeating it.
- **Production behaviour works out of the box.** Response and error envelopes,
  correlation IDs, retries that only repeat safe methods, structured logs,
  telemetry, health checks and graceful shutdown.

The patterns come from `json-placeholder-api` (the harness), which becomes
the library's first consumer in phase 3.

## Decisions

| Decision      | Choice                                                                                                                                                            | Rejected                                                                             | Why                                                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zod → API     | Hybrid: the contract drives validation, types and OpenAPI at runtime; generated controllers, services and modules are yours to edit; a drift check guards the two | Routes built at boot from contracts; full code generation that reads the schema once | Runtime building is hard to debug and customise. With full codegen, the files quietly drift from the schema.                                                                  |
| Transport     | HTTP on Fastify first. Contracts don't depend on the transport                                                                                                    | Messaging from day one; HTTP only                                                    | Messaging can be added later without changing contracts.                                                                                                                      |
| HTTP platform | Fastify only                                                                                                                                                      | Express as well                                                                      | The correlation hook and cache keys are Fastify-specific. Supporting both doubles the surface.                                                                                |
| Persistence   | Repository interface with in-memory, HTTP-proxy and Drizzle/Postgres adapters                                                                                     | Prisma; proxy only; stub services                                                    | Drizzle tables can be generated from Zod. Prisma would need a second schema.                                                                                                  |
| Zod bridge    | Own implementation (pipe and decorators, about 100 lines)                                                                                                         | `nestjs-zod`                                                                         | The real value is the contract layer, and a third-party peer range lagging a Nest major has already caused install failures (see the harness's `@nestjs/throttler` override). |
| HTTP client   | Native `fetch`                                                                                                                                                    | axios                                                                                | Built into Node 24, and OTel's undici instrumentation covers it.                                                                                                              |

## Packages and layers

All packages are published under the `@smallmodelstudio` scope. A package may only
import from layers below its own. dependency-cruiser enforces this in CI.

```text
Layer 3  dev tooling       nest-testing, cli
Layer 2  resources         nest-resource, nest-drizzle
Layer 1  Nest building     nest-context, nest-envelope, nest-errors, nest-zod,
         blocks            nest-config, nest-logging, nest-http, nest-cache,
                           nest-health, nest-metrics, nest-bootstrap
Layer 0  no Nest           contract, http-client, otel
```

### Layer 0: no Nest dependency

These can be used by plain Node code or a frontend.

| Package       | Contents                                                                                                                                                                                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `contract`    | `defineResource`, `defineOperation`; Zod helpers `zId()`, `zStrictInt()`, pagination schemas; success and error envelope schemas; OpenAPI output via Zod 4's `z.toJSONSchema()`. Only peer dependency: `zod`.                                                                                                                        |
| `http-client` | `fetch`-based client: retries with exponential backoff and jitter only for safe methods (GET, HEAD, OPTIONS, PUT, DELETE), per-attempt timeouts via `AbortSignal`, typed `UpstreamError` (`TIMEOUT`, `NETWORK_ERROR`, `BAD_RESPONSE`). The `/contract` subpath adds `createContractClient(resource)` with `zod` as an optional peer. |
| `otel`        | OpenTelemetry SDK setup loaded with `node --import @smallmodelstudio/otel/register`, plus `registerShutdownHandler`. It must never import Nest: it has to load before any module it instruments.                                                                                                                                     |

### Layer 1: Nest building blocks

Each package is independent of the others in this layer, unless noted.

| Package          | Contents                                                                                                                                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nest-context`   | Request context in `AsyncLocalStorage` (`RequestContext.get()` anywhere); Fastify `onRequest` correlation ID hook with length and character limits, falling back to the active trace ID or a UUID.                                                                                                                                 |
| `nest-envelope`  | `TransformInterceptor` (`{ data, meta }`, including page info when paginated); Swagger decorators that take Zod schemas.                                                                                                                                                                                                           |
| `nest-errors`    | Exception filter producing the error envelope, driven by a list of mappers the app can extend. Built-in mappers: `HttpException`, Zod errors (400 with field paths), `UpstreamError` (timeout → 504, upstream 4xx passed through with a generic message, anything else → 502).                                                     |
| `nest-zod`       | `ZodValidationPipe`; `@ContractBody`, `@ContractQuery`, `@ContractParam`; `@ResourceController(contract)` and `@Operation(contract, op)`, which apply route, Swagger, envelope and cache metadata from the contract.                                                                                                               |
| `nest-config`    | `ConfigKitModule.forRoot({ schema })`: env vars parsed by a Zod schema whose `.transform()` also builds the nested config shape, so one file replaces the harness's validation file and mapping file.                                                                                                                              |
| `nest-logging`   | nestjs-pino setup: level by environment (silent in tests), pino-pretty only when it can be resolved, log level from the status code, correlation ID on every line.                                                                                                                                                                 |
| `nest-http`      | Nest module wrapping `http-client`: config-driven base URL, timeout and retries; retry metrics; forwards `x-correlation-id` from `nest-context`.                                                                                                                                                                                   |
| `nest-cache`     | Cache interceptor keyed on the URL, with excluded route patterns (checked on the route pattern, not `request.url`), an `X-Cache` header and hit/miss metrics.                                                                                                                                                                      |
| `nest-health`    | `/health/live` (checks nothing) and `/health/ready` (the app's own indicators), with envelope-aware Swagger. On SIGTERM, readiness starts failing and the app waits for a drain delay before closing.                                                                                                                              |
| `nest-metrics`   | Typed counters and histograms over the OTel API (no-ops when the SDK isn't loaded); request-rate, error and duration interceptor per route.                                                                                                                                                                                        |
| `nest-bootstrap` | `createApp(AppModule, { plugins })`, used by both `main.ts` and `createTestApp` so they can't drift apart. It sets up the Fastify adapter (`trustProxy` from env), shutdown hooks and listening on `0.0.0.0`. Correlation, logging and Swagger come in as plugins from their own packages, so this package doesn't depend on them. |

### Layer 2: resources

| Package         | Contents                                                                                                                                                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nest-resource` | `ResourceRepository<typeof contract>` interface (`list`, `get`, `create`, `replace`, `patch`, `remove`); `ResourceModule.forFeature(contract, { adapter })`; `@InjectRepository(contract)`; in-memory adapter; HTTP-proxy adapter (built on `nest-http`). |
| `nest-drizzle`  | Postgres connection module, transactions carried in `AsyncLocalStorage`, a health check, and `drizzleAdapter(table)` for `nest-resource`.                                                                                                                 |

### Layer 3: dev tooling

| Package        | Contents                                                                                                                                                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nest-testing` | `createTestApp`, `api(app)`, `SuccessEnvelope<T>` / `ErrorEnvelope` types, `withEnvOverrides`, upstream mocks, `fake(schema)` data from contracts, Testcontainers Postgres setup, `expectRoutesMatchContracts(app, contracts)`.                 |
| `cli`          | `nest-kit` binary: `new service`, `generate resource`, `generate table`, `check`. New files come from typed template functions formatted with Prettier; edits to existing files, such as registering a module in `app.module.ts`, use ts-morph. |

### Typical installs

| Service                       | Packages                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| Proxy in front of another API | `contract`, `nest-zod`, `nest-envelope`, `nest-errors`, `nest-http`, `nest-resource` |
| CRUD service with Postgres    | the same, with `nest-drizzle` in place of `nest-http`                                |
| Small worker                  | `nest-health`, `nest-logging`, `otel`                                                |

## The contract model

### Defining a resource

```ts
import { z } from 'zod';
import { defineResource, zId } from '@smallmodelstudio/contract';

export const Post = z
  .object({
    id: z.number().int().positive(),
    userId: z.number().int().positive(),
    title: z.string().min(1),
    body: z.string().min(1),
  })
  .meta({ id: 'Post' });

export const posts = defineResource({
  path: '/posts',
  entity: Post,
  create: Post.omit({ id: true }).meta({ id: 'CreatePost' }),
  query: z.object({ userId: zId().optional() }),
  operations: ['list', 'get', 'create', 'replace', 'patch', 'remove'],
  pagination: 'offset',
  cache: { get: 60_000 },
});
```

Routes that aren't CRUD, such as `/posts/:id/comments` or action endpoints, use
`defineOperation({ method, path, params, query, body, response })`.

### What comes from a contract

| Output                             | How                                                                                                                                | When           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Types                              | `ResourceTypes<typeof posts>` gives entity, create, patch and query types, using Zod's input and output types                      | Compile time   |
| Validation                         | `nest-zod` pipes parse with the contract's schemas                                                                                 | Runtime        |
| PUT vs PATCH                       | `replace` uses the full `create` schema; `patch` uses `create.partial()`                                                           | Runtime        |
| Route table                        | Operation → method + path (`list` → `GET /posts`, `get` → `GET /posts/:id`, …)                                                     | Runtime        |
| OpenAPI                            | Request bodies use Zod's input schema, responses its output schema; `.meta({ id })` becomes a named component referenced by `$ref` | Runtime        |
| Typed client                       | `createContractClient(posts, { baseUrl })`; retries only safe operations                                                           | Runtime        |
| Fake data                          | `fake(posts.entity)`                                                                                                               | Tests          |
| Database table                     | `nest-kit generate table posts` writes a Drizzle table definition                                                                  | Generated      |
| Controller, service, module, tests | `nest-kit generate resource posts`                                                                                                 | Generated once |

### Strict parameters

Path and query values arrive as strings. `zId()` accepts only `^[1-9]\d*$` and
converts it to a number, so hex (`0x1`), exponential notation (`1e2`), a leading
`+` and whitespace are rejected before any conversion. The schema checks the raw
string itself, so this replaces the harness's `StrictNumberFormatPipe` and
`ParsePositiveIntPipe` and removes the global pipe-ordering workaround. Don't use
`z.coerce.number()` for params: it accepts the same formats as `+value`.

### Generated code

```ts
@ResourceController(posts) // @Controller + @ApiTags + shared error docs
export class PostsController {
  constructor(private readonly service: PostsService) {}

  @Operation(posts, 'list') // @Get() + envelope docs + cache TTL
  findAll(@ContractQuery(posts) query: PostsQuery): Promise<Post[]> {
    return this.service.findAll(query);
  }

  @Operation(posts, 'get')
  findOne(@ContractParam(posts, 'id') id: number): Promise<Post> {
    return this.service.findOne(id);
  }
}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(posts)
    private readonly repository: ResourceRepository<typeof posts>,
  ) {}

  findAll(query: PostsQuery): Promise<Post[]> {
    return this.repository.list(query);
  }
}

@Module({
  imports: [
    ResourceModule.forFeature(posts, { adapter: drizzleAdapter(postsTable) }),
  ],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
```

After generation the files are yours. Add logic to the service, add routes with
`defineOperation`, or swap the adapter.

### Drift check

The generated e2e suite includes:

```ts
expectRoutesMatchContracts(app, [posts]);
```

It reads the routes Nest registered and compares their method, path and the
schemas bound to their parameters with the contracts. A contract operation with
no route, or a route whose schemas differ from the contract's, fails the test.
`nest-kit check` runs the same comparison outside Vitest.

### Service template

`nest-kit new service <name>` creates a service laid out like the harness:
`src/` with `main.ts` and `app.module.ts` on `nest-bootstrap`, `docker-compose.yml`
(Postgres and otel-lgtm), a multi-stage `Dockerfile`, Kustomize `k8s/` base and
overlays, `.harness/` pipelines, three Vitest projects (unit, e2e, contract), a
`README.md` index with `docs/README-<topic>.md` files, and `CLAUDE.md`.

## Response shapes

These stay the same as the harness's, so existing clients keep working.

Success:

```json
{
  "data": { "id": 1, "title": "…" },
  "meta": { "timestamp": "…", "correlationId": "…" }
}
```

Paginated lists add `meta.page`: `{ "offset": 0, "limit": 20, "total": 100 }`.

Error:

```json
{
  "statusCode": 404,
  "message": "…",
  "error": "Not Found",
  "path": "/posts/999",
  "timestamp": "…",
  "correlationId": "…"
}
```

## Build and publishing rules

| Rule              | Detail                                                                                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace         | pnpm workspaces. Strict `node_modules` makes a package that uses an undeclared dependency fail here rather than for a consumer.                                                                                                    |
| Versioning        | Changesets, with independent versions per package.                                                                                                                                                                                 |
| Build             | `tsc` per package, CommonJS output plus `.d.ts`. esbuild-based bundlers drop decorator metadata. Dual ESM/CJS output could load a DI token twice, and Nest would then fail to inject it without any error.                         |
| Peer dependencies | `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-fastify`, `fastify`, `rxjs`, `reflect-metadata` and `zod` are peers with wide ranges (for example `^11 \|\| ^12`), never regular dependencies.                                 |
| Optional features | Subpath exports with optional peers (`peerDependenciesMeta`) instead of separate small packages.                                                                                                                                   |
| Export checks     | publint and `@arethetypeswrong/cli` run on every package in CI.                                                                                                                                                                    |
| Standalone check  | CI runs `pnpm pack` on each package, installs it into an empty Nest app with only its declared peers, and boots the app.                                                                                                           |
| Layer check       | dependency-cruiser enforces the layer rule above.                                                                                                                                                                                  |
| TypeScript        | Same strict flags as the harness (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `noImplicitOverride`, unused locals and parameters), in a shared `tsconfig.base.json`. |
| Lint and format   | typescript-eslint `recommendedTypeChecked`, Prettier with single quotes and trailing commas.                                                                                                                                       |
| Tests             | Vitest with `unplugin-swc` (for decorator metadata); specs sit next to the code.                                                                                                                                                   |
| Publishing        | GitHub Actions with the Changesets release action and npm provenance. Services built with the kit keep using Harness.                                                                                                              |
| Runtime           | Node 24, NestJS 12, Fastify 5, Zod 4.                                                                                                                                                                                              |

## Open questions

- **Scope and registry:** `@smallmodelstudio` on public npm or GitHub Packages.
  Must be settled before the first publish.
- **Swagger `$ref`s for Zod schemas:** `@nestjs/swagger` expects classes. Named
  Zod schemas probably need adding to `document.components.schemas` after
  `createDocument`. Settled in the phase 1 spike.
- **OpenAPI version:** Zod 4 outputs JSON Schema 2020-12, while `@nestjs/swagger`
  outputs OpenAPI 3.0. Confirm that Zod's `openapi-3.0` target handles nullable and
  optional fields correctly. Settled in the phase 1 spike.
- **Peer ranges:** confirm Nest 12, Zod 4 and Fastify 5 install together without
  overrides.
