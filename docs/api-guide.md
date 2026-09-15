# TeamOS API Guide

This document is the working guide for adding, testing, and consuming the TeamOS HTTP API.

## Documentation Endpoints

When `API_DOCS_ENABLED=true`, the API exposes:

| Endpoint        | Purpose                                         |
| --------------- | ----------------------------------------------- |
| `/docs`         | Interactive Scalar API reference                |
| `/openapi.json` | OpenAPI 3.1 document for generators and tooling |
| `/`             | API identity and liveness response              |
| `/health`       | Lightweight liveness endpoint                   |
| `/health/ready` | PostgreSQL, Redis, and MinIO readiness status   |

Documentation is enabled by default in development and test. It is disabled by default in production and must be explicitly enabled with `API_DOCS_ENABLED=true`.

The OpenAPI document is generated from route declarations. Do not maintain a separate hand-written endpoint list.

## API Conventions

- Use versioned public IDs for domain resources.
- Scope organization-owned resources to an organization in both authorization and database queries.
- Keep route handlers thin: validate input, call a service, and translate the result.
- Keep business operations in `apps/api/src/services`.
- Keep reusable browser-safe contracts in `packages/shared`.
- Keep database runtime and Drizzle schema in `packages/db`.
- Store timestamps in UTC and localize them only at display boundaries.
- Return explicit status codes from OpenAPI handlers.
- Use `requestId` from the request context for logs and error responses.

## Response Contracts

Successful responses should use a shared Zod contract whenever the response crosses the API boundary. Current shared contracts include:

- `rootResponseSchema`
- `healthStatusSchema`
- `readinessStatusSchema`
- `apiErrorResponseSchema`

Unexpected server errors must not expose stack traces, database messages, credentials, or implementation details. The public error response contains an error code, safe message, optional validation details, and request ID.

Common documented error statuses are:

| Status | Meaning                         |
| -----: | ------------------------------- |
|  `400` | Malformed request or JSON       |
|  `404` | Resource or route not found     |
|  `408` | Request timeout                 |
|  `413` | Request body too large          |
|  `415` | Unsupported content type        |
|  `422` | Validation failure              |
|  `429` | Rate limit exceeded             |
|  `500` | Unexpected server failure       |
|  `503` | Required dependency unavailable |

## Adding An Endpoint

1. Define request and response schemas. Put cross-app contracts in `packages/shared`; keep API-only documentation metadata in the API.
2. Create a `createRoute()` declaration with `operationId`, `summary`, `tags`, request schemas, response schemas, descriptions, and relevant headers.
3. Register the route on an `OpenAPIHono` route module.
4. Put authorization and domain behavior in a service, not in the route handler.
5. Mount the route from the owning route barrel and app composition.
6. Add success, validation, authorization, tenant-isolation, dependency-failure, and error-contract tests as applicable.
7. Check `/openapi.json` structurally in tests and inspect `/docs` locally.

Example shape:

```ts
const route = createRoute({
  method: "get",
  operationId: "getProject",
  path: "/projects/{projectId}",
  request: {
    params: projectParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: projectResponseSchema } },
      description: "Returns the project.",
    },
    404: projectNotFoundResponse,
  },
  summary: "Get a project",
  tags: ["Projects"],
});
```

## Middleware And Limits

Global middleware runs before route dispatch:

1. CORS and security headers.
2. Request ID and client IP.
3. Request logging.
4. Content-Type validation.
5. Body-size and timeout limits.
6. CSRF protection.
7. Redis-backed rate limiting.

`/health` and `/health/ready` bypass rate limiting. Domain endpoints must not bypass it without an explicit reason and a focused test.

## Authentication

Authentication and authorization are not yet implemented. Do not add a fake bearer scheme to OpenAPI. When Better Auth is introduced, document the actual session or cookie transport and mark protected operations with the real security scheme.

## Testing The API

Fast tests run with:

```bash
bun run --cwd apps/api test
bun run --cwd apps/api test:coverage
```

The default API tests use injected memory/fake dependencies. They cover response contracts, middleware behavior, OpenAPI exposure, readiness behavior, configuration validation, and bootstrap connection policy.

Infrastructure integration tests should use PostgreSQL, Redis, and MinIO from Docker Compose and must not share the normal development database.

## Database Commands

The database package owns Drizzle commands:

```bash
bun run db:check
bun run db:generate -- --name=add-projects
bun run db:migrate
bun run db:studio
```

`generate` compares the schema in `packages/db/src/schema` with the previous migration state. `migrate` applies committed SQL migrations. The API never runs migrations automatically during boot.

## Startup And Readiness

The API startup sequence is:

1. Validate environment variables.
2. Create the logger.
3. Create PostgreSQL, Redis, and MinIO adapters.
4. Connect and probe all three services with a bounded timeout.
5. Build the app with connected dependencies.
6. Start `Bun.serve`.
7. Log that the API is ready.

If any required service fails, the API does not listen and closes resources created during the failed startup. Shutdown stops the HTTP server, closes PostgreSQL, gracefully quits Redis, and destroys the MinIO client.

`/health` is liveness only. `/health/ready` reports sanitized dependency statuses and returns `503` when any required dependency is unavailable.
