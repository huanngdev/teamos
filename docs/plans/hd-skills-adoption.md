# Adopt the owner hd-* skills

Date: 2026-11-08 · Status: accepted by the user (toolchain: full migration; tests: move to `test/` + Vitest; scope: infra, rules, audit — no new product features)

| #   | Task                                                                                                                                                     | Owner                | State |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----- |
| 1   | oxlint (type-aware) + oxfmt + tsdown, merge config packages into `packages/config` (ADR 0001)                                                            | worker               | open  |
| 2   | Move tests to `<workspace>/test/`, run everything with `bun --bun vitest run` (ADR 0002)                                                                 | worker               | open  |
| 3   | Rules: short `AGENTS.md` from the hd-core template, `CLAUDE.md` → `@AGENTS.md`, `CODE_RULES.md` test/lint rules, agent roles (ADR 0003), `opencode.json` | coordinator          | done  |
| 4   | Audit the code against hd-frontend, hd-backend, hd-validate, hd-auth, hd-infra; fix safe gaps, list the rest as follow-ups                               | coordinator + worker | open  |
| 5   | Run the stack locally (compose, migrate, seed, dev) and smoke-test web + API                                                                             | coordinator          | open  |

Each task ends with `bun run check` green. Follow-ups that change product scope, permissions, or schema go to the roadmap, not this plan.
