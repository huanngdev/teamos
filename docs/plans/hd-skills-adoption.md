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

## Audit follow-ups (need their own plan before coding)

Each one changes architecture or behavior, so none is done in this plan.

| Skill rule                                                                                               | TeamOS today                                                                              | Proposal                                                                                          |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| hd-frontend: one route object, `lazy` per route, `errorElement` per layout, guards as route `middleware` | Declarative `<Routes>` JSX, eager imports, guards in `ProtectedLayout`                    | Move to `createBrowserRouter` data mode; split chunks per route                                   |
| hd-frontend: React Compiler on, no hand-written `useMemo`/`useCallback`                                  | Off; `react/refs` (37) and `react/set-state-in-effect` (9) disabled                       | Enable the compiler, refactor latest-value refs to `useEffectEvent`, then turn both rules back on |
| hd-backend: repository layer in `packages/db` with mappers                                               | Services query Drizzle directly (`services/issues.ts` is 1458 lines)                      | Extract repositories per aggregate, starting with issues                                          |
| hd-backend: cursor pages `{ items, nextCursor }`                                                         | Members, issue list, views use offset pages with totals (agreed in `issue-pagination.md`) | Keep: the page-number UI is a product decision. Revisit only for realtime/infinite lists          |
| hd-core testing: Playwright + axe on main flows                                                          | No end-to-end suite                                                                       | Add once a test sign-in path exists that does not need real Google/GitHub accounts                |
