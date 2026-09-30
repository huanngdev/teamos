# TeamOS Progress

Last updated: 2026-10-01

This file is the product snapshot: what is coded, what is finished, which HTTP APIs exist, and what each UI route does. OpenAPI at `/openapi.json` remains the machine-readable contract. Do not mark a feature complete here until its persistence, authorization, tests, and user-facing flow all exist.

## Current Milestone

The issue list and the issue board are both implemented. The list is `/workspaces/:organizationSlug/projects/:projectSlug/issues`. The board is the same path with `/board`. The list is a table. Search and column filters are sent to `GET .../issues`. Sort and paging stay in the browser. The board is the kanban from `docs/plans/issue-list.md`. Project settings in `docs/plans/project-settings.md` are implemented too. A new project is seeded with workflow columns. Members create, edit, assign, and drag issues. Leads manage columns. A lead, owner, or admin can change the project name, description, and visibility from `/workspaces/:organizationSlug/projects/:projectSlug/settings`.

Labels, comments, and realtime are still open. A stable issue URL is not built yet. The next product step is not agreed yet. The recommendation at the bottom is a suggestion, not an accepted plan.

## What is finished

A row is finished only when the database, the server check, the tests, and the screen all exist.

| Area             | Finished behavior                                                                                                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace        | Create a workspace, remember the last one per user, switch workspaces, rename, and delete with a typed name. Owners and admins rename. Only owners delete.                                                                                                      |
| Members          | Search and page members, change `admin` or `member`, invite, resend, cancel, and remove. The owner role is never granted here.                                                                                                                                  |
| Projects         | List and search projects, create one, and show visibility plus member count. Private projects stay hidden from members without a project role.                                                                                                                  |
| Project access   | Grant, change, and revoke `lead`, `member`, and `viewer`. The last lead cannot be removed. Organization owners and admins keep full project control.                                                                                                            |
| Profile          | Read the session from `/api/me`. Edit a display name of 1–80 characters. Email stays read-only.                                                                                                                                                                 |
| Issue list       | Table of matching issues, newest first, with `#number`, server search and filters, client sort, and paging. A lead can select rows across pages and delete them in one request. A viewer can read and cannot create or delete. |
| Issue board      | Five seeded columns at `.../issues/board`. Create and edit issues, drag cards and columns, add, rename, and delete empty columns. A card shows the title, a priority icon, and the assignee name or an unassigned icon. Columns and the board use scroll fades. |
| Project settings | Change the name, description, and visibility. The slug stays fixed. An organization owner or admin deletes the project by typing its exact name. A member or viewer who opens the URL is sent to the overview.                                                  |
| Auth             | Google and GitHub sign-in, email verification, invitation acceptance, session cookie, and blocked native management endpoints.                                                                                                                                  |

## What is coded but has no screen

- A development-only **Seed issues** button on the issues route and the board route fills the project through one bulk create. It is hidden outside `import.meta.env.DEV`.
- Issue `number` is stored and returned by the issue API. The issue table renders `#number`. Cards and the edit dialog do not.

## UI routes

Routes are registered in `apps/web/src/app/routes.tsx`. Anything under `ProtectedLayout` requires a verified session. An unknown URL renders the not-found page instead of bouncing to `/`.

### Public

| Route                        | Screen        | What it does                                                                                                  |
| ---------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------- |
| `/login`                     | Sign in       | Shows the configured Google and GitHub buttons. A signed-in user continues to `next`, or to `/auth/complete`. |
| `/auth/complete`             | After sign-in | Sends a verified user to their workspace. An unverified user is sent to verify their email.                   |
| `/auth/verify-email`         | Verify email  | Asks for an email and sends a new verification link. `next` is preserved when it is an app path.              |
| `/invitations/:invitationId` | Invitation    | The recipient signs in if needed, then accepts or rejects. Acceptance opens that workspace.                   |

### Signed in, no project

`WorkspaceLayout` puts the logo, workspace switcher, theme toggle, and account menu in the header. The Projects and Members tabs show counts. Settings appears only for an owner or admin.

| Route                                    | Screen             | What it does                                                                                                                            |
| ---------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                      | Workspace picker   | Opens the last workspace this user used, otherwise the newest one. With no workspace, it offers creation.                               |
| `/workspaces/new`                        | Create workspace   | Name form. Retries a taken slug and explains the workspace limit.                                                                       |
| `/account`                               | Account            | Redirects to `/account/profile`.                                                                                                        |
| `/account/profile`                       | Profile            | Avatar preview, read-only email, and a display-name save. Does not load a workspace.                                                    |
| `/workspaces/:organizationSlug`          | Workspace shell    | Redirects to `projects`. Tabs: Projects, Members, and Settings for owners and admins.                                                   |
| `/workspaces/:organizationSlug/projects` | Project list       | Search, cards, and create. A card opens the project overview.                                                                           |
| `/workspaces/:organizationSlug/members`  | Members            | Member table, role changes, invites, pending invitations, and removal.                                                                  |
| `/workspaces/:organizationSlug/settings` | Workspace settings | Rename, and a danger zone that deletes the workspace after the exact name is typed. Members who open the URL are sent back to Projects. |

### Inside a project

`ProjectLayout` is the inset sidebar. The sidebar header links back to the project list. The breadcrumb is the workspace switcher, the project switcher, and the page name. The project switcher can create a project. The header also has the theme toggle, and development builds show **Seed issues** on the issues route and the board route. The sidebar footer has the account menu.

| Route                                                              | Screen           | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/workspaces/:organizationSlug/projects/:projectSlug`              | Overview         | Name, description, visibility, role, member count, dates, and a members dialog for role changes and revocation.                                                                                                                                                                                                                                                                                                                                                 |
| `/workspaces/:organizationSlug/projects/:projectSlug/issues`       | Issue list       | Table of matching issues, newest first. Visible columns start as a pinned checkbox, `#number`, title, status, priority, assignee, created, and updated. Category and description stay hidden until Layout shows them. Search, filters, sort, page size, column order, and hidden columns are stored in the URL. Search and filters are fetched from the API. Sort and pages run on that response. Status is an icon plus the column name, using the board category color. Created and updated include the time. The header stays fixed while the body scrolls. Other columns can be pinned. Selected issue ids stay in a Zustand store for the project, so changing page does not clear them. A lead sees Delete next to the filters and confirms in an alert dialog. That sends one bulk delete. New issue sits on the right and creates into Backlog. A viewer can open the dialog read-only and does not see New issue or Delete. Page sizes are 10, 20, and 50. |
| `/workspaces/:organizationSlug/projects/:projectSlug/issues/board` | Issue board      | Columns show a category icon, name, and count. Cards show title, a priority icon, and the assignee. They do not show `#number`. Click opens a dialog for title, description, column, priority, and assignee. A viewer can open it read-only. `+` creates in that column. A lead reorders columns from the grip and renames or deletes from the column menu.                                                                                                     |
| `/workspaces/:organizationSlug/projects/:projectSlug/settings`     | Project settings | Edit name, description, and visibility. Save sends one patch of the fields that changed. The slug is shown and cannot be changed. Owners and admins can delete the project after typing its name, then return to the project list. Members and viewers are sent to the overview.                                                                                                                                                                                |
| `*`                                                                | Not found        | Says the path does not exist and links back to `/`.                                                                                                                                                                                                                                                                                                                                                                                                             |

Sidebar items are **Overview**, **Issues**, **Board**, and **Settings**. The Issues item matches only the list. The Board item matches only the board. Settings is shown to a lead and to an organization owner or admin.

### Board rules the screen already enforces

- A new project gets Backlog, Todo, In Progress, Done, and Canceled. Backlog is the default inbox.
- A card shows the title, a priority icon, and the assignee's name or an unassigned icon. The dialog holds the description, column, priority, and assignee. `#number` is shown on the issue table. Cards and the dialog leave it off.
- A member can create and move issues. A viewer can only look. A lead, or an organization owner or admin, can delete an issue and manage columns.
- Creating a 201st issue is rejected. The board and the issue table each load at most 200 issues. If `total` is higher, each screen shows a truncation alert. The board still shows every column.
- A project accepts at most 20 columns. The default column cannot be deleted. A column with issues cannot be deleted.
- Scroll fade uses the shadcn `scroll-fade` utilities: vertical inside a column, horizontal across the columns.
- The list view, its search, and its filters live on the issues route. The board has no label, comment, or live update. Refresh loads the board again.

## HTTP API

TeamOS routes below use the shared error contract. Paths are mounted in `apps/api/src/app.ts`. Organization routes are mounted at `/api/organizations`, so `{organizationSlug}` is the first path segment.

An inaccessible organization or private project is `404`. A visible resource with a denied action is `403`.

### Platform

| Method | Path            | Purpose                                     |
| ------ | --------------- | ------------------------------------------- |
| `GET`  | `/`             | API identity and liveness                   |
| `GET`  | `/health`       | Liveness                                    |
| `GET`  | `/health/ready` | PostgreSQL, Redis, and MinIO readiness      |
| `GET`  | `/openapi.json` | OpenAPI 3.1 document, when docs are enabled |
| `GET`  | `/docs`         | Scalar reference, when docs are enabled     |

### Session and profile

| Method  | Path                            | Purpose                                                        |
| ------- | ------------------------------- | -------------------------------------------------------------- |
| `GET`   | `/api/authentication/providers` | Which of Google and GitHub are configured                      |
| `GET`   | `/api/me`                       | Sanitized current user. The session token stays in the cookie. |
| `PATCH` | `/api/me`                       | Update the display name. Rate limited and audited.             |

`/api/auth/*` is Better Auth. The browser still uses it for sign-in, OAuth callback, session, sign-out, workspace creation, and invitation accept or reject. These management paths are blocked for browser callers and must go through the TeamOS facade instead:

- `/api/auth/organization/update`, `delete`, `leave`
- `/api/auth/organization/get-full-organization`, `list-members`, `list-invitations`
- `/api/auth/organization/invite-member`, `cancel-invitation`, `remove-member`, `update-member-role`
- `/api/auth/update-user`

### Workspace

| Method   | Path                                                                      | Who          | Purpose                                      |
| -------- | ------------------------------------------------------------------------- | ------------ | -------------------------------------------- |
| `GET`    | `/api/organizations/{organizationSlug}`                                   | Member       | Workspace name, slug, role, and counts       |
| `PATCH`  | `/api/organizations/{organizationSlug}`                                   | Owner, admin | Rename                                       |
| `DELETE` | `/api/organizations/{organizationSlug}`                                   | Owner        | Delete after the body repeats the exact name |
| `GET`    | `/api/organizations/{organizationSlug}/members`                           | Member       | Searchable, paginated members                |
| `PATCH`  | `/api/organizations/{organizationSlug}/members/{memberId}/role`           | Owner, admin | Set `admin` or `member`                      |
| `DELETE` | `/api/organizations/{organizationSlug}/members/{memberId}`                | Owner, admin | Remove a member                              |
| `GET`    | `/api/organizations/{organizationSlug}/invitations`                       | Owner, admin | Pending invitations                          |
| `POST`   | `/api/organizations/{organizationSlug}/invitations`                       | Owner, admin | Invite. The owner role is rejected.          |
| `POST`   | `/api/organizations/{organizationSlug}/invitations/{invitationId}/resend` | Owner, admin | Rotate the invitation link and send again    |
| `DELETE` | `/api/organizations/{organizationSlug}/invitations/{invitationId}`        | Owner, admin | Cancel a pending invitation                  |

### Projects

| Method   | Path                                          | Who                             | Purpose                                                                        |
| -------- | --------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| `GET`    | `.../projects`                                | Member                          | Searchable project list. Private projects are omitted without a project role.  |
| `POST`   | `.../projects`                                | Member                          | Create. The creator becomes the lead. Seeds the five columns.                  |
| `PATCH`  | `.../projects/{projectId}`                    | Lead, owner, admin              | Update name, description, or visibility. The slug is immutable.                |
| `DELETE` | `.../projects/{projectId}`                    | Owner, admin                    | Delete after the body repeats the exact project name. A lead cannot delete it. |
| `GET`    | `.../projects/{projectId}/members`            | Someone who can see the project | List project roles                                                             |
| `PUT`    | `.../projects/{projectId}/members/{memberId}` | Lead, owner, admin              | Grant or change `lead`, `member`, or `viewer`                                  |
| `DELETE` | `.../projects/{projectId}/members/{memberId}` | Lead, owner, admin              | Revoke a project role. The last lead stays.                                    |

`...` means `/api/organizations/{organizationSlug}`.

### Issue board

| Method   | Path                                           | Who                             | Purpose                                                                  |
| -------- | ---------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| `GET`    | `.../projects/{projectId}/statuses`            | Someone who can see the project | Columns, ordered by position                                             |
| `POST`   | `.../projects/{projectId}/statuses`            | Lead, owner, admin              | Add a column. Category is chosen once and is not editable later.         |
| `PATCH`  | `.../projects/{projectId}/statuses/{statusId}` | Lead, owner, admin              | Rename or move by `index`. The client never sends `position`.            |
| `DELETE` | `.../projects/{projectId}/statuses/{statusId}` | Lead, owner, admin              | Delete an empty column that is not the default                           |
| `GET`    | `.../projects/{projectId}/issues`              | Someone who can see the project | Up to 200 matching issues plus `total`. Optional filters. `facets=1` adds counts. |
| `POST`   | `.../projects/{projectId}/issues`              | Member, lead, owner, admin      | Create one issue. Omitted `statusId` uses Backlog and places it at the top. |
| `POST`   | `.../projects/{projectId}/issues/bulk`         | Member, lead, owner, admin      | Create many issues in one request. Used by the development seed.            |
| `PATCH`  | `.../projects/{projectId}/issues/{issueId}`    | Member, lead, owner, admin      | Title, description, priority, assignee, column, and `index`                 |
| `POST`   | `.../projects/{projectId}/issues/bulk-delete`  | Lead, owner, admin              | Delete the given issue ids in one transaction                               |
| `DELETE` | `.../projects/{projectId}/issues/{issueId}`    | Lead, owner, admin              | Delete one issue                                                            |

Priorities are `none`, `low`, `medium`, `high`, and `urgent`. Column categories are `backlog`, `unstarted`, `started`, `completed`, and `canceled`. A column name is free text. The stored identifier is `#number` inside the project, not a project key. The issue table renders it. Cards and the edit dialog do not. The table sends search and column filters on `GET` issues. `q` matches title, description, number, status name, priority, assignee, and category. Date filters use the browser time zone. `assignee=unassigned` matches issues with no assignee. Sort and page stay in the URL and are applied in the browser to that response. Selected row ids are client state, not a query parameter.

## Database

PostgreSQL through Drizzle in `packages/db`.

| Table                                        | Owner                                          | Holds                                                             |
| -------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| `user`, `session`, `account`, `verification` | Better Auth                                    | Identity and sessions                                             |
| `organization`, `member`, `invitation`       | Better Auth, mutated through the TeamOS facade | Workspaces and membership                                         |
| `project`, `project_membership`              | TeamOS                                         | Projects and `lead` / `member` / `viewer`                         |
| `project_status`                             | TeamOS                                         | Board columns                                                     |
| `issue`                                      | TeamOS                                         | Cards, including status, priority, assignee, number, and position |

Project membership and issues use composite foreign keys that include `organization_id`, so a row cannot point at another workspace. Redis is the rate-limit store. MinIO is probed at boot and has no upload flow.

## Still open

- Issue labels, comments, subscribers, and notifications.
- A stable issue URL. The table shows `#number`, and editing stays in the dialog.
- Ownership transfer and leaving a workspace.
- Email change, avatar upload, and password change.
- Durable email outbox. A failed invitation send leaves a pending invitation that must be resent by hand.
- Chat, schedules, and realtime.
- Production deployment, backups, and secret management.

## Infrastructure

| Area       | Status            | Notes                                                              |
| ---------- | ----------------- | ------------------------------------------------------------------ |
| PostgreSQL | Connected at boot | Auth, workspace, project, and issue tables                         |
| Redis      | Rate limiting     | In-memory limiter is the fallback used in tests                    |
| MinIO      | Connected at boot | `ListBuckets` probe only                                           |
| Logging    | Integrated        | Pretty logs locally, JSON in production, sensitive fields redacted |
| API docs   | Integrated        | `/openapi.json` and `/docs` when `API_DOCS_ENABLED=true`           |
| Email      | Integrated        | SMTP for verification and invitations. Required in production.     |

## Quality checks

Scripts:

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

Covered areas include HTTP hardening, session and profile contracts, workspace members and invitations, workspace rename and deletion, project permissions and tenant isolation, project settings, issue placement math, column and issue authorization, and the frontend workspace, project, issue-list, and issue-board screens. `verify:isolation` runs against live PostgreSQL and checks private-project hiding, cross-tenant rejection, last-lead protection, issue placement, and deleting a project that already has an issue.

## Known limitations

- `MAX_ORGANIZATIONS_PER_USER` counts memberships and is not atomic, so concurrent creates can pass the cap.
- OAuth tokens in `account` are stored unencrypted.
- Sensitive workspace administration does not require a fresh session.
- Ownership transfer and self-service leaving have no flow. The native leave endpoint is blocked.
- Email, avatar, and password cannot be changed. The native update-user endpoint is blocked.
- Avatars are display-only. Remote image URLs are not accepted, and MinIO has no upload or signed-URL flow.
- Invitation email is not durable.
- The board does not update live. Two people editing the same project see each other's changes after a refresh.
- A project cannot grow past 200 issues. The list also returns at most 200. The board and the issue table each show a truncation alert if `total` is higher. The issue table sends its search and column filters to that list endpoint instead of filtering the loaded page in the browser.
- Sort and paging on the issue table still run in the browser over the filtered response. An issue past the 200-row cap stays outside those controls.
- Local Compose credentials are development defaults.
- Redis rate limiting fails closed when Redis is not ready on the real server path.
- There is no production deployment or migration runbook.

## Recommended next step

This is a suggestion. It is not an accepted plan, so implementation should wait until one option is chosen.

The list can find an issue by text, status, priority, assignee, and dates, and it shows `#number`. The board can move the work. A lead can change a project's name, description, and visibility. The gap that remains is opening one issue at its own address.

1. **One issue URL.** Give each issue a link such as `/issues/12`, using the number the table already shows. Project settings are implemented in `docs/plans/project-settings.md`. The issue list is the table on the issues route.
2. Leave labels, cycles, estimates, comments, and realtime until that link is in use. They add surface area before one issue has a stable address.

Ownership transfer and a durable invitation outbox stay on the engineering list. They are security and delivery work, separate from the Linear-style workflow.
