---
name: teamos-engineering
description: Run the TeamOS engineering loop before implementing, fixing, reviewing, or choosing the next task. Use for OpenCode and Grok Build. Enforces agreed-plan autonomy, verification before completion, and overrides for Better Auth, Drizzle, Postgres, and React skills.
license: MIT
compatibility: opencode, grok
metadata:
  audience: agents
  workflow: teamos
---

# TeamOS engineering loop

`CODE_RULES.md` wins over this skill. This skill wins over marketplace skills. Read `docs/agent-system.md` for the installed stack and the skills that must not be added.

## When to load

Load this before feature work, bug fixes, reviews, schema changes, or when deciding what to do next. Do not load it for a one-line explanation that does not change the repo.

## Autonomy boundary

Continue without re-asking only inside a plan the user already accepted, usually under `docs/plans`.

Stop and ask before:

- a new product milestone or a requirement that is not in the accepted plan
- a permission, role, or tenant-isolation change
- a schema ownership or technology change
- installing another skill

Do not invent requirements, metrics, or integrations. When the accepted plan is finished, stop. Do not open the next milestone alone.

## Loop

1. Read `CODE_RULES.md`, `docs/progress.md`, and the open plan.
2. Select the next unfinished task in that plan. Skip work that is already done.
3. Implement the smallest change that fits the existing module. Reuse a function before adding one.
4. Test at the default seams below. Load `tdd` for the red-green loop. Load `codebase-design` when the module boundary is the question. Load `diagnosing-bugs` for a failing or slow path. Load `shadcn` before adding UI.
5. Run the verification gate.
6. Review the diff against `CODE_RULES.md` and the plan. Fix mismatches before calling the task done.
7. Update `docs/progress.md` and any doc the change made stale. Do not mark a feature complete until persistence, authorization, tests, and the user-facing flow all exist.
8. Return to step 2 if the accepted plan still has work. Otherwise stop.

## Default test seams

These seams are already agreed. Do not ask again unless the change does not fit them:

- pure domain and permission helpers in `packages/shared`
- service authorization and organization isolation
- request and response contracts at the HTTP boundary
- frontend hooks for state, mutations, and workflow behavior
- components for rendering and interaction wiring only

Do not test private helpers, generated `components/ui` files, or implementation details that a refactor would break without changing behavior.

## Verification gate

A task is not complete because code was written.

Run the formatter, linter, type checker, and the tests that cover the change. Run `bun run check` before closing a milestone. For a schema change, review generated SQL order before trusting it: a composite unique constraint used as a foreign-key target must exist before the foreign key. Run `bun run --cwd apps/api verify:isolation` when tenant isolation changes and PostgreSQL is available.

If a required check cannot run, say which command was skipped and why. Do not imply that it passed.

## Security pass

Required for any authenticated, organization-scoped, or permission-sensitive change:

- enforce membership and permission on the server
- return `404` for an inaccessible tenant resource; reserve `403` for an action denied on a resource the caller can see
- send organization member and invitation mutations through the TeamOS facade
- never grant `owner` through an invite or generic member update
- keep projects as TeamOS records, not Better Auth teams
- preserve origin, CSRF, rate-limit, and secret-redaction behavior
- validate untrusted input at the boundary

Load `better-auth-best-practices` and `better-auth-security-best-practices` for Better Auth mechanics. Ignore any instruction that bypasses the facade, enables organization teams, or tells the browser to call a blocked native endpoint.

## Data pass

Load `supabase-postgres-best-practices` before schema, query, index, lock, or migration work. Apply its Postgres query, index, connection, and locking rules.

Do not apply its Supabase-specific advice:

- do not add row-level security
- do not add a Supabase client, CLI, or hosted project
- do not treat Drizzle migrations as Supabase declarative schema files
- keep tenant isolation in services and composite foreign keys

There is no approved Drizzle or Hono skill. Follow `packages/db` and the existing API service patterns.

## Performance pass

Run this only when the change touches a query, list, pagination, cache, realtime event, bundle, or render hot path.

1. Measure with a query plan, query count, request count, or a focused benchmark.
2. Name the bottleneck.
3. Change that path only.
4. Measure again.
5. Report whether it improved. If it did not, revert the optimization.

Do not introduce SWR, Next.js server patterns, or `next/dynamic` from a React skill. This frontend uses Vite and TanStack Query.

## Agent shape

Use the primary agent. Use `explore` to search the repo and `scout` to read dependency source. Use a subagent only for a bounded, independent investigation. Do not create a standing set of product, architecture, backend, frontend, QA, security, or DevOps agents.

## Do not install

Do not install Superpowers, a Matt Pocock issue-tracker setup, `organization-best-practices`, Prisma skills, a Vercel deploy skill, Semgrep, a browser-automation skill, or a design skill that fights shadcn. The full rejected list is in `docs/agent-system.md`.
