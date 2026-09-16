# nest-kit

Packages for building NestJS microservices from Zod contracts. Define a resource
once in Zod, and get validation, types, OpenAPI docs, typed clients and generated
controllers from it, plus the production building blocks every service needs
(envelopes, errors, correlation IDs, logging, telemetry, health, caching).

Every package installs on its own, so a service only takes what it uses.

**Status:** phase 0 (workspace skeleton) done. No packages are published yet; see [Roadmap](docs/README-roadmap.md).

**Stack:** Node 24 · NestJS 12 · Fastify 5 · Zod 4 · TypeScript · pnpm · Vitest · Drizzle

## Docs

| Doc                                         | Contents                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| [Architecture](docs/README-architecture.md) | Decisions, packages and layers, the contract model, build and publishing rules |
| [Roadmap](docs/README-roadmap.md)           | Build phases, what each delivers, and their status                             |
