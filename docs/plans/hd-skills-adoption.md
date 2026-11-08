# Adopt the owner hd-* skills

Date: 2026-11-08 · Status: accepted by the user (toolchain: full migration; tests: move to `test/` + Vitest; scope: infra, rules, audit — no new product features)

| #   | Task                                                                                                                                                     | Owner                | State                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------- |
| 1   | oxlint (type-aware) + oxfmt + tsdown, merge config packages into `packages/config` (ADR 0001)                                                            | worker               | done                                   |
| 2   | Move tests to `<workspace>/test/`, run everything with `bun --bun vitest run` (ADR 0002)                                                                 | worker               | done                                   |
| 3   | Rules: short `AGENTS.md` from the hd-core template, `CLAUDE.md` → `@AGENTS.md`, `CODE_RULES.md` test/lint rules, agent roles (ADR 0003), `opencode.json` | coordinator          | done                                   |
| 4   | Audit the code against hd-frontend, hd-backend, hd-validate, hd-auth, hd-infra; fix safe gaps, list the rest as follow-ups                               | coordinator + worker | done                                   |
| 5   | Run the stack locally (compose, migrate, seed, dev) and smoke-test web + API                                                                             | coordinator          | done (OAuth sign-in left to the owner) |

Each task ends with `bun run check` green. Follow-ups that change product scope, permissions, or schema go to the roadmap, not this plan.

## Follow-ups (accepted 2026-11-08)

The owner accepted the recommended follow-ups and rejected end-to-end tests: TeamOS keeps Vitest unit and service/HTTP tests only. Linear is not used for this repo.

| #   | Task              | Rule                       | Decision                                                                                                                                                                                                                                                                   | State    |
| --- | ----------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 6   | Router data mode  | hd-frontend react.md       | `createBrowserRouter` + one exported `routes: RouteObject[]`, every route `lazy`, `errorElement` on the root and each layout. The session guard stays in `ProtectedLayout`: it renders readiness, loading, and error screens, which a redirect-only middleware cannot      | done     |
| 7   | Issue repository  | hd-backend api.md, data.md | `packages/db/src/repositories/issues.ts`: query functions that take an executor (`db` or `tx`) and return typed records. Services keep authorization, transactions, rules, and DTO mapping (it throws `AppError`). Other aggregates follow only after this one is reviewed | open     |
| 8   | React Compiler    | hd-frontend react.md       | `react({ compiler: true })` (fallback: Babel preset), latest-value refs become `useEffectEvent`, mount-state effects become derived state or `useSyncExternalStore`, then `react/refs` and `react/set-state-in-effect` are turned back on                                  | done     |
| —   | Offset pagination | hd-backend api.md          | Kept: the page-number UI is agreed in `issue-pagination.md`                                                                                                                                                                                                                | won't do |
| —   | End-to-end tests  | hd-core testing.md         | Rejected by the owner                                                                                                                                                                                                                                                      | won't do |
