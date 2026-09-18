# TeamOS API Guide

This document is the working guide for adding, testing, and consuming the TeamOS HTTP API.

## Documentation Endpoints

When `API_DOCS_ENABLED=true`, the API exposes:

| Endpoint                                                 | Purpose                                          |
| -------------------------------------------------------- | ------------------------------------------------ |
| `/docs`                                                  | Interactive Scalar API reference                 |
| `/openapi.json`                                          | OpenAPI 3.1 document for generators and tooling  |
| `/`                                                      | API identity and liveness response               |
| `/health`                                                | Lightweight liveness endpoint                    |
| `/health/ready`                                          | PostgreSQL, Redis, and MinIO readiness status    |
| `/api/auth/*`                                            | Better Auth handler (sign-in, callback, session) |
| `/api/authentication/providers`                          | Enabled social sign-in providers                 |
| `/api/me`                                                | Authenticated user and session                   |
| `/api/organizations/{organizationSlug}`                  | Organization context for a member                |
| `/api/organizations/{slug}/members`                      | Searchable, paginated workspace members          |
| `/api/organizations/{slug}/invitations`                  | Pending workspace invitations                    |
| `/api/organizations/{slug}/projects`                     | Searchable workspace projects                    |
| `/api/organizations/{slug}/projects/{projectId}/members` | Project roles                                    |

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
- `socialProvidersResponseSchema`
- `currentUserResponseSchema`
- `organizationContextResponseSchema`
- `memberListResponseSchema`
- `invitationListResponseSchema`, `invitationResponseSchema`
- `projectListResponseSchema`, `projectDetailResponseSchema`, `projectMemberListResponseSchema`

Unexpected server errors must not expose stack traces, database messages, credentials, or implementation details. The public error response contains an error code, safe message, optional validation details, and request ID.

Common documented error statuses are:

| Status | Meaning                         |
| -----: | ------------------------------- |
|  `400` | Malformed request or JSON       |
|  `401` | Authentication required         |
|  `403` | Authenticated but not allowed   |
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
7. Redis-backed rate limiting, keyed by client IP.

`/health` and `/health/ready` bypass rate limiting. Domain endpoints must not bypass it without an explicit reason and a focused test.

Organization-scoped routes add a second rate limiter keyed by the authenticated actor (`user:<id>`) and configured by `MANAGEMENT_RATE_LIMIT_POINTS`. It protects invitations, role changes, and member removal, where an IP-only budget would let one account exhaust a shared NAT address.

### CSRF Protection

`createCsrfProtection` replaces the framework CSRF middleware. A cross-origin HTML form can only produce `application/x-www-form-urlencoded`, `multipart/form-data`, or `text/plain`, so those requests require `Sec-Fetch-Site: same-origin` or an allowlisted `Origin`. JSON and other bodies always trigger a CORS preflight that the origin allowlist rejects, and a bodyless unsafe request such as `DELETE` is allowed through to the handler. The framework default treated a missing `Content-Type` as `text/plain` and rejected every bodyless `DELETE`.

### Validation Responses

Route validation failures are converted into the TeamOS error contract as `422 VALIDATION_ERROR` with per-field details through the shared OpenAPI router factory, instead of the library's own `400` body.

## Authentication

Better Auth is mounted directly into Hono at `/api/auth/*` and owns the `user`, `session`, `account`, `verification`, `organization`, `member`, and `invitation` tables in `packages/db`.

- Session transport is the Better Auth cookie (`better-auth.session_token`, with a `__Secure-` prefix when secure cookies are enabled). OpenAPI declares it as the `sessionCookie` apiKey security scheme.
- `/api/auth/*` returns Better Auth's native responses and is intentionally not reshaped into the TeamOS error contract.
- TeamOS-owned routes use the shared error contract and the `unauthenticated`/`email_verification_required`/`forbidden` codes.
- `createSessionMiddleware` resolves the session into the typed `authSession` Hono variable. `createRequireVerifiedSessionMiddleware` rejects missing sessions with `401` and unverified emails with `403`.
- Every organization-scoped operation must resolve membership from the database and return `404` when the caller is not a member, before any permission check can return `403`.
- `activeOrganizationId` is a convenience field only and is never treated as an authorization boundary.

Social providers are enabled by configuring both credentials of the provider. `GET /api/authentication/providers` reports which providers are available so the frontend never renders an unusable button.

Account linking is enabled with implicit linking. Signing in with a provider whose email matches an existing user links the provider account to that user only when the provider reports the email as verified. Providers are not added to `trustedProviders`, because that would link accounts even when the provider cannot confirm email ownership.

Organization creation is capped by `MAX_ORGANIZATIONS_PER_USER` (default `3`) through the Better Auth `organizationLimit` option. The limit counts every organization the user belongs to, not only the ones they created, and returning a `403` `YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS` error is the native behavior. Because count and insert are separate operations, this is a best-effort cap rather than a hard invariant under concurrent requests.

Email verification and organization invitations are delivered through the Nodemailer SMTP adapter in `apps/api/src/infrastructure/email`. The adapter sends from a single configured mailbox, so the transport is provider-agnostic: Gmail with an App Password in development, or any SMTP-relaying transactional provider in production. In development without SMTP credentials the adapter throws instead of silently dropping mail. Delivery failures are logged and rethrown: Better Auth persists an invitation before sending its email, so a failed send returns `502 INVITATION_EMAIL_FAILED` and the client refreshes the pending invitation list instead of retrying a duplicate create. A durable outbox with retry is still required before transactional email is production-grade.

### Workspace Selection

`GET /api/organizations/{organizationSlug}` returns the organization context a member may open: id, name, slug, logo, role, member count, and `createdAt`. The client uses `createdAt` to order workspaces deterministically, because Better Auth does not guarantee a row order for its organization list. The web app remembers the last opened workspace per user in `localStorage`, reopens it while the user is still a member, otherwise opens the newest workspace, and sends users without workspaces to workspace creation.

### Member And Invitation Management

Better Auth keeps ownership of organizations, members, and invitations in `packages/db`. TeamOS wraps the mutations in a thin facade so authorization, auditing, rate limiting, and stable contracts apply consistently:

- `GET /api/organizations/{slug}/members` returns a page of members. `limit` defaults to 25 and is capped at 100, `offset` resumes a page, and `search` is a literal case-insensitive substring match on name or email. The match is case-insensitive on both sides and uses `position(...)` rather than `LIKE`, so characters such as `%` are never reinterpreted as wildcards.
- `PATCH /api/organizations/{slug}/members/{memberId}/role` accepts `admin` or `member`. The owner role is rejected by request validation and by a Better Auth `before` hook.
- `DELETE /api/organizations/{slug}/members/{memberId}` removes a member. Owners and the acting user can never be targeted through this route; leaving a workspace needs its own flow.
- `GET|POST /api/organizations/{slug}/invitations` lists pending invitations or creates one. Only owners and admins may list or create.
- `POST /api/organizations/{slug}/invitations/{invitationId}/resend` cancels the previous pending invitation and issues a new one, so a previously emailed link stops working. `resend: true` is rejected because it would keep the old invitation ID valid.
- `DELETE /api/organizations/{slug}/invitations/{invitationId}` cancels an invitation.

Existing members and pending invitations are reported as `409` with `MEMBER_ALREADY_IN_ORGANIZATION` and `INVITATION_ALREADY_PENDING`. Better Auth error codes are mapped into TeamOS codes; unknown failures become `502 HTTP_ERROR` without echoing provider or database details.

Accepting, rejecting, and reading an invitation by ID still use the native Better Auth endpoints, because Better Auth already enforces recipient email matching, verified email, expiry, and single use.

`cancelPendingInvitationsOnReInvite: true`, `invitationLimit: MAX_PENDING_INVITATIONS`, and `membershipLimit: MAX_ORGANIZATION_MEMBERS` are configured explicitly instead of relying on library defaults.

### Blocked Native Endpoints

The browser must not reach the Better Auth endpoints that the TeamOS facade replaces. These paths return the TeamOS `404` envelope before the Better Auth handler runs:

- `/api/auth/organization/get-full-organization`
- `/api/auth/organization/list-invitations`
- `/api/auth/organization/list-members`
- `/api/auth/organization/invite-member`
- `/api/auth/organization/cancel-invitation`
- `/api/auth/organization/update-member-role`
- `/api/auth/organization/remove-member`

Blocking matters because Better Auth only requires organization membership for `listInvitations` and `listMembers`, and because the raw invitation list contains action-capable invitation IDs. The path check decodes percent-encoding, collapses duplicate slashes, drops a trailing slash, and lowercases before comparing, so simple variants cannot slip past. Server-side calls through `auth.api.*` bypass the block by design, and tests cover both the blocked paths and an unblocked path such as `/api/auth/organization/accept-invitation`.

### Project Authorization

Project access is a TeamOS domain concern; Better Auth organization roles and teams cannot express a per-project role. Organization owners and admins always keep full control of every project, including private ones. Everyone else is additively granted access by a project role:

| Action                   | Owner/Admin | Lead | Member | Viewer | Unassigned member |
| ------------------------ | ----------- | ---- | ------ | ------ | ----------------- |
| View a workspace project | Yes         | Yes  | Yes    | Yes    | Yes               |
| View a private project   | Yes         | Yes  | Yes    | Yes    | No                |
| Update project settings  | Yes         | Yes  | No     | No     | No                |
| Manage project members   | Yes         | Yes  | No     | No     | No                |
| Create or update issues  | Yes         | Yes  | Yes    | No     | No                |
| Delete issues            | Yes         | Yes  | Yes    | No     | No                |
| Delete a project         | Yes         | No   | No     | No     | No                |

`GET /api/organizations/{slug}/projects` accepts an optional `search` term that matches the project name with the same literal, case-insensitive substring comparison used for members.

Every workspace member may create a project and becomes its `lead` in the same transaction, so a project always starts with at least one lead. A project must keep at least one lead; a non-administrator cannot demote or remove the last one, while an organization owner or admin can still recover a project that lost its lead.

Cross-tenant integrity is enforced by the database, not only by service checks. `member(id, organization_id)` carries a composite unique constraint and `project_membership` references both `project(id, organization_id)` and `member(id, organization_id)` with composite foreign keys, so granting a project role to a member of another workspace fails at the database level.

An inaccessible project is reported as `404 PROJECT_NOT_FOUND` even when it exists, so private projects cannot be enumerated. A visible project with a denied action returns `403 FORBIDDEN`.

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

`packages/db/src/schema/projects.ts` is TeamOS-owned and hand-written. It adds `project` and `project_membership`, plus the composite `member(id, organization_id)` unique constraint that makes cross-tenant project membership impossible.

Migrations that add a referenced composite unique constraint must place it before the foreign keys that use it. Drizzle Kit can emit them in the opposite order, which PostgreSQL rejects, so review generated SQL and reorder when needed.

`bun run --cwd apps/api verify:isolation` runs a local integration check against PostgreSQL. It creates temporary rows, proves that same-tenant project roles succeed and cross-tenant grants fail, and then removes the rows.

The Better Auth tables in `packages/db/src/schema/auth.ts` are generated from the auth config, not hand-written. After changing plugins, models, or `additionalFields`, regenerate them from `apps/api`:

```bash
bun run --cwd packages/shared build
bun run --cwd packages/db build
bun x auth@1.7.5 generate --config src/auth/cli.ts --adapter drizzle --dialect postgresql \
  --output ../../packages/db/src/schema/auth.ts -y
bun run db:generate
bun run db:migrate
```

`apps/api/src/auth/cli.ts` keeps the generation config free of the Bun-only database client so the CLI can load it under Node.

Regenerating `auth.ts` drops the TeamOS-added `member_id_organization_unique` constraint. Re-add it after every regeneration, rebuild `packages/db`, and run `bun run db:generate` again before committing.

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
