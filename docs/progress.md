# TeamOS Progress

Last updated: 2026-09-15

## Current Milestone

TeamOS has a working monorepo and HTTP foundation. The next milestone is the first durable organization, project, and issue workflow.

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

## In Progress

- Defining the organization, membership, project, and issue domain model.
- Choosing the first domain tables and migration boundaries; the Drizzle schema entry point is ready but intentionally empty.
- Establishing authentication and server-side authorization before protected domain routes are added.

## Not Started

- Organization, membership, project, and issue Drizzle tables and migrations.
- Better Auth configuration and session flows.
- Organization membership and permission enforcement.
- Project and issue CRUD workflows.
- Issue statuses, priorities, labels, assignment, and ordering.
- Durable chat channels and messages.
- Schedule, events, and team availability.
- MinIO bucket management, signed URLs, and attachment ownership metadata.
- Shared real-time event contracts and Redis pub/sub delivery.
- Production deployment, secret management, observability, and backup procedures.

## Infrastructure Integration Status

| Area           | Status                | Notes                                                                      |
| -------------- | --------------------- | -------------------------------------------------------------------------- |
| PostgreSQL     | Connected at boot     | `@teamos/db` probes with `SELECT 1`; schema has no domain tables yet       |
| Redis          | Partially integrated  | API rate limiter uses Redis with an in-memory insurance limiter            |
| MinIO          | Connected at boot     | S3 client probes credentials with `ListBuckets`; storage workflows pending |
| Logging        | Integrated            | Pretty local output, JSON production output, sensitive-field redaction     |
| API protection | Integrated foundation | Middleware and error contract are covered by API tests                     |
| API docs       | Integrated            | OpenAPI 3.1 at `/openapi.json`, Scalar UI at `/docs`                       |

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

The API foundation currently has focused tests for security headers, CORS, request IDs, root/liveness/readiness contracts, OpenAPI exposure, unexpected errors, content types, malformed JSON, validation errors, body size limits, rate-limit responses, environment validation, and bootstrap service failure handling.

## Known Limitations

- The current API is not yet a multi-tenant product surface because domain persistence and authorization are not implemented.
- The empty Drizzle schema cannot persist product domain data yet.
- The readiness endpoint verifies connectivity but does not replace ongoing dependency monitoring.
- Local Compose credentials are development defaults and must not be reused in production.
- Redis-backed rate limiting is fail-closed when Redis is not ready in the real API server path.
- There is no production deployment or migration runbook yet.

## Recommended Next Priorities

1. Define the organization and membership schema with tenant-scoped identifiers.
2. Generate and apply the first Drizzle migration.
3. Configure Better Auth and the first authorization middleware.
4. Implement organization and project APIs with membership checks.
5. Add integration tests against PostgreSQL, Redis, and MinIO.
6. Add the first issue workflow and matching web screens.

## Update Rule

Update this document after each meaningful milestone. Record completed product behavior, infrastructure integration status, quality-check results, known limitations, and the next priorities. Keep this file factual and do not mark a feature complete until its persistence, authorization, tests, and user-facing flow are all in place.
