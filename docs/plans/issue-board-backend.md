# Issue Board Backend

Status: implemented. The board screen is still not started.

Branch: `feat/issue-list`.

Parent plan: `docs/plans/issue-list.md`.

This plan is the backend half of that board. It does not add a screen, a drag library, or a list view. When this slice is done, the HTTP API can seed columns, create and move issues, and reject the authorization cases the board will rely on.

## Code rules that shape this slice

- Contracts and types live in `packages/shared` and are derived from Zod. Do not duplicate a request type in the API.
- Do not add a second permission model. Call `canPerformProjectAction`.
- Label mappers live in `packages/shared/src/utilities`, beside `getProjectRoleLabel`. A column `name` is free-form display data and has no mapper.
- Position math is a pure function with focused tests. Put it in `apps/api/src/services/issue-position.ts`. Do not export it from shared. The client sends an `index` and never computes a position.
- Do not add issue or status behavior to `apps/api/src/services/projects.ts`. That module already owns project CRUD. Seed through an exported function the project transaction calls.
- The board read is two queries, not one query per card. Do not join assignee profiles. `assigneeMemberId` is enough.
- Select only the columns a summary needs. The placement query selects `id` and `position`, not `description`.
- A project accepts at most 200 issues and 20 statuses. The read cap is already 200. Without a write cap, placement can scan an unbounded column.
- Comment the lock order and the assignee-clear-before-delete order. Those are constraints, not obvious syntax.
- An inaccessible project is `404`. A visible project with a denied action is `403`.

## Files

Create:

- `packages/shared/src/utilities/issue-workflow.ts`
- `packages/shared/src/utilities/issue-workflow.test.ts`
- `packages/shared/src/contracts/issue.ts`
- `packages/shared/src/contracts/issue.test.ts`
- `apps/api/src/services/issue-position.ts`
- `apps/api/src/services/issue-position.test.ts`
- `apps/api/src/services/project-statuses.ts`
- `apps/api/src/services/issues.ts`
- `apps/api/src/routes/project-statuses.ts`
- `apps/api/src/routes/issues.ts`

Change:

- `packages/db/src/schema/projects.ts` and the generated migration under `packages/db/drizzle`.
- `packages/shared/src/contracts/api-error.ts`, `contracts/index.ts`, `utilities/index.ts`, and `src/index.ts`.
- `apps/api/src/services/projects.ts`, only to call the status seed inside the existing create transaction and to clear assignees inside `removeMember`.
- `apps/api/src/services/organization-management.ts`, its unit test, and `apps/api/src/organization-management.test.ts`.
- `apps/api/src/routes/organization-types.ts`, `apps/api/src/routes/organizations.ts`, and `apps/api/src/bootstrap.ts`.
- `apps/api/src/services/index.ts` and `apps/api/src/testing/organization.ts`.
- `apps/api/scripts/verify-organization-isolation.ts`.
- `docs/api-guide.md` after the routes exist. Do not mark the product milestone complete in `docs/progress.md`.

## Schema

Add both tables to `packages/db/src/schema/projects.ts`. Use `text` plus Zod. Do not add a Postgres enum. Timestamps are `timestamptz`. TeamOS ids are uuid. `organization_id` stays `text`.

### `project_status`

| Column                                         | Rule                                                                   |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `id`                                           | uuid primary key, `defaultRandom()`                                    |
| `organization_id`                              | text, not null                                                         |
| `project_id`                                   | uuid, not null                                                         |
| `name`                                         | text, not null                                                         |
| `category`                                     | text, not null                                                         |
| `position`                                     | integer, not null                                                      |
| `is_default`                                   | boolean, not null, default false                                       |
| `created_by_member_id`, `updated_by_member_id` | nullable `text`, single-column FK to `member.id`, `ON DELETE SET NULL` |
| `created_at`, `updated_at`                     | same `$onUpdate` pattern as `project`                                  |

Constraints:

- Composite FK `(project_id, organization_id)` to `project(id, organization_id)`, `ON DELETE CASCADE`.
- Unique `(id, project_id, organization_id)` so an issue can reference the status without crossing projects.
- Unique index on `(project_id, lower(name))`.
- Partial unique index on `project_id` where `is_default = true`.
- No unique constraint on `position`.

### `issue`

| Column               | Rule                                |
| -------------------- | ----------------------------------- |
| `id`                 | uuid primary key, `defaultRandom()` |
| `organization_id`    | text, not null                      |
| `project_id`         | uuid, not null                      |
| `status_id`          | uuid, not null                      |
| `number`             | integer, not null                   |
| `title`              | text, not null                      |
| `description`        | text, nullable                      |
| `priority`           | text, not null, default `none`      |
| `position`           | integer, not null                   |
| `assignee_member_id` | text, nullable                      |
| audit and timestamps | same pattern as `project_status`    |

Constraints:

- Composite FK `(project_id, organization_id)` to `project(id, organization_id)`, `ON DELETE CASCADE`.
- Composite FK `(status_id, project_id, organization_id)` to `project_status(id, project_id, organization_id)`, `ON DELETE RESTRICT`.
- Composite FK `(assignee_member_id, organization_id)` to `member(id, organization_id)`, `ON DELETE RESTRICT`. Do not use composite `SET NULL`. Postgres would also try to null `organization_id`.
- Unique `(project_id, number)`.
- Index `(organization_id, project_id, status_id, position)` for placement inside one column.
- No unique constraint on `(status_id, position)`. Ties break by `id`.

There is no `status` text column on `issue`.

Generate with `bun run db:generate`. Review the SQL before committing. A composite unique constraint must be created before the foreign key that targets it. Drizzle Kit will not emit the existing-project backfill. Append it by hand:

| Name        | Category    | Position | Default |
| ----------- | ----------- | -------- | ------- |
| Backlog     | `backlog`   | 0        | yes     |
| Todo        | `unstarted` | 1000     | no      |
| In Progress | `started`   | 2000     | no      |
| Done        | `completed` | 3000     | no      |
| Canceled    | `canceled`  | 4000     | no      |

The SQL comment must point at `defaultProjectStatuses` in `project-statuses.ts`. Those two definitions are the same seed. Changing one without the other is a bug.

## Shared contracts

`issue-workflow.ts` owns the domain enums and the copy:

- Categories: `backlog`, `unstarted`, `started`, `completed`, `canceled`.
- Priorities: `none`, `low`, `medium`, `high`, `urgent`.
- `getIssueStatusCategoryLabel`: Backlog, Unstarted, Started, Completed, Canceled.
- `getIssuePriorityLabel`: No priority, Low, Medium, High, Urgent.
- `ISSUE_BOARD_MAX = 200`.
- `PROJECT_STATUS_MAX = 20`.
- `ISSUE_POSITION_GAP = 1000`. The API position helper imports this constant so the gap is not defined twice.

`contracts/issue.ts` owns request and response schemas. Re-export both modules from their barrels and from `packages/shared/src/index.ts`.

Limits:

- Status `name`: trim, 1–40.
- Issue `title`: trim, 1–140.
- Issue `description`: trim, max 5000. On update, `null` clears it and omission leaves it.
- `index`: int, minimum 0, maximum `ISSUE_BOARD_MAX`.

Responses are `{ statuses }`, `{ issues, total }`, `{ status }`, and `{ issue }`. No `data` wrapper.

`IssueSummary` fields: `id`, `number`, `title`, `description`, `statusId`, `priority`, `position`, `assigneeMemberId`, `createdAt`, `updatedAt`. Timestamps are ISO datetimes. Do not return a composed identifier. The UI formats `#${number}`.

`StatusSummary` fields: `id`, `name`, `category`, `position`, `isDefault`.

Create issue accepts `title`, optional `description`, optional `priority`, optional `assigneeMemberId`, and optional `statusId`. It does not accept `position` or `index`. New cards are inserted at index 0 by the service.

Update issue accepts any subset of `title`, `description`, `priority`, `assigneeMemberId`, `statusId`, and `index`.

Create status accepts `name` and `category`. Update status accepts `name` or `index`, never `category`.

Add these codes to `apiErrorCodeSchema`:

- `ISSUE_NOT_FOUND`
- `PROJECT_STATUS_NOT_FOUND`
- `PROJECT_STATUS_NAME_TAKEN`

Reuse `CONFLICT`, `MEMBER_NOT_FOUND`, `PROJECT_NOT_FOUND`, `FORBIDDEN`, and `VALIDATION_ERROR`.

## Position helper

`apps/api/src/services/issue-position.ts` exports two pure functions.

`placeAtIndex` receives the other items in the target column, already ordered by `position` then `id`, excluding the item being moved. It also receives the requested index.

- Clamp the index to `0..length`.
- An empty column returns position `0`.
- No previous neighbor returns `next - GAP`.
- No next neighbor returns `previous + GAP`.
- A neighbor gap of at least 2 returns the midpoint.
- A smaller gap returns a full rewrite: every existing item plus the moved item, positions `index * GAP`, with the moved item occupying the requested index.

`reorderByIndex` always rewrites. It receives the ordered ids and the id being moved, and returns `{ id, position }[]` at `index * GAP`. Column reorder uses it because a project has few statuses.

Negative positions are valid. Repeated inserts at the top walk downward by `GAP` and do not rebalance until a gap is smaller than 2.

## Services

### Status service

`createProjectStatusService` takes the Drizzle database and the same member lookup the project service uses.

Export `insertDefaultProjectStatuses(transaction, input)` and call it from `createProjectService.create` after the project insert and in the same transaction as the lead membership. A project must not commit without exactly one default status. The constant `defaultProjectStatuses` is the only seed list in TypeScript.

Operations:

- `list` requires `view`. Order by `position`, then `id`.
- `create`, `update`, and `remove` require project `update`.
- `create` appends after the current maximum position using `GAP`. The new row is not default. At 20 statuses, return `409 CONFLICT`. A duplicate normalized name returns `409 PROJECT_STATUS_NAME_TAKEN`.
- `update` can rename or reorder. Reorder locks the project row, loads every status id, calls `reorderByIndex`, and writes the new positions. Category is not a writable field.
- `remove` locks the project row, then the status row. Reject the default status and any status that still has an issue with `409 CONFLICT`. Do not move those issues. The `RESTRICT` foreign key is the backstop.

Resolve the parent project the same way `createProjectService` does: missing or private-and-invisible is `404 PROJECT_NOT_FOUND`; visible but denied is `403 FORBIDDEN`. Unknown visibility fails closed to private. Mutations lock the project row and re-check the actor after the lock.

### Issue service

`createIssueService` takes the database and the member lookup.

- `list` requires `view`. One join from `issue` to `project_status`, filtered by `organization_id` and `project_id`, ordered by status position, issue position, then issue id, `LIMIT 200`. A second `count(*)` returns `total` even when the page is truncated. Select summary columns only.
- `create` requires `create-issue`. Lock the project row, re-check access, then allocate `number` with `COALESCE(MAX(number), 0) + 1`. Omitted `statusId` loads the default status. A missing default is `500 INTERNAL_SERVER_ERROR`. A supplied status that is not in this project is `404 PROJECT_STATUS_NOT_FOUND`. At 200 issues, return `409 CONFLICT` before inserting. Place the new row at index 0 in the target status. Lock the project row before the status row.
- `update` requires `update-issue`. Lock the issue's project row and re-check access. A missing issue in a visible project is `404 ISSUE_NOT_FOUND`. A missing issue in an invisible project stays `404 PROJECT_NOT_FOUND`. If `statusId` or `index` is present, place the issue in the target column. If both are absent, do not change `position` or `statusId`. Write `updatedByMemberId` on every successful update.
- `remove` requires `delete-issue`. A member does not have this action. A lead and an organization administrator do.

Assignee checks happen before insert or update. The member must exist in the organization and `canPerformProjectAction("view", assigneeContext)` must be true. Otherwise return `404 MEMBER_NOT_FOUND`. `null` clears the assignee. The UI will only offer project members. The service still accepts an organization administrator who can view the project, because that is the authorization rule.

Map database errors after the service checks:

- `23505` on the status name index becomes `PROJECT_STATUS_NAME_TAKEN`.
- `23505` on `(project_id, number)` inside the locked create transaction becomes `500`. The lock should have prevented it, so this is not a client error.
- `23503` is a backstop. Prefer the explicit service check so the response code is stable.

### Assignee cleanup

The assignee foreign key is `RESTRICT`, so the member row cannot disappear while an issue still points at it.

- Add `clearAssignees` to `OrganizationManagementDependencies`. `removeMember` calls it and waits for that write before `gateway.removeMember`. If the gateway then fails, the member remains and their assignments are already cleared. That is safer than a delete aborted by the foreign key. Pass a no-op or a spy from the existing management tests, and pass the issue-service function from `bootstrap.ts`.
- `projects.removeMember` nulls `assignee_member_id` for that member on that project in the same transaction as the membership delete, before the membership row is removed. An administrator assigned without a project membership is not affected.

## Routes

`project-statuses.ts` and `issues.ts` are thin. Each handler reads the session, validated input, and `requireOrganizationAccess`, calls one service method, and parses the response schema. Register both from `createOrganizationRoutes` after `registerProjectRoutes`. They inherit the verified-session middleware and the per-actor management rate limit. Do not add another limiter.

Add `issues` and `projectStatuses` to `OrganizationRouteDependencies`. Wire both factories in `bootstrap.ts`. Export them from `apps/api/src/services/index.ts`.

`createFakeProjectService` is not enough once the dependency object grows. Add fakes that return empty collections and reject mutations, and pass them from `authentication.test.ts` and `organization-management.test.ts`.

| Method   | Path                                                                  | Success                 |
| -------- | --------------------------------------------------------------------- | ----------------------- |
| `GET`    | `/api/organizations/{organizationSlug}/projects/{projectId}/statuses` | 200 `{ statuses }`      |
| `POST`   | same                                                                  | 201 `{ status }`        |
| `PATCH`  | `.../statuses/{statusId}`                                             | 200 `{ status }`        |
| `DELETE` | `.../statuses/{statusId}`                                             | 204 empty body          |
| `GET`    | `.../projects/{projectId}/issues`                                     | 200 `{ issues, total }` |
| `POST`   | same                                                                  | 201 `{ issue }`         |
| `PATCH`  | `.../issues/{issueId}`                                                | 200 `{ issue }`         |
| `DELETE` | `.../issues/{issueId}`                                                | 204 empty body          |

Path ids are `z.uuid()`. OpenAPI tag is `Issues`, with `operationId`, `security: [{ sessionCookie: [] }]`, `protectedRouteErrorResponses`, `apiErrorResponses`, and `requestIdHeaders`.

## Tests

Shared utility tests:

- Every category and priority label differs from its stored code.
- `default` is not asserted here. The seed constant lives in the API module. The shared category union is exhaustive through the label record.
- Contract tests reject a blank title, a 141-character title, a 41-character status name, an unknown category, and a raw `position` field on update. They accept a missing `statusId` on create, and they distinguish description `null` from omission.

Position tests, without a database:

- Empty column returns `0`.
- Index `0` against an existing item returns `position - GAP`.
- An index past the end appends with `+ GAP`.
- A gap smaller than 2 returns a full rewrite with the moved item at the requested index.
- `reorderByIndex` returns `0, 1000, 2000` after a move to the front.

Isolation, in `apps/api/scripts/verify-organization-isolation.ts`:

- Creating a project inserts five statuses and exactly one default.
- The first issue is on that default status, has `number` 1, and sorts ahead of an older issue in the same column.
- A member can create and move an issue, and cannot create or delete a status.
- A viewer cannot create an issue. A member cannot delete an issue. A lead can delete an issue and can add a status.
- A status id from another project is rejected.
- The default status cannot be deleted. A status that still has an issue cannot be deleted.
- A private project's issues are hidden from an unassigned member and visible to the owner.
- Removing an organization member clears that member's assignee ids before the gateway delete. If the isolation script cannot observe the gateway, cover the ordering in `organization-management.test.ts` with a spy that records call order.

## Docs

When the routes land, add them to `docs/api-guide.md` and correct the issue-delete row. A project member cannot delete an issue. The current guide says they can. The code and `project-roles.test.ts` are the source of truth.

Do not move the issue milestone to Completed in `docs/progress.md`. Persistence and authorization are not the user-facing board.

## Done when

```text
bun run db:generate
bun run format:check
bun run lint
bun run check-types
bun run test
bun run --cwd apps/api verify:isolation
```

Review the generated migration before committing it. Skip `bun run build` only if shared and API typecheck already cover the changed packages, and say so. This slice does not change `apps/web` runtime code, but the new shared exports must still typecheck in the web package.

## Implementation order

1. Shared workflow, contracts, error codes, and their tests.
2. Drizzle tables, generated migration, SQL review, and the existing-project backfill.
3. Position helper and its unit tests.
4. Status service, seed call inside project creation, issue service, and assignee cleanup.
5. Routes, dependency wiring, and fakes for the existing route tests.
6. Isolation coverage, API guide correction, then the verification commands.
