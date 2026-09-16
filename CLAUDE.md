# CLAUDE.md

## Project Context

- **Overview and docs index:** `README.md`
- **Topic docs:** `docs/README-<topic>.md`
- **Design:** `docs/README-architecture.md`. **Phases and status:** `docs/README-roadmap.md`

## Workflow Rules

1. Before starting work, read the docs for the area you're changing, and the
   roadmap section for the phase you're working on.
2. Follow the strict TypeScript and packaging rules in `docs/README-architecture.md`.
3. Documentation lives only in `docs/`, plus the root `README.md` index. The one
   exception is each package's own `packages/<name>/README.md`, which npm shows on
   the package page.
4. When a change alters behaviour, commands or configuration covered in `docs/`,
   update that doc in the same change. Docs describe the current state, not its
   history.
5. Update a phase's status in `docs/README-roadmap.md` when it starts or finishes.
