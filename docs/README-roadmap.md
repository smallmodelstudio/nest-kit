# Roadmap

The build phases, in order, with what each delivers and how to tell it's done.
Each phase is a separate piece of work. The design they build is in
[Architecture](README-architecture.md).

Update the status column when a phase starts or finishes.

## Phases

| Phase          | Status      | Packages                                                                                                                             |
| -------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 0. Skeleton    | Done        | none (workspace tooling)                                                                                                             |
| 1. Core spike  | Done        | `contract`, `nest-zod`, minimal `nest-envelope` and `nest-errors`                                                                    |
| 2. Extract     | Done        | `nest-context`, `nest-errors`, `nest-logging`, `nest-health`, `nest-cache`, `nest-metrics`, `nest-bootstrap`, `otel`, `nest-testing` |
| 3. Resources   | Done        | `http-client`, `nest-http`, `nest-resource`                                                                                          |
| 4. Codegen     | Not started | `cli`, service template                                                                                                              |
| 5. Persistence | Not started | `nest-drizzle`                                                                                                                       |
| Later          | Not planned | messaging, auth, idempotency keys, outbox                                                                                            |

## 0. Skeleton

Set up the workspace so every later package inherits the same tooling.

- pnpm workspace (`packages/*`, `playground/`), root `package.json` scripts.
- `tsconfig.base.json` with the harness's strict flags; per-package `tsconfig.json`
  and `tsconfig.build.json`.
- ESLint (typescript-eslint `recommendedTypeChecked`), Prettier, `.nvmrc` (Node 24).
- Vitest with `unplugin-swc` and a workspace config that picks up every package.
- Changesets.
- publint, `@arethetypeswrong/cli`, dependency-cruiser layer rules.
- The standalone check: pack each package, install it into an empty Nest app with
  only its declared peers, boot the app.
- GitHub Actions CI: lint, typecheck, test, export checks, standalone check.
- One placeholder package to prove the pipeline.

**Done when** the placeholder package builds, passes every check, and installs and
boots on its own.

## 1. Core spike

Prove the contract model end to end before anything depends on it.

- `contract`: `defineResource`, `defineOperation`, `zId`, `zStrictInt`, envelope
  schemas, OpenAPI output.
- `nest-zod`: validation pipe, `@ContractBody` / `@ContractQuery` / `@ContractParam`,
  `@ResourceController`, `@Operation`.
- Enough of `nest-envelope` and `nest-errors` to return both envelopes.
- A `playground/` Nest app serving `posts` from an in-memory array.

**Done when** the playground's `posts` routes validate input (including rejecting
`0x1` as an id), return both envelopes, and `/docs` shows named `$ref` schemas for
`Post` and `CreatePost` with correct request and response shapes. Resolve the
Swagger and OpenAPI-version questions in [Architecture](README-architecture.md#open-questions)
and record the answers there.

## 2. Extract

Move the harness's proven cross-cutting code into packages, bringing its specs
along.

| Package          | Harness source                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `nest-context`   | `common/hooks/correlation-id.hook.ts`, `common/types/fastify.d.ts`                                     |
| `nest-errors`    | `common/filters/all-exceptions.filter.ts` (reworked as a mapper list)                                  |
| `nest-envelope`  | `common/interceptors/transform.interceptor.ts`, `common/decorators/api-envelope-response.decorator.ts` |
| `nest-logging`   | `LoggerModule` config in `app.module.ts`                                                               |
| `nest-health`    | `health/` (plus the new drain on shutdown)                                                             |
| `nest-cache`     | `common/interceptors/http-cache.interceptor.ts`                                                        |
| `nest-metrics`   | `common/metrics/` (plus the new request interceptor)                                                   |
| `nest-bootstrap` | `bootstrap.ts`, `main.ts`                                                                              |
| `otel`           | `instrumentation.ts`, `common/utils/register-shutdown-handler.ts`                                      |
| `nest-testing`   | `test/support/`                                                                                        |

`nest-config` also belongs here: rewrite `config/` on Zod.

**Done when** every package passes its moved specs and the standalone check, and
the playground runs on them.

## 3. Resources

- `http-client`: `fetch`, retries only for safe methods, backoff and jitter,
  timeouts, `UpstreamError`, `/contract` typed client.
- `nest-http`: Nest module, config, metrics, correlation ID forwarding.
- `nest-resource`: repository interface, `ResourceModule.forFeature`, in-memory and
  HTTP-proxy adapters.
- Move the playground's `posts` resource onto `nest-resource`'s in-memory
  adapter, in place of its hand-rolled service.

**Done when** the three packages pass their own specs and the standalone
check, and the playground's `posts` e2e suite passes unchanged (same response
shapes) against the in-memory adapter. Moving the harness (`json-placeholder-api`,
a separate project) onto the library is a later step for that project, not
tracked here.

## 4. Codegen

- `cli` with `generate resource`, `new service`, `check`.
- Service template (see [Architecture](README-architecture.md#service-template)).
- `expectRoutesMatchContracts` in `nest-testing`.

**Done when** `nest-kit new service demo` followed by `nest-kit generate resource posts`
produces a service whose lint, typecheck, unit and e2e tests all pass with no
manual edits, and changing the contract without updating the controller fails the
drift check.

## 5. Persistence

- `nest-drizzle`: connection, transactions, health check, `drizzleAdapter`.
- `cli generate table`: Drizzle table from a contract; drizzle-kit migrations in
  the service template.
- Testcontainers Postgres setup in `nest-testing`.

**Done when** a generated service runs CRUD for a contract against Postgres, with
e2e tests running against Testcontainers.

## Later

Not scheduled:

- NATS or Kafka bindings from the same contracts
- JWT and API-key guards with scopes
- Idempotency keys for POST
- Transactional outbox
