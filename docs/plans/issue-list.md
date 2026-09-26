# Issue Board

Status: agreed, not started.

Branch: `feat/issue-list`.

This slice is a working Linear-style board for one project. It is not a flat issue table, and it is not a free-form Trello board.

## Why not free-form columns

A column that is only a name cannot cover basic Linear:

- "New issues go to Backlog" breaks as soon as that column is renamed or deleted.
- "Done" and "Canceled" stop meaning anything, so later filters and progress have nothing stable to query.
- One `index` field cannot order both the columns and the cards inside a column.
- Offset pagination splits a column across pages, so a board built on the member-list query lies about order.

Linear's basic model is smaller than it looks. A status has a fixed category and a user-defined name. The board renders those statuses as columns. Cards have their own order inside a column. Copy that, and stop there.

## What this slice covers

- A project is created with five columns: Backlog, Todo, In Progress, Done, Canceled.
- Existing projects get the same five columns from the migration.
- Every new issue with no chosen column lands at the top of the default Backlog column.
- A lead can add, rename, reorder, and delete columns. A member cannot.
- A column has many issues. An issue has one column and one index inside that column.
- A member can create and update issues, drag them inside a column, and drag them to another column. A viewer can only look. Only a lead, or an organization owner or admin, can delete an issue.
- A card shows `#number`, title, priority, and assignee. Clicking it opens an edit dialog.
- The `+` on a column creates an issue in that column. The board-level create action still uses Backlog.

## What this slice does not cover

- Labels, estimates, cycles, sub-issues, relations, comments, subscribers, and notifications.
- Custom fields, triage, WIP limits, automations, and a color picker. Column color comes from the category.
- A project key such as `APOLLO-12`. The identifier stays `#12`.
- Realtime. A refresh loads the board again.
- A separate list view. The data model can feed one later. This slice ships the board only.
- Offset pagination. The board loads the project in one query, capped at 200 issues.

## Domain model

Two tables, both in `packages/db/src/schema/projects.ts`. Status and priority-like fields stay `text` plus Zod. Do not add a Postgres enum.

### `project_status`

This is the column. The UI says "column". The database and API say "status".

| Column               | Rule                                                                              |
| -------------------- | --------------------------------------------------------------------------------- |
| `id`                 | uuid primary key                                                                  |
| `organization_id`    | text, not null                                                                    |
| `project_id`         | uuid, not null                                                                    |
| `name`               | text, not null. User-facing column title                                          |
| `category`           | text, not null. One of `backlog`, `unstarted`, `started`, `completed`, `canceled` |
| `position`           | integer, not null. Board order of the column                                      |
| `is_default`         | boolean, not null, default false. Exactly one per project                         |
| audit and timestamps | same pattern as `project`                                                         |

Constraints:

- Composite foreign key `(project_id, organization_id)` to `project(id, organization_id)` with `ON DELETE CASCADE`.
- Unique `(id, project_id, organization_id)` so an issue can reference the status without crossing projects.
- Unique index on `(project_id, lower(name))` so "Done" and "done" cannot both exist.
- Partial unique index on `project_id` where `is_default = true`.
- Do not unique-constrain `position`. Reordering two columns would collide mid-update. Sort by `position`, then `id`.

Category is immutable after create. Renaming is allowed. Changing Backlog into a completed category would make the default inbox mean "done", and this slice has no workflow builder to repair that.

Seed, in this board order:

| Name        | Category    | Position | Default |
| ----------- | ----------- | -------- | ------- |
| Backlog     | `backlog`   | 0        | yes     |
| Todo        | `unstarted` | 1000     | no      |
| In Progress | `started`   | 2000     | no      |
| Done        | `completed` | 3000     | no      |
| Canceled    | `canceled`  | 4000     | no      |

`position` uses gaps of 1000. The client never sends a raw position.

### `issue`

| Column               | Rule                                                             |
| -------------------- | ---------------------------------------------------------------- |
| `id`                 | uuid primary key                                                 |
| `organization_id`    | text, not null                                                   |
| `project_id`         | uuid, not null                                                   |
| `status_id`          | uuid, not null                                                   |
| `number`             | integer, not null. Unique with `project_id`                      |
| `title`              | text, not null                                                   |
| `description`        | text, nullable                                                   |
| `priority`           | text, not null, default `none`                                   |
| `position`           | integer, not null. Order inside the status, not across the board |
| `assignee_member_id` | text, nullable                                                   |
| audit and timestamps | same pattern as `project`                                        |

Constraints:

- Composite foreign key `(project_id, organization_id)` to `project(id, organization_id)` with `ON DELETE CASCADE`.
- Composite foreign key `(status_id, project_id, organization_id)` to `project_status(id, project_id, organization_id)` with `ON DELETE RESTRICT`. Deleting a column must not delete or orphan its issues. The service rejects the delete first. The foreign key is the backstop.
- Assignee composite foreign key to `member(id, organization_id)` with `ON DELETE RESTRICT`, for the same reason as the previous plan: composite `SET NULL` would try to null `organization_id`.
- Audit columns stay single-column `member.id` foreign keys with `ON DELETE SET NULL`.
- Unique `(project_id, number)`.
- Index `(organization_id, project_id, status_id, position)`.
- Do not unique-constrain `(status_id, position)`. Ties break by `id`.

There is no `status` text column on `issue`. The column is the status.

### Position rules

`GAP` is 1000. All placement happens in a transaction. Lock the project row first, then the affected status row, always in that order.

To place an issue at a 0-based `index` in a column:

1. Load the other issues in that status ordered by `position`, then `id`.
2. Clamp `index` to `0..length`.
3. If the gap between the neighbors is at least 2, store the midpoint.
4. If there is no previous neighbor, store `next - GAP`. If there is no next neighbor, store `previous + GAP`. An empty column stores `0`.
5. If the gap is exhausted, rewrite that column to `index * GAP` and give the moved issue its index in that sequence.

Column reorder rewrites every status position in the project to `index * GAP`. A project has few columns, so a full rewrite is simpler than a midpoint calculation.

New issues with no `statusId` use the default status and `index` 0, so the newest issue is at the top of Backlog. A create from a column passes that `statusId` and also uses `index` 0.

### Number allocation

Inside the same transaction, after the project row lock:

1. Re-check the actor's project access.
2. Read `COALESCE(MAX(number), 0) + 1` for that project.
3. Insert.

The unique constraint is the backstop. Do not add a counter table.

## Authorization

Reuse `canPerformProjectAction`. Do not add issue-specific or status-specific actions.

| Action                                      | Permission                                          |
| ------------------------------------------- | --------------------------------------------------- |
| See the board                               | `view`                                              |
| Create or update an issue, including drag   | `create-issue` or `update-issue` as already defined |
| Delete an issue                             | `delete-issue`                                      |
| Create, rename, reorder, or delete a column | `update`                                            |

A project member can work the board. A project lead manages the columns. Organization owners and admins can do both. A viewer cannot mutate either.

Follow the code, not the stale API guide: a member cannot delete an issue. Correct `docs/api-guide.md` when the routes land.

An inaccessible project is `404 PROJECT_NOT_FOUND`. A visible project with a denied action is `403 FORBIDDEN`. A missing issue in a visible project is `404 ISSUE_NOT_FOUND`. A missing status in a visible project is `404 PROJECT_STATUS_NOT_FOUND`.

An assignee must be able to `view` the project. The UI only offers project members. A cross-tenant member id is `MEMBER_NOT_FOUND`.

Before the TeamOS member-removal path deletes a member, null that member's `assignee_member_id` inside the organization. Project member removal nulls that member's assignments on that project only.

Delete guards return `409 CONFLICT`:

- The default column cannot be deleted.
- A column that still has issues cannot be deleted. Do not move those issues automatically in this slice.

A duplicate column name returns `409 PROJECT_STATUS_NAME_TAKEN`.

## Seeding

Both paths are required.

1. `createProjectService.create` inserts the five statuses in the same transaction as the project and its lead membership. A project must never be visible without a default column.
2. The generated migration appends a hand-written backfill for every existing project. Drizzle Kit will not emit that data change. Review it before committing.

If the default status is missing at issue create time, fail with `500`. That is a broken invariant, not a user error.

## Shared contracts

Add `packages/shared/src/contracts/issue.ts` and re-export it. Keep the feature name `issue` even though the screen is a board.

Categories: `backlog`, `unstarted`, `started`, `completed`, `canceled`.

Priorities: `none`, `low`, `medium`, `high`, `urgent`. Default `none`.

Label mappers, exhaustive:

- `getIssueStatusCategoryLabel` for the create-column select. Suggested copy: Backlog, Unstarted, Started, Completed, Canceled.
- `getIssuePriorityLabel`. Suggested copy: No priority, Low, Medium, High, Urgent.

A column `name` is free-form display data. Do not run it through a label mapper. Do not render `category` on the board header. The header shows `name`.

Limits:

- Column `name`: trim, 1–40.
- Issue `title`: trim, 1–140.
- Issue `description`: trim, max 5000. On update, `null` clears it and omission leaves it.
- `ISSUE_BOARD_MAX` is 200.

Responses are named collections, not a `data` wrapper:

- `{ statuses }`
- `{ issues, total }`
- `{ issue }`
- `{ status }`

`IssueSummary` includes `id`, `number`, `title`, `description`, `statusId`, `priority`, `position`, `assigneeMemberId`, `createdAt`, and `updatedAt`. The UI formats `#${number}`. Do not return a composed identifier.

Add `ISSUE_NOT_FOUND`, `PROJECT_STATUS_NOT_FOUND`, and `PROJECT_STATUS_NAME_TAKEN` to `apiErrorCodeSchema`. Reuse `CONFLICT`, `MEMBER_NOT_FOUND`, `PROJECT_NOT_FOUND`, `FORBIDDEN`, and `VALIDATION_ERROR`.

The client sends a drop `index`. It does not send `position`.

## API

Mount under the existing project router so session and the per-actor rate limit are inherited.

| Method   | Path                                | Success                 |
| -------- | ----------------------------------- | ----------------------- |
| `GET`    | `.../projects/{projectId}/statuses` | 200 `{ statuses }`      |
| `POST`   | same                                | 201 `{ status }`        |
| `PATCH`  | `.../statuses/{statusId}`           | 200 `{ status }`        |
| `DELETE` | `.../statuses/{statusId}`           | 204                     |
| `GET`    | `.../projects/{projectId}/issues`   | 200 `{ issues, total }` |
| `POST`   | same                                | 201 `{ issue }`         |
| `PATCH`  | `.../issues/{issueId}`              | 200 `{ issue }`         |
| `DELETE` | `.../issues/{issueId}`              | 204                     |

Ids are `z.uuid()`. OpenAPI tag is `Issues`.

`GET` issues returns every issue in the project up to 200, ordered by status position then issue position then id, plus the unfiltered `total`. If `total` is greater than 200, the UI says the board is truncated. Do not add `limit` and `offset` and pretend that is a board.

`POST` issue accepts `title`, optional `description`, optional `priority`, optional `assigneeMemberId`, and optional `statusId`. Omitted `statusId` means the default column. The new card is inserted at index 0.

`PATCH` issue accepts any subset of `title`, `description`, `priority`, `assigneeMemberId`, `statusId`, and `index`. `index` means "place at this index in `statusId`, or in the current column if `statusId` is omitted". A field edit that omits both does not change order.

`POST` status accepts `name` and `category`. The new column is appended after the current last column. It is not default.

`PATCH` status accepts `name` or `index`, not `category`. `index` reorders the column on the board.

## Frontend

New module: `apps/web/src/features/issues/`. Do not put board behavior in `features/projects`.

Route: `apps/web/src/routes/project-issues-route.tsx`, registered as `path="issues"` beside the project index route.

URL: `/workspaces/:organizationSlug/projects/:projectSlug/issues`.

The project sidebar gets an Issues item. Remove the hardcoded Overview `isActive`. `useProjectLayout` owns both active flags. Overview keeps `end`.

Add `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` to `apps/web`. Do not use the native HTML drag API. Keyboard sorting stays available. When reduced motion is set, skip the drag animation and still commit the drop.

The page hook returns `loading | not-found | error | ready`. The ready view carries statuses, issues, `total`, permission flags, and dialog callbacks. Components render that view. They do not fetch or check permissions.

Board:

- Horizontal columns in `position` order. Each header shows the column name and the card count.
- Empty columns stay visible. A new project is five empty columns, not an empty state that hides the workflow.
- Cards show `#number`, title, priority label, and assignee. Description stays in the dialog.
- Dragging a card calls the issue update with the target `statusId` and drop `index`.
- Dragging a column calls the status update with the drop `index`. Hide both drags when the actor lacks the matching permission.
- Column create, rename, and delete live in the column menu and render only when `update` is allowed.
- Delete column and delete issue both use `AlertDialog`.
- Create and edit issue use one dialog. `FieldGroup` has `my-4`. Priority and category selects receive their label record through `items`.
- Assignee options come from the existing project members query, plus an unassigned value that sends `null`.
- If `total` exceeds 200, show a non-blocking alert. Do not drop columns to hide the truncation.
- Buttons have icons. Do not pass `size="sm"`. Do not edit `components/ui`.

Query keys are scoped by organization slug and project id. Issue and status mutations invalidate the board prefix.

Map `ISSUE_NOT_FOUND`, `PROJECT_NOT_FOUND`, `PROJECT_STATUS_NOT_FOUND`, `PROJECT_STATUS_NAME_TAKEN`, `MEMBER_NOT_FOUND`, `FORBIDDEN`, and `CONFLICT` to short UI copy. Do not render raw server messages for those codes.

## Tests

Shared:

- Category and priority labels are not the stored codes.
- Column name bounds, issue title bounds, and description clear-versus-omit.
- Create issue accepts a missing `statusId`. Update accepts `index` without a raw `position`.

Isolation, against live PostgreSQL:

- Creating a project inserts five statuses and exactly one default.
- The first issue is on that default status, `number` 1, and ahead of an older issue in the same column.
- A member can create and move an issue, and cannot create or delete a column.
- A viewer cannot create an issue. A member cannot delete an issue. A lead can delete an issue and can add a column.
- A status id from another project is rejected.
- The default column cannot be deleted. A non-empty column cannot be deleted.
- A private project's board is hidden from an unassigned member.
- A `%` title match stays literal if search is added. This slice does not require board search.

Frontend:

- The issues route renders the seeded column names, not the category codes.
- Creating an issue posts no `statusId` and the card appears in Backlog.
- The column action is hidden for a member and shown for a lead.
- Overview is not current on the issues URL, and Issues is not current on the overview URL.
- Extend `renderWorkspace` with the issues route and a default board handler.

Do not depend on a pointer-drag simulation. Ordering is proven in the isolation script. The UI test proves the request body and the permission gates.

## Docs and verification

Leave the issue milestone in progress in `docs/progress.md` until persistence, authorization, tests, and the board all exist.

When the routes land, document them in `docs/api-guide.md` and correct the member delete-issue row.

Before considering the slice complete:

```text
bun run db:generate
bun run format:check
bun run lint
bun run check-types
bun run test
bun run --cwd apps/api verify:isolation
```

Review the generated SQL, then append the existing-project status backfill if it is not there. A composite unique constraint must be created before the foreign key that targets it.

Backend implementation is specified in `docs/plans/issue-board-backend.md`. The screen is specified in `docs/plans/issue-board-frontend.md`.

## Implementation order

1. Shared contracts, labels, error codes, and contract tests.
2. Drizzle tables, generated migration, SQL review, and the existing-project backfill.
3. Seed the five statuses inside project creation.
4. Status and issue services, routes, assignee cleanup, and isolation coverage.
5. Board feature, route, sidebar active state, and frontend tests.
6. API guide correction, then the verification commands.
