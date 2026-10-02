# TeamOS Agent System

Last updated: 2026-09-30

OpenCode and Grok Build share this system. Both read the root `AGENTS.md`. Skills live in `.agents/skills`. `.grok/skills` contains symlinks to that directory so Grok Build loads the same files. Do not fork a second copy.

Load `teamos-engineering` before implementation. `CODE_RULES.md` overrides every skill. `teamos-engineering` overrides marketplace skills when they conflict.

## Architecture

One primary agent implements. OpenCode `plan` and Grok's planning mode design without editing. `explore` searches the repo. `scout` reads dependency source. A subagent is for one bounded investigation, not a standing role.

Do not add product-manager, architect, backend, frontend, QA, security, performance, or DevOps agents. They drop `CODE_RULES.md` and duplicate the primary agent.

## Installed skills

| Skill                                 | Source                  | Role                                              |
| ------------------------------------- | ----------------------- | ------------------------------------------------- |
| `teamos-engineering`                  | this repo               | Loop, verification, and TeamOS overrides          |
| `shadcn`                              | `shadcn/ui`             | UI composition. Already on base-nova              |
| `migrate-radix-to-base`               | `shadcn/ui`             | Keep only while a Radix import remains            |
| `better-auth-best-practices`          | `better-auth/skills`    | Better Auth mechanics                             |
| `better-auth-security-best-practices` | `better-auth/skills`    | Session, secret, CSRF, and origin hardening       |
| `supabase-postgres-best-practices`    | `supabase/agent-skills` | Postgres query, index, lock, and connection rules |
| `tdd`                                 | `mattpocock/skills`     | Red-green tests at agreed seams                   |
| `diagnosing-bugs`                     | `mattpocock/skills`     | Measure, narrow, fix, regression-test             |
| `codebase-design`                     | `mattpocock/skills`     | Deep modules and seams                            |

`npx skills update` manages the marketplace rows in `skills-lock.json`. It does not manage `teamos-engineering`.

Install new marketplace skills with `DISABLE_TELEMETRY=1 npx skills add <owner/repo> --skill <name> -a opencode -a grok -y`. Do not use `-g`. Do not install a skill the user has not accepted.

## Overrides

Marketplace skills do not know the TeamOS boundaries. Apply these even when a skill says otherwise:

- Organization member and invitation mutations go through the TeamOS facade. Native Better Auth browser endpoints for those mutations stay blocked.
- Do not grant `owner` through an invite or a generic member update.
- Projects are not Better Auth teams. Do not install or follow `organization-best-practices` for team setup.
- Do not add Postgres row-level security or a Supabase client. Tenant isolation stays in services and composite foreign keys.
- The app is Vite, Hono, Drizzle, and TanStack Query. Ignore Next.js, SWR, Prisma, and Supabase client instructions.
- Do not edit generated files in `apps/web/src/components/ui` to restyle a primitive.
- Do not upload the repository to a third-party deploy skill.

## Workflow

1. Read `CODE_RULES.md`, `docs/progress.md`, and the accepted plan in `docs/plans`.
2. Pick the next unfinished task in that plan.
3. Implement at the existing seam. Default test seams are shared policy helpers, service authorization, HTTP contracts, frontend hooks, and component wiring.
4. Run format, lint, typecheck, and the relevant tests. Run `bun run check` before closing a milestone. Review migration order when SQL changes. Run `bun run --cwd apps/api verify:isolation` when tenant isolation changes.
5. Review security for any authenticated or tenant-scoped change: server-side permission checks, `404` versus `403`, facade usage, CSRF, and secrets.
6. Review performance only for a query, list, cache, realtime, bundle, or render hot path. Measure, change the bottleneck, measure again, and report the result.
7. Update `docs/progress.md` only when persistence, authorization, tests, and the user-facing flow are all in place.
8. Continue to the next task in the accepted plan. Stop when that plan is done, or when the next step changes permissions, schema ownership, technology, or product scope.

A task is not complete because code was written. If a required check cannot run, name the skipped command and the reason.

## Memory

Keep instructions short and retrieve the rest by path:

- `AGENTS.md` — architecture and working rules
- `CODE_RULES.md` — rules that always apply
- `docs/progress.md` — what is done and what is next
- `docs/plans/` — accepted implementation plans
- `docs/agent-system.md` — this file
- `docs/infra-guide.md` and `docs/api-guide.md` — current infrastructure and API behavior

Do not copy those documents into the prompt. Do not add a second issue tracker. GitHub Issues and Linear are not the backlog for this repository.

## Rejected skills

Do not install these unless the user explicitly reverses the decision:

- `obra/superpowers` — owns the session, forces worktrees and always-on TDD, and has OpenCode hook problems
- Matt Pocock tracker skills (`setup-matt-pocock-skills`, `to-spec`, `to-tickets`, `implement`, `triage`, `wayfinder`, `code-review`) — they require an issue tracker this repo does not use
- `organization-best-practices`, `create-auth`, email/password, and two-factor Better Auth skills — they fight the existing facade or are not current product scope
- `frontend-design`, `ui-ux-pro-max`, and other taste skills — they fight the shadcn rules
- `vercel-composition-patterns` — it duplicates the hook and component split
- `agent-browser`, ad-hoc Playwright skills, and Semgrep — no end-to-end suite yet, and Semgrep may send code off the machine
- `vercel-deploy-claimable` — it uploads source to a third party
- Prisma, Azure, Sentry, Redis skill packs, and design-video packs — wrong stack or unused tooling

## Later, only if the project needs them

Phase 2 candidates are `domain-modeling`, `writing-for-agents`, and `web-design-guidelines`. `vercel-react-best-practices` is useful only with the Vite and TanStack Query override above.

Phase 3 waits for a real need: browser end-to-end tests, local-only static security scanning, Redis beyond rate limiting, and CI. There is no approved Drizzle, Hono, or Bun skill. Use the repo patterns instead.
