# TeamOS Progress

Last updated: 2026-09-26

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
- Implicit account linking for verified provider emails, without trusting providers that cannot confirm email ownership.
- Session middleware with a typed `authSession` context value and email-verification guard.
- Nodemailer SMTP email adapter with verification and organization invitation templates.
- Escaped, HTML and plain-text email rendering with delivery failures logged rather than swallowed.
- Organization-scoped access service that queries membership from PostgreSQL and powers `404` for non-members.
- Social provider discovery endpoint that reflects the configured OAuth credentials.
- Better Auth schema (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`) generated into `packages/db` and applied through the first Drizzle migration.
- Configurable `MAX_ORGANIZATIONS_PER_USER` workspace cap passed to the Better Auth organization plugin.
- Frontend session, workspace, invitation, and sign-in hooks with public auth routes and a protected workspace layout.
- Workspace switcher and account menus built from shadcn dropdown, avatar, separator, tabs, and empty primitives.
- Workspace creation that updates the cached organization list before navigating, retries taken slugs, and surfaces the workspace limit.
- Drizzle Studio runs with `bun run dev` and the API logs its browser URL beside the API URL in development.
- Shared organization member-management policies (`admin`/`member` assignment, owner protection) and project permission policies with focused tests.
- Searchable, paginated workspace member listing with a hard page cap and literal substring matching.
- TeamOS member and invitation management facade backed by Better Auth server APIs, with mapped error codes, structured audit logs, and a per-actor rate limiter.
- Blocked direct browser access to the replaced Better Auth member and invitation endpoints.
- Better Auth hardening: owner roles rejected by a `before` hook, `resend: true` rejected so invitation links rotate, and explicit membership and invitation limits.
- Workspace members UI with debounced server search, avatars, role controls, invite dialog, pending invitations with resend and cancel, and confirmed removal.
- Project and project-membership tables with composite foreign keys that make cross-tenant project membership impossible at the database level.
- Project CRUD and project role management APIs with private-project visibility rules and last-lead protection.
- Projects UI listing visibility and member counts, project creation, and a project members dialog for role changes and revocation.
- Replaced the framework CSRF middleware so bodyless unsafe requests such as `DELETE` are accepted while form-encodable cross-site requests stay blocked.
- Validation failures now return the shared `422 VALIDATION_ERROR` contract instead of the framework's own `400` body.
- Every unsafe cookie-authenticated request is validated against the origin allowlist or Fetch Metadata, including bodyless requests; sibling-subdomain `same-site` requests are rejected.
- Native Better Auth organization `update`, `delete`, and `leave` endpoints stay blocked for browser callers, while the TeamOS settings facade owns workspace rename and deletion.
- Workspace settings facade with `PATCH` and `DELETE /api/organizations/{organizationSlug}`: owners and admins may rename, only owners may delete, deletion requires typing the exact workspace name, and Better Auth deletion is enabled internally for the server gateway only.
- Workspace settings UI with role-aware visibility, inline rename errors, and a typed-confirmation danger zone; deletion clears organization-scoped caches and navigates with `replace` to the next workspace or creation.
- Organization membership is unique per `(organization, user)` at the database level, and the project audit foreign keys use single-column `SET NULL` so removing a project author no longer nulls the project tenant.
- Multi-role organization values such as `"admin,owner"` are parsed with owner precedence, so owner protection cannot be bypassed by role ordering.
- Invitation cancellation and resend resolve the invitation through the workspace-scoped list and only act on a live pending invitation.
- Project mutations re-check the actor's authorization after locking the project row, closing the role-revocation race.
- Production requires HTTPS for `BETTER_AUTH_URL`, `WEB_URL`, and `CORS_ORIGINS` (loopback excepted).
- The browser reads its session from the sanitized `/api/me` response, so the Better Auth session token stays out of JavaScript; session failures surface as a retryable error instead of a forced logout.
- Login preserves the requested deep link, and invitation sign-in carries the invitation through email verification so the recipient returns to it.
- Better Auth mutations reset their pending state on thrown errors, and invitation acceptance falls back to the root route if opening the workspace fails.
- Profile updates go through `PATCH /api/me`: the facade accepts only a trimmed 1-80 character display name, applies the per-actor management rate limit, forwards Better Auth's refreshed session cookie, and writes a `user.profile.updated` audit record containing only the actor and changed field names.
- The native `/api/auth/update-user` endpoint is blocked for browser callers, so name edits cannot bypass TeamOS validation and auditing; email, avatar, and password changes have no TeamOS flow yet.

### Frontend architecture

- Feature-first `apps/web/src` layout: `app` (providers and routes), `layouts` (router layouts plus their orchestration hooks), `routes` (`*-route.tsx` URL modules), `features/<capability>` (`api`, `components`, `hooks`, `lib`, `query-keys`), and `shared` for genuinely cross-feature browser code.
- `features/auth`, `features/workspaces`, `features/members`, `features/projects`, and `features/system` now own their components, hooks, API modules, and query keys; each exposes one `index.ts` barrel.
- Generated shadcn primitives stay in `apps/web/src/components/ui` and the `cn` helper stays on the shadcn `utils` alias; neither is relocated for organizational reasons.
- Nested React Router routes: `/workspaces/:organizationSlug` renders a `WorkspaceLayout` with `projects`, `members`, and `settings` children, an index redirect, and an explicit not-found route instead of a catch-all redirect. A project overview lives beside that layout at `/workspaces/:organizationSlug/projects/:projectSlug`.
- Workspace pages keep the centered tab shell. Only a project page uses the inset, icon-collapsible shadcn sidebar, with a back link to Projects, an Overview item, and the account identity in the footer. The overview is built from the visible project list and its members.
- Account screens live under `/account` behind a dedicated `AccountLayout` that is a sibling of `WorkspaceLayout`; `/account/profile` renders the profile screen without loading any workspace or organization context.
- The profile screen shows an avatar preview and read-only email, edits the display name with a single save action, updates the `current-user` cache so the account menu reflects the change immediately, and refreshes the shared organization member caches.
- Workspace tabs are route-aware links, so refreshing, linking, and browser back/forward keep the selected tab.
- The previously oversized workspace page was split into a workspace layout hook, two feature route modules, and focused `useProjectList`/`useProjectMembers`/`useProjectSearch` hooks.
- The 566-line workspace integration test was split into layout, projects, and members suites with shared MSW fixtures in `apps/web/src/test`.
- Project search now also runs server-side with the same bounded, literal substring matching as member search.
- Project cards use the shadcn `Card` composition with a semantic heading, visibility badge, member count, and an overflow action menu.
- The members view is a semantic responsive `Table`: the role column collapses under the member email on narrow screens, and pending invitations use their own table with one overflow action menu.
- Application code no longer passes compact `size="sm"` overrides; only semantic icon sizes such as `size="icon"` remain.
- Coded domain values are rendered through typed label mappers: `getOrganizationRoleLabel`, `getProjectRoleLabel`, and `getProjectVisibilityLabel` live in `packages/shared`, readiness dependency labels and theme labels are mapped where they are used, and Base UI selects receive the label record through `items` so the trigger shows the label rather than the stored value.
- Workspace selection is deterministic: the client remembers the last opened workspace per user in `localStorage`, reopens it while the user is still a member, and otherwise opens the newest workspace using the organization `createdAt` rather than the undefined Better Auth row order. Users without workspaces go to `/workspaces/new`.
- Sign-out now clears the query cache and navigates only after the server confirms it; a failed sign-out keeps the user in place and surfaces a retryable alert.
- `OrganizationSummary` and the organization context response now include `createdAt`.

## In Progress

- Issue domain model and workflow.
- Invitation delivery reliability through a durable outbox and background worker.

## Not Started

- Issue Drizzle tables, statuses, priorities, labels, assignment, and ordering.
- Issue board and list screens.
- Workspace and project settings beyond member management.
- Durable chat channels and messages.
- Schedule, events, and team availability.
- MinIO bucket management, signed URLs, and attachment ownership metadata.
- Shared real-time event contracts and Redis pub/sub delivery.
- Production deployment, secret management, observability, and backup procedures.

## Infrastructure Integration Status

| Area           | Status                | Notes                                                                                             |
| -------------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| PostgreSQL     | Connected at boot     | `@teamos/db` probes with `SELECT 1`; owns the Better Auth, project, and project-membership tables |
| Redis          | Partially integrated  | API rate limiter uses Redis with an in-memory insurance limiter                                   |
| MinIO          | Connected at boot     | S3 client probes credentials with `ListBuckets`; storage workflows pending                        |
| Logging        | Integrated            | Pretty local output, JSON production output, sensitive-field redaction                            |
| API protection | Integrated foundation | Middleware and error contract are covered by API tests                                            |
| API docs       | Integrated            | OpenAPI 3.1 at `/openapi.json`, Scalar UI at `/docs`, cookie session scheme                       |
| Authentication | Integrated            | Better Auth OAuth with email verification, session guard, and SMTP email                          |
| Email          | Integrated            | Nodemailer SMTP adapter for verification and invitations; required in production                  |

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
- `bun run --cwd apps/api verify:isolation`

The API foundation currently has focused tests for security headers, CORS, request IDs, root/liveness/readiness contracts, OpenAPI exposure, unexpected errors, content types, malformed JSON, validation errors, body size limits, rate-limit responses, CSRF behavior including bodyless unsafe requests, environment validation, bootstrap service failure handling, provider discovery, unauthenticated and unverified sessions, current-user contracts, member listing pagination and search, invitation and member management authorization, workspace rename and deletion authorization and confirmation, profile update validation, cookie forwarding, and native endpoint blocking, blocked native Better Auth endpoints, per-actor management rate limiting, and organization membership isolation. Shared utilities have tests for slug generation, organization roles, member-management policies, project permission policies, member and invitation contracts, project contracts, and avatar initials. Frontend tests cover the readiness gate, unauthenticated redirect, social provider rendering, workspace shell and route-aware tabs, workspace destination resolution and per-user workspace memory, sign-out success and failure, workspace creation cache updates, slug retries, the workspace limit message, workspace settings rename and deletion including role visibility and typed confirmation, profile editing including read-only email, draft preservation, and immediate account-menu refresh, project and member search debounce behavior, member table rendering and pagination, invitation management visibility, resend and cancel, member removal, project cards, project creation, and project role changes.

`bun run --cwd apps/api verify:isolation` additionally proves tenant isolation against a live PostgreSQL database: literal wildcard handling, workspace-scoped search, private project hiding, cross-tenant project role rejection, and last-lead protection.

## Known Limitations

- The current API is not yet a multi-tenant product surface because domain persistence beyond organizations is not implemented.
- Organization and membership management relies on Better Auth plugin endpoints; TeamOS-specific management screens are still minimal.
- The `MAX_ORGANIZATIONS_PER_USER` cap counts all memberships and is not atomic, so concurrent creation can exceed it.
- OAuth access, refresh, and ID tokens are stored unencrypted in the account table; application-level encryption needs a key-management decision.
- Sensitive organization administration does not yet require a fresh session or reauthentication.
- Organization update and deletion now have TeamOS facades; ownership transfer and self-service leaving still await their own flows.
- The account menu exposes a Profile link and sign-out; billing and support entries return when those flows exist.
- Email changes are not configured and remain read-only on the profile screen; a change requires verifying the new address plus a non-enumerating confirmation flow.
- Avatars are display-only: MinIO has no bucket, upload, signing, or object-ownership workflow, so remote image URLs are not accepted.
- Invitations require configured SMTP credentials; without them verification and invitation email cannot be delivered.
- Development allows authentication without OAuth credentials, but production startup requires both Google and GitHub credentials plus SMTP configuration.
- The readiness endpoint verifies connectivity but does not replace ongoing dependency monitoring.
- Local Compose credentials are development defaults and must not be reused in production.
- Redis-backed rate limiting is fail-closed when Redis is not ready in the real API server path.
- There is no production deployment or migration runbook yet.
- The management facade covers member and invitation mutations; ownership transfer and self-service workspace leaving still need their own flows.
- Invitation delivery is not yet durable. A failed send leaves a pending invitation behind and requires a manual resend.
- Project roles are enforced by TeamOS services and database constraints; real-time project transports do not exist yet, so they need the same access checks when they are added.

## Recommended Next Priorities

1. Add the issue tables, workflow, and screens on top of the existing project authorization.
2. Add ownership transfer and self-service workspace leaving with last-owner protection.
3. Add a durable outbox and background worker for transactional email, including invitation resend.
4. Add integration tests against PostgreSQL, Redis, and MinIO for real session and membership flows.
5. Add project settings for rename, visibility, and archive.
6. Reuse the lightweight organization access resolver for every remaining tenant-scoped query and route.

## Update Rule

Update this document after each meaningful milestone. Record completed product behavior, infrastructure integration status, quality-check results, known limitations, and the next priorities. Keep this file factual and do not mark a feature complete until its persistence, authorization, tests, and user-facing flow are all in place.
