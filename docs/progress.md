# TeamOS Progress

Last updated: 2026-09-14

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

## In Progress

- Defining the organization, membership, project, and issue domain model.
- Choosing the first database schema and migration boundaries.
- Establishing authentication and server-side authorization before protected domain routes are added.

## Not Started

- Drizzle schema, migrations, and database repository layer.
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

| Area           | Status                | Notes                                                                  |
| -------------- | --------------------- | ---------------------------------------------------------------------- |
| PostgreSQL     | Provisioned only      | Compose service is healthy; no Drizzle schema or active API client yet |
| Redis          | Partially integrated  | API rate limiter uses Redis with an in-memory insurance limiter        |
| MinIO          | Provisioned only      | Compose service is healthy; no application storage client yet          |
| Logging        | Integrated            | Pretty local output, JSON production output, sensitive-field redaction |
| API protection | Integrated foundation | Middleware and error contract are covered by API tests                 |

## Quality Checks

The current repository has scripts for:

- `bun run format:check`
- `bun run lint`
- `bun run check-types`
- `bun run test`
- `bun run build`
- `bun run check`

The API foundation currently has focused tests for security headers, CORS, request IDs, not-found responses, unexpected errors, content types, malformed JSON, validation errors, body size limits, and rate-limit responses.

## Known Limitations

- The current API is not yet a multi-tenant product surface because domain persistence and authorization are not implemented.
- The health endpoint reports application status and does not verify service dependencies.
- Local Compose credentials are development defaults and must not be reused in production.
- Redis-backed rate limiting is fail-closed when Redis is not ready in the real API server path.
- There is no production deployment or migration runbook yet.

## Recommended Next Priorities

1. Define the organization and membership schema with tenant-scoped identifiers.
2. Add Drizzle migrations and a minimal database service layer.
3. Configure Better Auth and the first authorization middleware.
4. Implement organization and project APIs with membership checks.
5. Add the first issue workflow and matching web screens.
6. Add integration tests for tenant isolation and permission boundaries.

## Update Rule

Update this document after each meaningful milestone. Record completed product behavior, infrastructure integration status, quality-check results, known limitations, and the next priorities. Keep this file factual and do not mark a feature complete until its persistence, authorization, tests, and user-facing flow are all in place.
