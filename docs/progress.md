# TeamOS Progress

Last updated: 2026-10-02

This file is the product snapshot: what is coded, what is finished, which HTTP APIs exist, and what each UI route does. OpenAPI at `/openapi.json` remains the machine-readable contract. Do not mark a feature complete here until its persistence, authorization, tests, and user-facing flow all exist.

## Current Milestone

The issue list, the issue board, and project views are implemented. The list is `/workspaces/:organizationSlug/projects/:projectSlug/issues`. The board is the same path with `/board`. Views are `/views` and `/views/:viewId`. The list is a table. Search, filters, sort, and pages are applied by `GET .../issues` in SQL. The board and a saved view each load one page per column. The plan is `docs/plans/issue-pagination.md`. A view is a saved filter set rendered on that same kanban. The Views page is a searchable table. A saved view opens the same board UI, without a title or filter bar. Project settings in `docs/plans/project-settings.md` are implemented too. A new project is seeded with workflow columns. Members create, edit, assign, and drag issues. Leads manage columns and project views. Anyone who can see the project can save a personal view. A lead, owner, or admin can change the project name, description, and visibility from `/workspaces/:organizationSlug/projects/:projectSlug/settings`.

Labels, comments, and realtime are still open. A stable issue URL is not built yet. The next product step is not agreed yet. The recommendation at the bottom is a suggestion, not an accepted plan.

## What is finished

A row is finished only when the database, the server check, the tests, and the screen all exist.

| Area             | Finished behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Workspace        | Create a workspace, remember the last one per user, switch workspaces, rename, and delete with a typed name. Owners and admins rename. Only owners delete.                                                                                                                                                                                                                                                                                                                                       |
| Members          | Search and page members, change `admin` or `member`, invite, resend, cancel, and remove. The owner role is never granted here.                                                                                                                                                                                                                                                                                                                                                                   |
| Projects         | List and search projects, create one, and show visibility plus member count. Private projects stay hidden from members without a project role.                                                                                                                                                                                                                                                                                                                                                   |
| Project access   | Grant, change, and revoke `lead`, `member`, and `viewer`. The last lead cannot be removed. Organization owners and admins keep full project control.                                                                                                                                                                                                                                                                                                                                             |
| Profile          | Read the session from `/api/me`. Edit a display name of 1–80 characters. Email stays read-only.                                                                                                                                                                                                                                                                                                                                                                                                  |
| Issue list       | Table of matching issues, newest first, with `#number`. Filter, sort, and page run in SQL. Each filter shows an icon and, when values are selected, a count such as Status (2). Text and number filters wait 300 ms. Created and Updated use one date range. Assignee is a combobox of avatar and name. Clear filters is the destructive action. A lead can select explicit row ids across pages and delete those ids in one request. A viewer can read and cannot create or delete.             |
| Issue board      | Five seeded columns at `.../issues/board`. Each column loads its own page and filtered total. Create and edit issues in a right sheet, drag cards and columns, add, rename, and delete empty columns. A card shows the title, a priority icon, and the assignee name or an unassigned icon.                                                                                                                                                                                                      |
| Project settings | Change the name, description, and visibility. The slug stays fixed. An organization owner or admin deletes the project by typing its exact name. A member or viewer who opens the URL is sent to the overview.                                                                                                                                                                                                                                                                                   |
| Project views    | Save a personal or project-wide filter set and open it as a paged kanban. The Views page lists every visible view in a searchable table. Create and edit use a right sheet. Someone who can manage a view can change its sharing. A viewer cannot turn a personal view into a project view. `assignee=me` means the person opening the view. Dragging a card keeps the drop position in its column or another column. A view does not reorder columns and does not change who can read an issue. |
| Auth             | Google and GitHub sign-in, email verification, invitation acceptance, session cookie, and blocked native management endpoints.                                                                                                                                                                                                                                                                                                                                                                   |

## What is coded but has no screen

- Local fixtures are created with `bun run seed`. The runner is `apps/api/scripts/seed/index.ts`. It reads `apps/api/.env` and is not an HTTP route. There is no seed button in the app.
- Issue `number` is stored and returned by the issue API. The issue table renders `#number`. Cards and the edit sheet do not.

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

`ProjectLayout` is the inset sidebar. The sidebar header links back to the project list. The breadcrumb is the workspace switcher, the project switcher, and the page name. An open view adds Views, then the view name. The project switcher can create a project. The header also has the theme toggle. The sidebar footer has the account menu.

| Route                                                               | Screen           | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/workspaces/:organizationSlug/projects/:projectSlug`               | Overview         | Name, description, visibility, role, member count, and dates. Project roles stay in their own section and dialog. Workspace members are a separate roster with organization roles and a count.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `/workspaces/:organizationSlug/projects/:projectSlug/issues`        | Issue list       | Table of matching issues, newest first. Visible columns start as a pinned checkbox, `#number`, title, status, priority, assignee, created, and updated. Category and description stay hidden until Layout shows them. Search, filters, sort, page, page size, column order, and hidden columns are stored in the URL. Filter, sort, and page are applied in SQL. Changing a filter, the search, or the page size returns to the first page. An empty page clamps back to data that still exists. Status is an icon plus the column name, using the board category color. Created and updated include the time. The header stays fixed while the body scrolls. Other columns can be pinned. Selected issue ids stay in a Zustand store for the project, so changing page does not clear them. A lead sees Delete next to the filters and confirms in an alert dialog. That sends one bulk delete. New issue sits on the right and creates into Backlog. A viewer can open the sheet read-only and does not see New issue or Delete. Page sizes are 10, 20, and 50. The filter menu counts selected values. Created and Updated open one range calendar whose width hugs the days. Assignee search shows an avatar and a name, and a person who is already selected stays visible when they are not on the current search page. The same member combobox is used when creating an issue and when choosing assignees for a view. |
| `/workspaces/:organizationSlug/projects/:projectSlug/issues/board`  | Issue board      | Columns show a category icon, name, and the filtered total. Each column loads its own page of cards and more pages as it scrolls. Cards show title, a priority icon, and the assignee. They do not show `#number` or the full description. Click opens a sheet. The edit sheet loads the issue detail before it can save. A viewer can open it read-only. `+` creates in that column. A lead reorders columns from the grip and renames or deletes from the column menu.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `/workspaces/:organizationSlug/projects/:projectSlug/settings`      | Project settings | Edit name, description, and visibility. Save sends one patch of the fields that changed. The slug is shown and cannot be changed. Owners and admins can delete the project after typing its name, then return to the project list. Members and viewers are sent to the overview.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `/workspaces/:organizationSlug/projects/:projectSlug/views`         | Views            | Searchable table of the personal and project views the caller can open. A viewer can create a personal view. A lead, owner, or admin can also create a project view. Create and edit choose filters, then save. Date bounds use the shared range picker. Assignees use the member combobox. Someone who can manage a row can edit it, change its sharing, or delete it. A viewer who opens their own personal view sees sharing as read-only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `/workspaces/:organizationSlug/projects/:projectSlug/views/:viewId` | View             | The saved filters on the same kanban as the project board. The breadcrumb is Views, then the view name. There is no title or filter bar. Edit and delete sit in the header menu when the caller can manage the view. Dragging a card sends `placement` for the drop position, including a reorder inside one column. The grip that reorders columns is not shown.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `*`                                                                 | Not found        | Says the path does not exist and links back to `/`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Sidebar items are **Overview**, **Issues**, **Board**, **Views**, and **Settings**. The Issues item matches only the list. The Board item matches only the board. Views matches the view list and an open view. Its chevron expands the saved views; the item itself opens the table. Settings is shown to a lead and to an organization owner or admin.

### Board rules the screen already enforces

- A new project gets Backlog, Todo, In Progress, Done, and Canceled. Backlog is the default inbox.
- A card shows the title, a priority icon, and the assignee's name or an unassigned icon. The sheet holds the description, column, priority, and assignee. `#number` is shown on the issue table. Cards and the sheet leave it off.
- A member can create and move issues. A viewer can only look. A lead, or an organization owner or admin, can delete an issue and manage columns.
- There is no project-wide cap of 200 issues. The table page size is at most 50. A column's first page is 40 cards. Bulk delete still accepts at most 200 explicit ids. A deep table page uses offset and gets slower as the offset grows.
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

| Method   | Path                                          | Who                             | Purpose                                                                             |
| -------- | --------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| `GET`    | `.../projects`                                | Member                          | Searchable project list. Private projects are omitted without a project role.       |
| `POST`   | `.../projects`                                | Member                          | Create. The creator becomes the lead. Seeds the five columns.                       |
| `PATCH`  | `.../projects/{projectId}`                    | Lead, owner, admin              | Update name, description, or visibility. The slug is immutable.                     |
| `DELETE` | `.../projects/{projectId}`                    | Owner, admin                    | Delete after the body repeats the exact project name. A lead cannot delete it.      |
| `GET`    | `.../projects/{projectId}/members`            | Someone who can see the project | List explicit project roles                                                         |
| `GET`    | `.../projects/{projectId}/assignees`          | Someone who can see the project | Page members who can view the project and can be assigned. Search by name or email. |
| `PUT`    | `.../projects/{projectId}/members/{memberId}` | Lead, owner, admin              | Grant or change `lead`, `member`, or `viewer`                                       |
| `DELETE` | `.../projects/{projectId}/members/{memberId}` | Lead, owner, admin              | Revoke a project role. The last lead stays.                                         |

`...` means `/api/organizations/{organizationSlug}`.

### Issue board

| Method   | Path                                                | Who                             | Purpose                                                                                                     |
| -------- | --------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `GET`    | `.../projects/{projectId}/statuses`                 | Someone who can see the project | Columns, ordered by position                                                                                |
| `POST`   | `.../projects/{projectId}/statuses`                 | Lead, owner, admin              | Add a column. Category is chosen once and is not editable later.                                            |
| `PATCH`  | `.../projects/{projectId}/statuses/{statusId}`      | Lead, owner, admin              | Rename or move by `index`. The client never sends `position`.                                               |
| `DELETE` | `.../projects/{projectId}/statuses/{statusId}`      | Lead, owner, admin              | Delete an empty column that is not the default                                                              |
| `GET`    | `.../projects/{projectId}/issues`                   | Someone who can see the project | One filtered, sorted page plus `total`, `page`, and `pageCount`. `facets=1` adds project-wide counts.       |
| `GET`    | `.../projects/{projectId}/issues/{issueId}`         | Someone who can see the project | One issue, including its description                                                                        |
| `GET`    | `.../projects/{projectId}/issue-board`              | Someone who can see the project | First page and filtered total for every column                                                              |
| `GET`    | `.../projects/{projectId}/issue-columns/{statusId}` | Someone who can see the project | The next or previous keyset page of one column                                                              |
| `POST`   | `.../projects/{projectId}/issues`                   | Member, lead, owner, admin      | Create one issue. Omitted `statusId` uses Backlog and places it at the top.                                 |
| `PATCH`  | `.../projects/{projectId}/issues/{issueId}`         | Member, lead, owner, admin      | Title, description, priority, assignee, column, and `placement`                                             |
| `POST`   | `.../projects/{projectId}/issues/bulk-delete`       | Lead, owner, admin              | Delete the given issue ids in one transaction                                                               |
| `DELETE` | `.../projects/{projectId}/issues/{issueId}`         | Lead, owner, admin              | Delete one issue                                                                                            |
| `GET`    | `.../projects/{projectId}/views`                    | Someone who can see the project | Personal views owned by the caller, plus project views. Paginated. Optional `search` matches the name.      |
| `POST`   | `.../projects/{projectId}/views`                    | See view rules                  | Create a personal view, or a project view when the caller can update the project.                           |
| `GET`    | `.../projects/{projectId}/views/{viewId}`           | Someone allowed to open it      | One view. Another member's personal view is `404`.                                                          |
| `PATCH`  | `.../projects/{projectId}/views/{viewId}`           | Someone allowed to manage it    | Rename, replace filters, or change sharing. Requires the current `revision`. A viewer cannot set `project`. |
| `DELETE` | `.../projects/{projectId}/views/{viewId}`           | Someone allowed to manage it    | Delete the saved filters. Issues stay.                                                                      |

Priorities are `none`, `low`, `medium`, `high`, and `urgent`. Column categories are `backlog`, `unstarted`, `started`, `completed`, and `canceled`. A column name is free text. The stored identifier is `#number` inside the project, not a project key. The issue table renders it. Cards and the edit dialog do not. The table sends search, filters, sort, direction, page, and page size on `GET` issues. `q` matches title, description, number, status name, priority, assignee, and category. Date filters use the browser time zone. `assignee=unassigned` matches issues with no assignee. `assignee=me` matches issues assigned to the caller and is resolved on the server. Sort is a whitelist with `id` as the tie-break. Facet counts are project-wide, not the current page and not the active filter. Selected row ids are client state. Bulk delete sends those ids and does not delete every row that matches the filter. A board move and a saved-view move both send `placement`: `start`, `end`, `before`, or `after` an anchor issue. A saved view does not reorder columns. Eligible assignees on a workspace-visible project are the workspace members. On a private project they are organization owners and admins plus explicit project members. Pending invitations are not members.

## Database

PostgreSQL through Drizzle in `packages/db`.

| Table                                        | Owner                                          | Holds                                                             |
| -------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| `user`, `session`, `account`, `verification` | Better Auth                                    | Identity and sessions                                             |
| `organization`, `member`, `invitation`       | Better Auth, mutated through the TeamOS facade | Workspaces and membership                                         |
| `project`, `project_membership`              | TeamOS                                         | Projects and `lead` / `member` / `viewer`                         |
| `project_status`                             | TeamOS                                         | Board columns                                                     |
| `issue`                                      | TeamOS                                         | Cards, including status, priority, assignee, number, and position |
| `issue_view`                                 | TeamOS                                         | Saved personal and project filter sets                            |

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

Covered areas include HTTP hardening, session and profile contracts, workspace members and invitations, workspace rename and deletion, project permissions and tenant isolation, project settings, issue placement math, column and issue authorization, and the frontend workspace, project, issue-list, and issue-board screens. `verify:isolation` runs against live PostgreSQL and checks private-project hiding, cross-tenant rejection, last-lead protection, paged issue reads, anchor placement, eligible assignees, deleting a project that already has an issue, and stopping a viewer from sharing a personal view with the project. `bun run --cwd apps/api benchmark:issues` measures a throwaway 10,000-issue dataset and a 100,000-issue dataset. It does not change existing workspace data.

## Known limitations

- `MAX_ORGANIZATIONS_PER_USER` counts memberships and is not atomic, so concurrent creates can pass the cap.
- OAuth tokens in `account` are stored unencrypted.
- Sensitive workspace administration does not require a fresh session.
- Ownership transfer and self-service leaving have no flow. The native leave endpoint is blocked.
- Email, avatar, and password cannot be changed. The native update-user endpoint is blocked.
- Avatars are display-only. Remote image URLs are not accepted, and MinIO has no upload or signed-URL flow.
- Invitation email is not durable.
- The board does not update live. Two people editing the same project see each other's changes after a refresh.
- A deep issue-table page uses SQL offset. Cost grows with the number of skipped rows. The board uses keyset pages instead.
- A column keeps a window of loaded cards. Cards that are not in the DOM are not drop targets. Dropping after the last loaded card places the issue after that card, not at the end of the unloaded column.
- The column total is the filtered count from the first board load. A later page does not recompute it, so a concurrent write can make the count and the loaded cards differ until refresh.
- Text search uses `position` on lowered text. The title btree does not make that search an index lookup. There is no trigram index.
- One warm local run of 10,000 and 100,000 issues is recorded in `docs/plans/issue-pagination.md`. The 100,000-issue deep table page took 226 ms and the text search took 393 ms on that machine. That run is not a support claim.
- Local Compose credentials are development defaults.
- Redis rate limiting fails closed when Redis is not ready on the real server path.
- There is no production deployment or migration runbook.

## Recommended next step

This is a suggestion. It is not an accepted plan, so implementation should wait until one option is chosen.

The list can find an issue by text, status, priority, assignee, and dates, and it shows `#number`. Filters count the selected values, dates use one range, and every member picker is the same combobox. The board and a saved view can move a card to the dropped position. A saved view does not reorder columns, and its sharing can be edited by someone allowed to manage it. A lead can change a project's name, description, and visibility. The gap that remains is opening one issue at its own address.

1. **One issue URL.** Give each issue a link such as `/issues/12`, using the number the table already shows. Project settings are implemented in `docs/plans/project-settings.md`. The issue list is the table on the issues route.
2. Leave labels, cycles, estimates, comments, and realtime until that link is in use. They add surface area before one issue has a stable address.

Ownership transfer and a durable invitation outbox stay on the engineering list. They are security and delivery work, separate from the Linear-style workflow.
