# 0002 — Tests in `test/`, run by Vitest

Date: 2026-11-08 · Status: accepted (user decision)

## Context

Tests sat next to their source files. `apps/api`, `packages/shared`, and `packages/db` used `bun test`; `apps/web` used Vitest. `hd-core` testing rules require one runner and a `test/` folder per workspace that mirrors `src/`.

## Decision

- Every workspace keeps its tests in `<workspace>/test/`, mirroring `src/` (`src/a/b.ts` → `test/a/b.test.ts`). Shared helpers and fixtures live in `test/support/`. `src/` never imports from `test/`.
- Every workspace runs `bun --bun vitest run` with a config that merges `@teamos/config/vitest/base`. `bun:test` imports are replaced by `vitest`.
- Exception: `apps/web` runs `vitest run` on Node. MSW's Node interceptors patch `tls` internals that Bun does not implement, and browser code in jsdom needs no Bun APIs.
- Tests that need live PostgreSQL stay separate scripts (`verify:isolation`) with `cache: false`.

## Consequences

- One runner, one mocking API (`vi`), one config shape in every workspace.
- `tsconfig` for each workspace type-checks `test/` too; the build tsconfig excludes it.
- Moving 70+ files changes relative imports once; afterwards tests import source through the `@/` alias or the package name.
