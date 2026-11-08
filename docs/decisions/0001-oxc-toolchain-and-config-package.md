# 0001 — Oxc toolchain, tsdown packages, one config package

Date: 2026-11-08 · Status: accepted (user decision)

## Context

TeamOS linted with ESLint + typescript-eslint, formatted with Prettier, built internal packages with `tsc`, and kept three config packages (`eslint-config`, `prettier-config`, `typescript-config`). The owner's shared skills (`hd-infra`) standardize every repo on the Oxc/VoidZero toolchain and one `packages/config`. `format:check` was not part of `bun run check`, and it was failing on `main`.

## Decision

- Lint with `oxlint --type-aware --deny-warnings` (with `oxlint-tsgolint`). The shadcn design-system rules (`@shadcn/lint`) keep running as an oxlint JS plugin with the same options.
- Format with one repo-wide `oxfmt` config, matching the old Prettier output. No Tailwind or import sorting.
- Build `packages/shared` and `packages/db` with tsdown (`dts: true`, `exports: true`). Declarations come from the TypeScript compiler, not `isolatedDeclarations`.
- Merge the three config packages into `@teamos/config`: `tsconfig/`, `oxlint/`, `oxfmt.json`, `vitest/`.
- `bun run check` = `format:check` + `turbo run lint check-types test build`, locally and in CI.

## Consequences

- Lint and format run in a fraction of the previous time; every warning now fails the build.
- No `isolatedDeclarations` (deviation from `hd-infra`): it forced ~2000 lines of hand-written Zod and Drizzle types that restate the schemas. Builds are slightly slower; schemas stay the single source of their types.
- The React Compiler rules `react/refs` (37 findings) and `react/set-state-in-effect` (9) are off: ESLint never ran them, and fixing them changes behavior. Tracked as a follow-up in `docs/plans/hd-skills-adoption.md`.
- Generated `components/ui` files get a preset override instead of edits (`restrict-template-expressions`, shadcn restyle rules).
- oxfmt cannot take `..` in `ignorePatterns`, so root ignores live in `.oxfmtignore`.
- A rule that does not fit TeamOS is changed in `packages/config/oxlint/*`, never inline in an app or with an ignore comment.
