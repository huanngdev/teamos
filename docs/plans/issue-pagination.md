# Issue pagination and placement

Status: implemented. This plan is the accepted scope for server-paged issues, per-column boards, anchor moves, right-side sheets, and eligible assignees. The "Verified current state" section below is the starting point, not the finished behavior.

Branch: `feat/issue-list`.

## Verified current state

- `GET .../issues` applies filters in SQL, then `LIMIT 200`. Sort and pages run in the browser on that page. `ISSUE_BOARD_MAX` also rejects the 201st issue.
- `placeIssue` loads every card in the target column and places by array index. A narrow gap rewrites the column one row at a time. Create and update take a project-row `FOR UPDATE` lock.
- The board and saved-view board share that single list. Column counts use the loaded array. Cards include the full description.
- Drag sends `index`. A saved view sends only `statusId`, and the server places that issue at the top of the destination column.
- Facet counts come from separate project-wide `GROUP BY` queries. They ignore the active filter and the current page.
- `listProjectMembers` returns explicit `project_membership` rows. Issue and view pickers use that list. `requireAssignee` and view validation already call `canPerformProjectAction("view")`. On a workspace-visible project, a workspace member with no project role can view, and the server would accept them, but the picker never lists them. Project overview labels those rows as project roles. Pending invitations are not members. This explains a two-person workspace whose overview and pickers show only the project lead. Live accounts were not queried.

## Decisions

- The table uses page/offset. Deep offsets get slower as the offset grows. The benchmark records that. It is not treated as constant-time.
- Board columns use keyset pagination on `(position, id)`. The first page size is 40: about three column viewports, small enough that one wide column cannot starve the others. Bootstrap is one grouped count plus at most `PROJECT_STATUS_MAX` (20) index-bounded `LIMIT 41` queries in `Promise.all`. It is not one `LEFT JOIN LATERAL`, not an unbounded query per column, and not one project-wide limit split across columns.
- A column cursor is base64url JSON bound to the status and the canonical filter. It is checked before the keyset predicate. It is not an authorization token.
- Card reads omit `description`. `GET .../issues/{issueId}` returns the full issue. The edit sheet loads that detail before it can save.
- Moves send `placement`: `start`, `end`, `before`, or `after` an anchor id, plus `expectedUpdatedAt`. The server reads the anchor and at most the neighboring row. A normal move updates one issue. A gap smaller than 2, or an int4 overflow, rewrites at most 128 nearby rows in one statement. Only when that window has no room does one set-based renumber of the column run. Issue writes take a project `FOR SHARE` plus column advisory locks in status-id order. They do not take a project-wide `FOR UPDATE`.
- Dropping after the last loaded card sends `after` that card. `end` is only for an empty column. `start` is only when nothing is unloaded above the drop.
- A saved view still sends status only. A status change without `placement` still moves to the start of the destination column.
- `position` stays a 32-bit integer with a gap of 1000. A string rank would avoid renumbering, and it is not worth a rewrite while the rare path is one SQL statement.
- Facets stay project-wide. They are not the current page and not the filtered subset. Column header totals are the filtered count for that column, captured at bootstrap, and are not recomputed on each next page. Concurrent writes can make the count and the loaded cards differ until the next refresh or mutation.
- Bulk delete still accepts at most 200 explicit ids. There is no select-all-matching delete. The project cap of 200 issues is removed only after these read and place paths land.
- Eligible assignees are a separate `GET .../projects/{projectId}/assignees` endpoint. Workspace-visible projects list workspace members. Private projects list organization owners and admins plus explicit project members. The endpoint does not grant roles and does not replace `listProjectMembers`.
- Project overview keeps explicit roles under "Project roles" and adds a separate "Workspace members" section from the organization member list. No synthetic project role is shown there.
- Create and edit for issues and views use the existing right `Sheet`. Delete confirmations stay dialogs. Assignee identity is a shared presentational row. Issue assignee is single-select. View assignee is multi-select. They do not share one flag-heavy component.
- Virtualization limits the DOM. The cache window keeps at most three loaded pages per column and can fetch a dropped page backward. `maxPages` is not used.

## Out of scope

Labels, comments, realtime, chat, notifications, avatar upload, and deploy.

## Acceptance

- Filter, sort, and page are applied in SQL with a stable id tie-break. An empty page after a delete clamps back.
- Each column has its own page, cursor, and filtered total. Scrolling loads the next page once. Old responses cannot overwrite a newer filter.
- Moves stay correct on a partial column and on a filtered view. A stale anchor or revision returns 409 and the board rolls back.
- A workspace member without a project role can be assigned on a workspace-visible project and cannot be assigned on a private project.
- Sheets trap focus, keep field values when a save fails, and do not save an edit until the detail request has loaded the description.
- Format, lint, typecheck, focused tests, and build pass. Isolation and the benchmark run when PostgreSQL is up. A green build alone is not a claim that 100,000 issues are supported.

## Benchmark

`bun run --cwd apps/api benchmark:issues` creates a throwaway organization, inserts the dataset with `generate_series`, measures it, and deletes only that organization. Migration `0005_issue_pagination_indexes` was applied to the local database before the run. It replaces `issue_project_status_position_idx` with `(organization_id, project_id, status_id, position, id)` and adds assignee, created, priority, title, and updated indexes. `DROP INDEX` then `CREATE INDEX` takes a write lock for the build. The title btree does not accelerate `position(lower(title))` search.

Machine: Apple M5, 16 GB, macOS, Bun 1.3.14, local PostgreSQL. One connection except the four concurrent title updates. Plans were taken immediately after insert, before `ANALYZE`, so planner row estimates are not trustworthy. Actual times are.

| Dataset | Insert | Deep table page | Column page | Board | Search `gate` | Move | Rows updated by that move | 4 concurrent title updates |
| ------- | ------ | --------------- | ----------- | ----- | ------------- | ---- | ------------------------- | -------------------------- |
| 10,000  | 410 ms | 32 ms, 10,129 bytes, 20 rows | 22 ms, 11,584 bytes | 39 ms, 40 cards, total 9,000 | 47 ms, total 100 | 18 ms | 1 | 17 ms |
| 100,000 | 2,874 ms | 226 ms, 10,192 bytes, 20 rows | 4 ms, 11,584 bytes | 110 ms, 40 cards, total 90,000 | 393 ms, total 1,000 | 14 ms | 1 | 32 ms |

The deep page is the last page of 20, so the offset is about 9,980 rows at 10,000 issues and about 99,980 rows at 100,000. Its raw plan sorts the matching rows before the limit: about 2 ms of sort at 10,000 and about 35 ms at 100,000. The service time is higher because the page also joins the assignee and reads descriptions. The 100,000-issue keyset uses an index-only scan on `issue_project_status_position_idx` and touches 7 buffer pages. The grouped count index-only-scans the project and takes about 23 ms at 100,000. Lock hold time was not read from `pg_locks`. Browser DOM count and heap were not measured. These numbers are one warm local run, not a support claim.
