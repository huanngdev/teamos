# TeamOS Progress

Last updated: 2026-09-16

## Current Milestone

TeamOS has a working monorepo, HTTP foundation, and Better Auth-based authentication with organization-scoped authorization. The next milestone is the first durable project and issue workflow.

## Completed

### Product foundation

- Repository structure for the web app, API, and shared packages.
- Initial product direction centered on organizations, projects, members, issues, chat, and schedules.
- Web application shell and API root/health routes.

### Engineering foundation

- Turborepo workspace using Bun.
- Strict TypeScript configuration for web, API, and shared code.
- Shared API schemas and inferred types in `packages/shared`.
- API environment validation with Zod.
- Web environment validation with Zod.
- Hono API middleware for CORS, security headers, request IDs, client IPs, content types, body limits, timeouts, CSRF, request logging, and rate limiting.
- Consistent API error response contract with request IDs and server-side error logging.
- LogLayer integration with sensitive-field redaction.
- Colored expanded development logs and structured JSON production logs.
- Docker Compose support for PostgreSQL, Redis, and MinIO with health checks and named volumes.
- Shared lint, formatting, type-checking, test, and build scripts.
- Focused API tests covering HTTP hardening and error behavior.
- OpenAPI 3.1 route documentation and Scalar API reference.
- API liveness and dependency readiness endpoints.
- Server-only `@teamos/db` package with Drizzle configuration and an empty schema entry point.
- Fail-fast startup probes for PostgreSQL, Redis, and MinIO with cleanup on partial failure.
- Dedicated Drizzle commands for schema checking, migration generation, migration application, and Studio.
- Tailwind CSS v4 and shadcn/ui base-nova design system using preset `b4VkKso62S`.
- Full shadcn/ui component registry generated in `apps/web/src/components/ui`.
- Light and dark theme support with persisted user preference, active toggle state, and an animated toggle icon.
- Global Sonner-based shadcn/ui toaster with rich colors positioned at the top right.
- Axios API client and TanStack Query provider with shared runtime response validation.
- React Router, frontend provider composition, and a backend readiness gate with bounded retries.
- Frontend test foundation with Vitest, Testing Library, and MSW.
- `@shadcn/lint` and TanStack Query ESLint rules for frontend design-system usage.

### Authentication and authorization

- Better Auth instance built from validated environment config and the shared Drizzle client.
- Better Auth handler mounted at `/api/auth/*` with the Drizzle PostgreSQL adapter.
- Google and GitHub OAuth providers with per-provider email verification enforcement.
- Tightened account linking: implicit linking is disabled and providers link only while signed in.
- Session middleware with a typed `authSession` context value and email-verification guard.
- Resend-backed email adapter with verification and organization invitation templates.
- Escaped, HTML and plain-text email rendering with delivery failures logged rather than swallowed.
- Organization-scoped access service that queries membership from PostgreSQL and powers `404` for non-members.
- Social provider discovery endpoint that reflects the configured OAuth credentials.
- Better Auth schema (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`) generated into `packages/db` and applied through the first Drizzle migration.
- Frontend session, workspace, invitation, and sign-in hooks with public auth routes and a protected workspace layout.

## In Progress

- Defining the organization, membership, project, and issue domain model.
- Choosing the first domain tables beyond authentication; the Drizzle schema now owns the Better Auth tables.

## Not Started

- Project and issue Drizzle tables and migrations.
- Project and issue CRUD workflows.
- Issue statuses, priorities, labels, assignment, and ordering.
- Organization and member management screens beyond the workspace shell.
- Durable chat channels and messages.
- Schedule, events, and team availability.
- MinIO bucket management, signed URLs, and attachment ownership metadata.
- Shared real-time event contracts and Redis pub/sub delivery.
- Production deployment, secret management, observability, and backup procedures.

## Infrastructure Integration Status

| Area           | Status                | Notes                                                                             |
| -------------- | --------------------- | --------------------------------------------------------------------------------- |
| PostgreSQL     | Connected at boot     | `@teamos/db` probes with `SELECT 1`; owns the Better Auth and organization tables |
| Redis          | Partially integrated  | API rate limiter uses Redis with an in-memory insurance limiter                   |
| MinIO          | Connected at boot     | S3 client probes credentials with `ListBuckets`; storage workflows pending        |
| Logging        | Integrated            | Pretty local output, JSON production output, sensitive-field redaction            |
| API protection | Integrated foundation | Middleware and error contract are covered by API tests                            |
| API docs       | Integrated            | OpenAPI 3.1 at `/openapi.json`, Scalar UI at `/docs`, cookie session scheme       |
| Authentication | Integrated            | Better Auth OAuth with email verification, session guard, and Resend email        |
| Email          | Integrated            | Resend adapter for verification and invitations; required in production           |

## Quality Checks

The current repository has scripts for:

- `bun run format:check`
- `bun run lint`
- `bun run check-types`
- `bun run test`
- `bun run build`
- `bun run check`
- `bun run db:check`
- `bun run db:generate`
- `bun run db:migrate`

The API foundation currently has focused tests for security headers, CORS, request IDs, root/liveness/readiness contracts, OpenAPI exposure, unexpected errors, content types, malformed JSON, validation errors, body size limits, rate-limit responses, environment validation, bootstrap service failure handling, provider discovery, unauthenticated and unverified sessions, current-user contracts, and organization membership isolation. Shared utilities have tests for slug generation and organization roles. Frontend tests cover the readiness gate, unauthenticated redirect, social provider rendering, and workspace rendering.

## Known Limitations

- The current API is not yet a multi-tenant product surface because domain persistence beyond organizations is not implemented.
- Organization and membership management relies on Better Auth plugin endpoints; TeamOS-specific management screens are still minimal.
- Invitations require a configured Resend sender; without it verification and invitation email cannot be delivered.
- Development allows authentication without OAuth credentials, but production startup requires both Google and GitHub credentials plus Resend configuration.
- The readiness endpoint verifies connectivity but does not replace ongoing dependency monitoring.
- Local Compose credentials are development defaults and must not be reused in production.
- Redis-backed rate limiting is fail-closed when Redis is not ready in the real API server path.
- There is no production deployment or migration runbook yet.

## Recommended Next Priorities

1. Implement organization and member management screens with permission-aware actions.
2. Add project and issue tables, migrations, and organization-scoped APIs.
3. Reuse the organization access service for every tenant-scoped query and route.
4. Add integration tests against PostgreSQL, Redis, and MinIO for real session and membership flows.
5. Add the first issue workflow and matching web screens.
6. Add a dedicated background worker for transactional email delivery.

## Update Rule

Update this document after each meaningful milestone. Record completed product behavior, infrastructure integration status, quality-check results, known limitations, and the next priorities. Keep this file factual and do not mark a feature complete until its persistence, authorization, tests, and user-facing flow are all in place.
