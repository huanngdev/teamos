# TeamOS Repository Guide

## Required First Step

Before writing or modifying code, read the root [`CODE_RULES.md`](./CODE_RULES.md) and follow it. Do not begin implementation based only on this file.

## Product

TeamOS is a collaborative workspace application for managing organizations, projects, members, and issues. Its core workflow is inspired by Linear, with first-class real-time team chat and schedule management.

The product should make it easy for a team to:

- Create and manage organizations and their members.
- Organize work into projects and issues.
- Assign, prioritize, label, and track issues through a workflow.
- Chat in real time within the relevant organization or project context.
- Create and manage schedules, events, and team availability.

Keep the initial implementation focused. Prefer a reliable organization/project/issue foundation before adding advanced collaboration features.

## Technology Stack

- Monorepo: Turborepo
- Package manager: Bun
- Frontend: React with Vite and TypeScript
- Backend: Hono with TypeScript
- UI: shadcn/ui, Tailwind CSS, and Framer Motion
- Database: PostgreSQL
- ORM: Drizzle ORM with Drizzle Kit for migrations
- Authentication: Better Auth
- Cache and real-time coordination: Redis
- Object storage: MinIO using its S3-compatible API
- Local infrastructure: Docker Compose at the repository root

Do not replace these technologies without an explicit architectural decision from the user.

## Repository Structure

```text
.
├── apps/
│   ├── web/                 # Vite React frontend
│   │   ├── src/             # App, pages, components, hooks, lib, and styles
│   │   └── .env.example     # Web environment template
│   └── api/                 # Hono backend
│       ├── src/             # Server, routes, services, middleware, and config
│       └── .env.example     # API environment template
├── packages/
│   ├── db/                  # Server-only Drizzle client and database schema
│   ├── shared/              # Cross-app contracts, schemas, and pure utilities
│   ├── eslint-config/       # Shared ESLint flat configurations
│   ├── prettier-config/     # Shared Prettier configurations
│   └── typescript-config/   # Shared TypeScript JSON configurations
├── docs/                    # Infrastructure and project progress documentation
├── compose.yaml             # PostgreSQL, Redis, and MinIO for local development
├── package.json
└── turbo.json
```

Add a package only when it has a clear owner and is reused or independently useful. Do not turn every folder into a package. Database and authentication runtime code remains server-only.

## Current Folder Guide

Every source directory has an `index.ts` barrel for its public exports. Keep application behavior in the owning app and use package exports for cross-workspace configuration.

- `apps/web/src/app`: Top-level page composition.
- `apps/web/src/components`: Presentational UI primitives.
- `apps/web/src/hooks`: Browser state, effects, and feature behavior.
- `apps/web/src/lib`: Browser-only helpers and integrations.
- `apps/web/src/pages`: Route-level page components.
- `apps/web/src/styles`: Global CSS entry point.
- `apps/api/src/config`: Validated server configuration.
- `apps/api/src/errors`: Typed application errors and HTTP error normalization.
- `apps/api/src/infrastructure`: Redis, rate limiter, and future external-service adapters.
- `apps/api/src/logging`: Server logger construction and transport policy.
- `apps/api/src/middleware`: HTTP middleware.
- `apps/api/src/openapi`: OpenAPI document and interactive reference registration.
- `apps/api/src/routes`: Thin HTTP route definitions.
- `apps/api/src/services`: Server-side business operations.
- `docs`: Current infrastructure guide and product/engineering progress.
- `packages/db`: Server-only Drizzle client, schema, and migration configuration.
- `packages/shared`: Cross-app API contracts, runtime schemas, and environment-agnostic utilities.
- `packages/eslint-config`: `web` and `api` ESLint flat config exports.
- `packages/prettier-config`: Shared `web` and `api` formatting exports.
- `packages/typescript-config`: Strict `base.json`, `web.json`, and `api.json` presets.
- Root `.env`: Docker Compose variables only. `apps/api/.env` and `apps/web/.env` are per-application configuration; each location commits a `.env.example` without secrets.

## Bun Commands

Run commands from the repository root with Bun:

```text
bun install
bun run dev
bun run build
bun run start
bun run lint
bun run lint:fix
bun run format
bun run format:check
bun run check-types
bun run check
```

Use `bun run --cwd apps/web <script>` or `bun run --cwd apps/api <script>` when working on one application only.

## Architecture Boundaries

### Frontend

`apps/web` owns browser-specific behavior, routes, page composition, client state, and presentation. Build reusable interface primitives with shadcn/ui and Tailwind CSS. Use Framer Motion for purposeful transitions and feedback, not decoration that slows down routine work.

The frontend must not import server-only code, database clients, secrets, Node-only modules, or backend implementation details.

Always separate frontend behavior from presentation. UI components receive typed props and render markup; dedicated hooks own state, effects, data access, mutations, permissions, derived workflow state, and non-trivial handlers. Do not place business or feature logic inside UI components. Follow the detailed frontend separation rules in `CODE_RULES.md`.

### Backend

`apps/api` owns HTTP and real-time transports, authorization enforcement, application services, integrations, and background work. Keep Hono route handlers thin: validate input, call a service, and translate the result into an HTTP response.

All organization-scoped operations must verify membership and permissions on the server. A hidden button in the frontend is not an authorization boundary.

### Shared code

`packages/shared` is the source of truth for code that must behave identically in both apps, including:

- Domain types and identifiers.
- Request and response contracts.
- Runtime validation schemas that are safe in both environments.
- Constants, permission names, and event names.
- Pure formatting, parsing, and domain helper functions.

Place reusable utility functions under `packages/shared/utilities`. Organize them by domain or responsibility rather than creating one large catch-all file.

Shared code must be environment-agnostic and free of side effects. It must not import the database client, access environment variables, initialize authentication, or depend on browser-only APIs. Do not duplicate a contract or pure helper in both apps when it belongs here.

`packages/db` and `packages/auth` expose server-facing types or helpers, but frontend code must not import their runtime modules. `packages/db` owns the database client and Drizzle schema; API services consume it through explicit dependencies.

`docs/infra-guide.md` describes current local service ownership and integration status. `docs/progress.md` tracks product and engineering milestones and should be updated after meaningful feature work.

## Domain and Data Rules

- Treat the organization as the primary tenancy boundary.
- Scope projects, memberships, issues, chats, channels, messages, and schedules to an organization where applicable.
- Use explicit roles and permissions instead of scattered role-name checks.
- Enforce tenant isolation in backend services and database queries.
- Prefer stable public IDs and never expose sensitive internal data unnecessarily.
- Store timestamps in UTC and localize them only at display boundaries.
- Model issue status, priority, assignment, labels, and ordering explicitly.
- Preserve audit-friendly fields such as creator, updater, and timestamps for important records.

## Authentication and Authorization

Use Better Auth as the authentication foundation. Keep its server configuration in `packages/auth` or the API app, and expose only safe client helpers to the frontend.

Authentication answers who the user is; authorization determines what that user may do. Every protected API route and real-time connection must enforce both. Validate organization membership when joining chat channels, subscribing to events, accessing files, or changing schedules.

## Real-Time Features

Use one documented event contract shared through `packages/shared`. Events should include a versionable name, tenant or room scope, actor where relevant, timestamp, and validated payload.

Redis may be used for pub/sub, presence, short-lived state, rate limiting, and coordination across API instances. PostgreSQL remains the durable source of truth. Do not rely on Redis as the only copy of messages, schedules, issues, or permissions.

Design chat delivery so reconnecting clients can recover missed durable messages. Treat presence and typing indicators as ephemeral.

## Storage

Use MinIO locally through its S3-compatible API for avatars, attachments, and other objects. Store object metadata and ownership in PostgreSQL. Use signed URLs or authorized backend endpoints; do not expose permanent credentials or unrestricted buckets to the browser.

## Local Infrastructure

The root `compose.yaml` must define PostgreSQL, Redis, and MinIO services with health checks, named volumes, and development-safe defaults. Keep credentials configurable through environment variables and provide a committed `.env.example` without secrets.

Environment files are split by owner. The root `.env` only configures Docker Compose. The API validates `apps/api/.env` with Zod at startup, and the web client validates `apps/web/.env` with Zod whenever Vite runs. Both schemas apply local development defaults, so a fresh clone runs without creating `.env` files first.

Application processes may run directly through Bun during development; Docker Compose is primarily responsible for supporting infrastructure unless the repository later documents a full-container workflow.

## Engineering Conventions

- Use TypeScript in strict mode.
- Prefer small, typed modules and explicit dependencies.
- Validate all untrusted input at system boundaries.
- Keep API contracts in `packages/shared` and derive TypeScript types from schemas when practical.
- Use Drizzle migrations for schema changes; do not rely on manual database edits.
- Avoid cross-app relative imports. Import workspace packages through their package names.
- Keep secrets server-side and validate required environment variables at startup.
- Return consistent, typed error shapes without leaking stack traces or sensitive details.
- Add comments for non-obvious decisions, not for code that already explains itself.
- Maintain accessible keyboard interactions, visible focus states, and reduced-motion support in the UI.

## Working in This Repository

Before changing code:

1. Inspect the relevant app and package boundaries.
2. Check the root and package-level scripts instead of assuming command names.
3. Identify whether a contract change affects both frontend and backend.

When implementing a feature:

1. Define or update shared schemas and contracts.
2. Add the database migration when persistence changes.
3. Implement backend authorization and business logic.
4. Implement the frontend flow and its loading, empty, error, and success states.
5. Add focused tests for permissions, tenant isolation, validation, and important state changes.

Before considering work complete, run the repository's available formatting, linting, type-checking, test, and build scripts. For UI changes, verify responsive layout, keyboard behavior, light and dark themes, and reduced motion. For infrastructure changes, validate the Docker Compose configuration and service health.

## Change Discipline

- Prefer the smallest sufficient change that fits the architecture.
- Preserve unrelated user changes in the worktree.
- Do not invent product requirements, permissions, metrics, or integrations.
- Call out assumptions when requirements are ambiguous or affect data modeling, security, or user-visible behavior.
- Update this file when the established architecture or workflow changes materially.
