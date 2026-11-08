# AGENTS.md — TeamOS

TeamOS is a Linear-style collaborative workspace for organizations, projects, members, and issues, with team chat and schedules on the roadmap.

## 1. Skills and precedence

User decision > this file and [`CODE_RULES.md`](./CODE_RULES.md) > `teamos-engineering` (`.agents/skills`) > owner `hd-*` skills (start at `hd-index`) > marketplace skills. Read `CODE_RULES.md` before writing code. Generic TypeScript, testing, git, security, frontend, backend, validation, and infra rules live in the `hd-*` skills; this file lists only what is specific to TeamOS.

## 2. Read first

1. [`docs/progress.md`](./docs/progress.md) — what is done and what is next
2. [`docs/plans/`](./docs/plans) — accepted plans; [`product-roadmap.md`](./docs/plans/product-roadmap.md) orders milestones
3. [`docs/agent-system.md`](./docs/agent-system.md) — agent roles, Orca dispatch, installed and rejected skills
4. [`docs/decisions/`](./docs/decisions) — ADRs
5. [`docs/infra-guide.md`](./docs/infra-guide.md), [`docs/api-guide.md`](./docs/api-guide.md), [`docs/deployment.md`](./docs/deployment.md)

## 3. Agent roles

- **Coordinator:** Claude Code, Opus 5.5, medium effort. Plans, writes specs and docs, dispatches workers through Orca, reviews every diff, commits.
- **Worker:** OpenCode Go, `opencode-go/deepseek-v4.1-flash` (`opencode.json`), started with `orca orchestration worker-start --agent opencode2`. Implements one spec, runs checks, reports evidence. Never edits `AGENTS.md`, `CODE_RULES.md`, or `docs/**`, never commits, asks instead of widening scope.

Details: `docs/decisions/0003-agent-roles-orca.md`.

## 4. Stack

| Area     | Choice                                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo | Turborepo 2, Bun 1.3 workspaces                                                                                                  |
| Web      | `apps/web`: Vite, React 19, React Router, TanStack Query, Zustand, shadcn/ui (base-nova, Base UI), Tailwind CSS 4, Framer Motion |
| API      | `apps/api`: Hono on Bun, OpenAPI + Scalar                                                                                        |
| Data     | PostgreSQL + Drizzle ORM/Kit (`packages/db`), Redis (rate limits, coordination), MinIO (S3 API)                                  |
| Auth     | Better Auth with the Organization plugin (`apps/api/src/auth`)                                                                   |
| Tooling  | oxlint (type-aware), oxfmt, tsdown, Vitest — config in `packages/config` (ADR 0001, 0002)                                        |

Do not replace a technology without an ADR the user accepted.

## 5. Commands

```sh
bun install
docker compose up -d            # PostgreSQL, Redis, MinIO
bun run db:migrate
bun run seed                    # optional local fixtures
bun run dev                     # turbo tui: api + web
bun run check                   # format:check, lint, check-types, test, build
bun run --cwd apps/api verify:isolation   # tenant isolation against live PostgreSQL
bun run db:generate             # then review the SQL order
```

## 6. Code map

```text
apps/web/src
  app/            providers, route registration (routes.tsx)
  layouts/        router layouts + their orchestration hooks
  routes/         URL-level components only, *-route.tsx
  features/<f>/   one capability: api, components, hooks, lib, query-keys, index.ts barrel
  shared/         cross-feature API client, env, query client, hooks, components
  components/ui/  generated shadcn primitives — never edited or moved
apps/api/src      auth, config, errors, infrastructure, logging, middleware, openapi, routes (thin), services
packages/shared   cross-app contracts, Zod schemas, policy helpers, label mappers, utilities
packages/db       server-only Drizzle client, schema, migrations
packages/config   tsconfig, oxlint, oxfmt, vitest presets
<workspace>/test  tests mirroring src/
```

## 7. Invariants (never violate)

1. The organization is the tenancy boundary; projects, memberships, issues, views, chats, and schedules are organization-scoped.
2. Every protected route and realtime connection checks authentication and organization membership on the server.
3. An inaccessible tenant-scoped resource returns `404`; `403` is only for a denied action on a visible resource.
4. Organization roles (`owner`, `admin`, `member`) and project roles (`lead`, `member`, `viewer`) are defined once in `packages/shared` policy helpers; no scattered role-name checks.
5. Owners and admins always have full project control. Private projects are invisible to members without a project role.
6. `owner` is never granted by an invite or a generic member update.
7. Member and invitation mutations go through the TeamOS facade (`routes/organization-*.ts`, `services/organization-management.ts`); the native Better Auth browser endpoints for them stay blocked. Invitation accept/reject stay native.
8. Projects are a TeamOS concept, not Better Auth teams.
9. Project membership references project and member through a composite foreign key that includes the organization.
10. PostgreSQL is the durable source of truth; Redis never holds the only copy of anything.
11. Timestamps are stored in UTC and localized only at display.
12. A deleted issue number is never reused (`project_issue_counter`).
13. `apps/web` never imports server-only code, `packages/db` runtime, secrets, or Node-only modules.
14. Coded values (roles, statuses, visibility) reach the screen only through a typed label mapper in `packages/shared`.

If a task seems to require breaking one, stop, write an ADR in `docs/decisions/`, and ask the user.

## 8. Repo-specific conventions

- Frontend: components are presentational; hooks own state, data access, mutations, permissions, and handlers (`CODE_RULES.md` §5).
- shadcn: never `size="sm"`, `size="icon"` over `icon-sm`, every button has an icon, icons via `data-icon` (`CODE_RULES.md` §7).
- Naming: kebab-case files, `use-` hooks, `-route.tsx` routes, `.test.ts(x)` tests in `test/` (`CODE_RULES.md` §8).
- Realtime events: one versioned contract in `packages/shared` with name, tenant/room scope, actor, timestamp, validated payload. Reconnecting clients recover durable messages; presence and typing are ephemeral.
- Storage: object metadata and ownership in PostgreSQL; browsers get signed URLs or authorized endpoints only.
- Env: root `.env` is Docker Compose only; `apps/api/.env` and `apps/web/.env` are validated with Zod at startup and have local defaults. Keep `compose.prod.yaml` API overrides in sync with new API env vars.
- Migrations: a composite unique constraint used as an FK target must be created before the FK; Drizzle Kit does not always order them.
- Docs and code are English. Chat with the owner is Vietnamese.

## 9. Ask first (beyond hd-core defaults)

- A new product direction, permission model, schema-ownership change, or technology change. Inside an accepted plan, continue without asking.
- Installing a skill (`docs/agent-system.md` lists approved and rejected ones).
- Changing the worker model or agent roles.

## 10. Definition of Done

- [ ] `bun run check` passes, and `git diff --check` is clean
- [ ] Authorization and tenant isolation are tested for protected changes; `verify:isolation` runs when isolation changes
- [ ] UI changes: loading, empty, error, success states; keyboard, focus, light/dark, reduced motion checked
- [ ] `docs/progress.md` updated only when persistence, authorization, tests, and the screen all exist
- [ ] ADR for a new library or architecture change; skipped checks named with the reason

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
