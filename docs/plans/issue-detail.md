# Issue Identity and Detail

Status: issue codes from the M1 pass stay. The detail surface is now a full page, create and quick edit use a dialog, and issue description is replaced by versioned rich-text content. This section is the current contract. Older sentences in this file that describe a sheet, a background location, or a plain description textarea are superseded.

Date: 2026-10-02

Branch: `feat/issue-detail`, local, not committed until asked.

## Content document

Locked before the content migration. Upstream editor is [shadcn-editor](https://github.com/htmujahid/shadcn-editor) commit `a376368f93ca8085edf5752064c15b4691a31019` (Lexical 0.50.0, MIT). The stored document is that editor's serialized state plus our version. The API does not import Lexical.

- Shape: `{ version: 1, root: LexicalRoot }`. `root.type` is `root`.
- Empty and null are the same stored value: `content` is SQL `NULL` and `content_text` is `''`. A document whose plain text is empty is stored as that empty value.
- Create may omit `content`. That stores empty content. `PATCH` that omits `content` keeps the stored document. `content: null` clears it.
- Supported nodes: `paragraph`, `heading` (`h1`–`h6`), `quote`, `list` (`bullet`, `number`, `check`), `listitem`, `link`, `code`, `text`, `linebreak`, `tab` (inside code only). The detail editor has no frame and no standing toolbar. Selecting text opens a format menu. Typing `/` opens an insert menu for the supported blocks. Table, image, and file stay in that menu and are disabled: the document schema does not store tables, and there is no upload flow. Paste keeps formatting only for the supported nodes. Lexical drops the rest on save.
- Text format bits: bold `1`, italic `2`, inline code `16`. Other bits, non-empty text styles, and unknown node types are rejected.
- Link protocols: `http:`, `https:`, `mailto:`. Any other explicit scheme, including `javascript:` and `data:`, is rejected.
- Limits: 20,000 characters of plain text, 1,500,000 UTF-8 bytes of JSON, 12,000 nodes, depth 12. A former 5,000-character description, including one made only of newlines, still converts.
- `content_text` is computed on the server from the validated document. List and board cards do not include the document. The list row includes a 200-character `contentText` excerpt. Search, the content filter, and content sort use `content_text`, not the JSON.
- Migration `0007` copies each existing `description` into paragraph nodes, one paragraph per line. `\r\n` and `\r` become `\n`. The text is not parsed as HTML or Markdown. After the backfill check, `description` is dropped. Saved view filter key `filters.description` is renamed to `filters.content`. The view definition version stays `1`. A client that still sends `description` is read as `content`.

## Why this pass exists

An issue number is `max(number) + 1` inside the create transaction. Deleting the highest issue makes the next create reuse that number. The column is PostgreSQL `integer`, and the API sends it as a JavaScript number. The table prints `#12`. Cards do not print the number. Opening an issue sets local sheet state and leaves the URL on the list, the board, or the saved view. A teammate cannot open the same issue from a link, and a refresh cannot land on it.

The agreed outcome is a stable per-project code such as `I-0001` and one issue URL. That URL is always a page. Create and quick edit stay in a dialog on the list, board, or saved view.

## What this pass delivers

- A project-owned counter that only moves forward. Existing numbers stay. Deleted numbers are never issued again.
- `issue.number` stored as `bigint`. API field `number` is a decimal string. The storage ceiling is PostgreSQL `bigint`, with a dedicated error when the next number would not fit.
- One shared formatter. Display is `I-` plus at least four digits: `I-0001`, `I-9999`, `I-10000`. The same string appears on the table, the card, and the detail.
- Browser route `/w/:organizationSlug/p/:projectSlug/issues/:issueCode`.
- Clicking an issue in the list, the board, or a saved view navigates to that page. Back returns to the same list, board, or saved view, including its query. A direct visit uses the project issue list as the fallback.
- Detail is a page. The issue code sits above the title and the editor. Priority, status, and assignee are compact ghost controls in a properties column, with copy link and delete in the menu beside assignee. Created and updated dates sit under that column. Title and content save themselves 300ms after the draft stops changing. Delete, loading, retry, not-found, and read-only reuse the current issue permissions. Create and quick edit are dialogs. Quick edit does not edit content. The list is the only place with an issue action menu, and that menu is edit and delete.
- Copy link copies the canonical issue URL. Search matches a code such as `I-0001`.

Acceptance, from the roadmap: a shared link opens the issue; concurrent creates cannot take the same code; deleting the highest issue does not recycle its number.

## Out of scope

Leave these for later milestones. Do not add schema, routes, or UI for them in this pass.

- Activity and the workspace audit log (M2).
- Blockers and status-transition rules (M3).
- Images, files, comments, mentions, and collaboration. Issue content is the versioned document in the section above. Project description stays plain text.
- Realtime, notifications, and live refresh of the open detail (M5).
- A per-project key such as `WEB-12`. The prefix is the fixed `I-`.
- Codes that are unique across a workspace. Two projects may both have `I-0001`.
- A create URL. The New issue dialog stays on the current page and does not change the address bar.
- HTTP path changes. `/api/organizations/:organizationSlug/projects/:projectId/...` stays. UUIDs stay the mutation identity.
- Redirects from `/workspaces/...`. Those URLs already render not-found.
- Rewriting an issue code when a project or workspace is renamed. The code is the number. The URL uses the current slugs only as the address.
- A four-digit cap. `I-10000` is valid.

## Current behavior this pass replaces

This section records the code before issue codes and the issue page. Do not reintroduce a sheet, a background location, or an issue description field from it.

Allocation is in `apps/api/src/services/issues.ts` `create`. After `lockProjectShare` and `lockIssueNumbers` it reads `max(issue.number)` for the organization and project, then inserts `(max ?? 0) + 1`. `remove` and `removeMany` delete rows and do not record the high-water mark.

`lockProjectShare` in `apps/api/src/services/project-access.ts` is `SELECT ... FOR SHARE` on `project`. It is not an exclusive lock. `lockIssueNumbers` in `apps/api/src/services/issue-placement.ts` is `pg_advisory_xact_lock(hashtext(projectId), hashtext('issue-number'))`. That advisory lock is what serializes creates today. The reuse bug is the `max + 1` read, not a missing lock.

`packages/db/src/schema/projects.ts` defines `issue.number` as `integer("number")` with unique `(projectId, number)`. There is no check constraint.

`packages/shared/src/contracts/issue.ts` defines `issueCardSchema.number` as `z.number().int().min(1)`. List, board, and get all return that shape. `toIssueCard` copies `record.number` through. Saved-view filters in `packages/shared/src/contracts/issue-view.ts` store `numberMin` and `numberMax` as JSON numbers. `parsePositiveInteger` in `packages/shared/src/utilities/issue-list-query.ts` uses `Number` and rejects anything that is not a safe integer. The query string form is `number=2..10`.

Search in `buildIssueSearch` matches `position(needle in ('#' || number::text))`. It does not know the `I-` spelling. The table's client haystack in `matchesIssueSearch` does the same with `String(row.number)` and `#${row.number}`.

The table cell in `issue-table-columns.tsx` renders `#{row.original.number}`. The column header is `#`. The select checkbox aria-label is `Select issue ${number}`. `IssueCard` renders title, priority, and assignee, and its button calls `onEdit`. `IssueTitleCell` is a button that calls `openIssue`. `useIssueTable`, `useIssueBoard`, and `useIssueViewBoard` all call `issueForm.openEdit`. `IssueFormDialog` is a right-side sheet at `sm:max-w-md`. Create and edit share it. `useIssueForm` loads the description by UUID through `GET .../issues/:issueId`, saves with `expectedUpdatedAt`, and closes the sheet on success.

Routes in `apps/web/src/app/routes.tsx` nest `issues`, `board`, `views`, `views/:viewId`, and `settings` under `projectRoutePattern`. There is no issue-code child. `useProjectLayout` marks Issues active only when `useMatch` hits `projectIssuesRoutePattern` with `end: true`, so a longer path would not light that item.

Pagination and filters for the table live in the list URL (`page`, `sort`, `direction`, `q`, `number`, and the other list params). Board and view scroll live in column `ScrollArea` viewports, including the virtual window in `issue-column.tsx`. Unmounting those routes drops that scroll. `BrowserRouter` is mounted in `apps/web/src/main.tsx`, so `AppRoutes` can read `useLocation`.

Raw SQL also inserts `issue.number`: `apps/api/scripts/verify-organization-isolation.ts` and `apps/api/scripts/benchmark-issues.ts`. Project creation in `apps/api/src/services/projects.ts` inserts a `project` row and does not have a counter row to maintain yet.

`formatDateTime` from `@teamos/shared` is already how the table prints timestamps. `notify` is the existing toast helper.

## Decisions

### Counter row, separate from `project`

Add `project_issue_counter`, one row per project. Do not add `last_issue_number` to `project`.

Create already holds `FOR SHARE` on the project row for the whole transaction. Two such transactions can hold that share lock together. If both then `UPDATE` the same project row, PostgreSQL has to upgrade both to an exclusive lock and can abort one with a deadlock. A counter on `project` would take that path. A separate row is locked only by allocation and by project creation.

The counter stores the last issued number, not the next one. `0` means no issue has been issued. The next create receives `1`.

Initialize every existing project to `coalesce(max(issue.number), 0)` in the migration. Preserve every current `issue.number`. Do not renumber.

After the counter row exists, create never reads `max(number)` to choose the next value. The only `max(number)` read left is a repair when a project has no counter row: insert the missing row at that max, then increment. That repair covers a project inserted by an old process or a script during the deploy window. It is not the steady-state allocator. Scripts in this repo must write the counter themselves so the repair path stays cold.

Keep `lockIssueNumbers` and call it immediately before the counter update. The advisory lock stays the gate in front of column locks, which keeps today's lock order. The counter `UPDATE` is the atomic increment underneath that gate. Do not take the counter lock before the project share lock, and do not take it after the column advisory locks.

Delete, bulk delete, update, and placement do not change the counter. A gap is permanent.

The unique constraint `(project_id, number)` stays as the backstop. A unique violation on that constraint must not fall back to `max + 1`. Return a conflict. With the counter, that violation means a writer inserted a number without moving the counter.

### `bigint` in Postgres, decimal string at the boundary

Change `issue.number` and store `last_number` as `bigint`. The ceiling is `9223372036854775807`. That value is above `Number.MAX_SAFE_INTEGER`, so a JavaScript number cannot be the contract.

Use Drizzle `bigint(..., { mode: "bigint" })` (drizzle-orm `^0.45.2` exposes `number` and `bigint` modes). `mode: "number"` rounds through `Number` and is the wrong mode. Convert with `BigInt` and `toString()` inside `toIssueCard` before the value reaches `JSON.stringify`. A raw `bigint` in a response throws.

The shared schema is a decimal string: one or more digits, no leading zero, value from `1` through the bigint ceiling. Put the ceiling next to the helper as the string `9223372036854775807` and compare with `BigInt`.

Sorting stays `ORDER BY issue.number` in SQL, which is numeric for `bigint`. Do not sort these strings with the default JavaScript string compare (`"10"` sorts before `"2"`). The list already asks the server to sort. Update any local compare that still assumes a JavaScript number, or the current page will treat every string number as `NaN` and hide the row.

### One code helper in `packages/shared`

Add `packages/shared/src/utilities/issue-code.ts` and export it from the shared package entry. The web app, the API search path, and the tests all use it. Do not format codes inside a component with a one-off `padStart`.

The helper owns:

- `formatIssueCode(decimal)` → canonical code.
- `parseIssueCode(input)` → the decimal and whether the input is already canonical.
- `parseIssueNumberBound(input)` → a decimal from a filter bound, accepting a canonical code, a code with extra or missing zeros, or a plain decimal.

Canonical display rules:

| Decimal | Canonical code | Also accepted, then redirected              | Rejected                              |
| ------- | -------------- | ------------------------------------------- | ------------------------------------- |
| `1`     | `I-0001`       | `I-1`, `I-01`, `I-001`, `i-0001`, `I-00001` | `I-0`, `I-0000`, `1`, `WEB-1`, a UUID |
| `9999`  | `I-9999`       | `I-09999`, `i-9999`                         | `I-9999 ` with a space                |
| `10000` | `I-10000`      | `I-010000`                                  | `I-10000a`                            |

The prefix is the letter `I`. Matching is case-insensitive. The stored and copied form is uppercase. The numeric value ignores leading zeros. The rendered body is at least four digits and grows past four. `I-0000` is value `0` and is not an issue code.

`parseIssueCode` returns a result only when the whole string is a prefix plus digits. Anything else is rejected. The route does not look up a UUID that someone pasted into the code slot.

### Lookup by number, UUID mutations unchanged

`GET /api/organizations/:organizationSlug/projects/:projectId/issues/:issueId` stays a UUID get. Update and delete stay on that UUID.

Add `GET /api/organizations/:organizationSlug/projects/:projectId/issues/by-number/:number` for the screen that only has a code. `:number` is the decimal string, not `I-0001`. The browser parses the code and sends the decimal. The handler uses the same `view` check as `get`. A missing row, a number outside bigint, or a project the caller cannot see is `404` `ISSUE_NOT_FOUND`. Do not answer `403` for a hidden project or a hidden issue.

Register it as its own path. `issueId` is already `z.uuid()`, so the literal `by-number` would not be parsed as an id, and a distinct path keeps that obvious in OpenAPI. OpenAPI is generated from the route Zod schemas at `/openapi.json`. There is no checked-in spec to edit.

### Detail is one page

There is no issue overlay and no background location. `AppRoutes` renders one route tree.

- A click from the list, board, or saved view pushes the canonical issue path with `{ issueReturn: true }`. The browser history entry underneath keeps that page's query and scroll.
- The detail route is the only issue surface. Refresh, a copied link, and a new tab open the same page.
- Back calls `navigate(-1)` when `issueReturn` is set. A direct visit shows a link to the project issue list.
- Create and quick edit use `Dialog`, including on a narrow viewport. The dialog edits title, priority, status, and assignee. It does not send `content`.
- A successful create closes the dialog, stays on the current route, and highlights the new issue when that id is in the loaded result. Otherwise it reports the issue code and status and offers View issue.
- A successful save on the detail page stays on the page. A successful delete goes to the project issue list.
- Copy link writes the canonical absolute URL and nothing else. No query string. Use `notify` for success and for a clipboard failure.
- A dirty detail draft is kept in `sessionStorage` for that issue and base revision. Leaving the page asks first. Refresh from the conflict state discards the draft and reloads the server document. A refetch does not replace a draft the user is still editing.

### Saved views keep loading

`issue_view.definition` is JSON. Existing rows store `numberMin` and `numberMax` as JSON numbers, and those numbers are safe integers because they were capped by `integer`. The view schema should accept a JSON number or a decimal string and normalize both to the decimal string. New writes store strings. Do not bump `definition.version`, and do not rewrite every view row in SQL.

Compare the two bounds with `BigInt`. The current check uses JavaScript `>`, which is the wrong compare once the values are strings or large integers.

An invalid bound that the user did submit makes the list unsatisfiable, the same way a status token that parses to nothing already does. Dropping a bad bound would show every issue. A blank bound still means "no bound".

## Data model

`project_issue_counter` in `packages/db/src/schema/projects.ts`:

| Column            | Rule                                                |
| ----------------- | --------------------------------------------------- |
| `project_id`      | uuid, primary key                                   |
| `organization_id` | text, not null                                      |
| `last_number`     | bigint, not null. `0` when no issue has been issued |

Constraints:

- Composite foreign key `(project_id, organization_id)` to `project(id, organization_id)` with `ON DELETE CASCADE`. Deleting the project deletes the counter.
- Check `last_number >= 0`.

No audit columns. The issued issue row already records who created it. This table is the high-water mark.

`issue.number`:

- Change the column type from `integer` to `bigint`.
- Keep unique `(project_id, number)`.
- Add check `number >= 1`. Current writers start at `1`. The migration should fail if a row violates that, which would mean hand-inserted data this app did not create.
- The unique index is the lookup for `(project_id, number)`. The service still filters `organization_id` in the query so a bug cannot cross a tenant. No extra index.

Project create inserts the counter row at `0` in the same transaction as the project row, after the project insert succeeds and before commit. A failure rolls both back.

## Allocation

Inside `create`, after the existing `lockIssueNumbers` call and before the column locks:

1. `SELECT last_number FROM project_issue_counter WHERE project_id = ? AND organization_id = ? FOR UPDATE`.
2. If no row, insert one with `last_number = coalesce(max(issue.number) for that project and organization, 0)` and `ON CONFLICT (project_id) DO NOTHING`, then read it again `FOR UPDATE`.
3. If `last_number` is `9223372036854775807`, throw `409` `ISSUE_NUMBER_EXHAUSTED` with a message that this project has used every available issue number. Do not insert the issue.
4. Otherwise set `last_number = last_number + 1` and use the returned value as `issue.number`.

Do the increment in SQL (`SET last_number = last_number + 1 ... RETURNING`) so the service does not add big integers by converting them through `Number`.

`mapIssueWriteError` today turns every `23505` into a generic `500`. When the constraint name is `issue_project_number_unique`, return `409` `ISSUE_NUMBER_CONFLICT` and do not retry. Other unique violations keep the current mapping.

Lock order for create stays:

1. `lockProjectShare` (`FOR SHARE` on `project`).
2. Actor re-check.
3. `lockIssueNumbers`.
4. Counter read and increment.
5. Status row lock and `lockIssueColumns`.
6. Placement and insert.

## HTTP contract

`number` on `issueCardSchema` and therefore on summaries, list rows, board cards, create, update, and get becomes the decimal string schema. Clients in this repo are updated in the same pass. Do not accept a JSON number on the issue payload. The view-filter preprocess is the only legacy-number reader.

`GET .../issues/by-number/:number` returns `issueResponseSchema`. The param uses the same decimal schema. A code-shaped param is `404`, not a redirect. Redirects belong to the browser route.

Filter query `number` stays a string range `min..max`. Each side accepts a decimal or an `I-` code and is stored in the parsed filter as a decimal string. SQL compares with `issue.number >= $bound::bigint` and `<=`. Empty sides stay open. `I-0001..I-0010` and `1..10` are the same filter.

The committed table query string stores decimals (`number=1..10`), so existing links keep working. The filter summary prints codes: `Number: I-0001–I-0010`. The min and max inputs are text fields with `inputMode="numeric"`. They accept `1`, `0001`, and `I-0001`. After the existing debounce they show the canonical code. `type="number"` is the wrong control here: it rewrites large values and offers a spinner.

Sort key `number` stays. Direction stays. The server order is the numeric order.

Search `q`:

- Match title, `content_text`, status, priority, and assignee. Do not search the JSON document.
- Keep the `'#' || number::text` match so `#12` still hits.
- When the whole needle parses as a code, as `#` plus digits, or as digits, also match `issue.number` equal to that decimal. This is what makes `I-0001`, `I-1`, and `0001` find issue `1`. `number::text` alone is `1`, so those spellings miss today.
- Also match the lowered canonical code as a substring when the needle matches `i-` plus at least one digit. `i-000` can find `I-0001`. A bare `i` or `i-` must not match every issue.
- Put the same canonical code, the `#` form, and the decimal into `matchesIssueSearch`. The table rechecks the current page locally. If the haystack lags the server, a row the server returned disappears on the page.

`apps/api/scripts/verify-organization-isolation.ts` asserts `firstIssue.number === 1`. Compare the decimal string `"1"` after the contract change. Where that script inserts issues by SQL, set `project_issue_counter.last_number` to the highest number it inserted, in the same transaction. `benchmark-issues.ts` does the same for its bulk insert. A script that inserts number `5` while the counter stays `0` makes the next service create take `1` and hit the unique constraint.

## Browser routes

Add the path helper and the pattern next to the existing issue paths in `apps/web/src/features/issues/lib/issue-paths.ts`.

- `projectIssuePath(organizationSlug, projectSlug, issueCode)` builds `/w/${org}/p/${project}/issues/${code}` and encodes each segment.
- `projectIssueRoutePattern` is `${projectIssuesRoutePattern}/:issueCode`.

Register a child of the project layout:

```text
issues              → ProjectIssuesRoute
issues/:issueCode   → ProjectIssueRoute
```

`issues` is one static segment. `issues/:issueCode` is a longer path. The list route keeps winning for `/issues`. The board stays a sibling at `/board`, so a code is never confused with the board.

`ProjectIssueRoute` reads `:issueCode`.

- Rejected spelling: render the existing not-found page. Do not call the API. Do not explain whether the code was malformed or the issue is missing.
- Accepted spelling that is not canonical: `<Navigate replace>` to the canonical path, keeping the navigation state so Back still returns to the page that opened the issue.
- Canonical spelling: load `by-number` with the decimal. `404` renders the same not-found page. A transport failure renders the retry state. A viewer who can see the project and cannot update it sees the fields disabled, the same rule `useIssueForm` already applies through `canUpdateIssue` and `canDeleteIssue`.

`useProjectLayout` treats the detail pattern as Issues active, in addition to the exact list match. Board, Views, and Settings stay on their own exact matches. The detail page renders inside `ProjectLayout`. A visit that has a return entry shows Back. A direct visit shows All issues, which opens the list without the filters from a previous visit.

Project rename already changes the slug and leaves `issue.number` alone. Do not add a rewrite. An old slug still fails project lookup and renders not-found. The code on the issue does not change.

## Detail contents and interactions

`IssueDetail` is the page. From top to bottom:

- Secondary actions: Back or All issues, Copy link, Delete when allowed, and Save when the member can update and the draft is dirty.
- Metadata: code, then priority, status, and assignee, using the current pickers.
- Title: a real input with accessible name `Title`, no border, ring, background, or shadow. Trimmed, required, at most 140 characters.
- Content: the vendored editor, lazy-loaded with this page. Empty content shows the placeholder `Write the issue`. A viewer sees the document and cannot edit it.
- Created on the left and updated on the right.

Save sends title, priority, status, assignee, content, and `expectedUpdatedAt`. There is no autosave. A conflict or a failed save keeps the draft and offers Refresh. Delete still confirms through `DeleteIssueDialog`.

`IssueFormDialog` is the create and quick-edit dialog. Its accessible names are `New issue` and `Edit issue`. The title input's accessible name is `Issue title`. Quick edit patches only the fields the dialog owns.

The select checkbox keeps selecting and does not navigate. Its aria-label uses the canonical code: `Select issue I-0001`.

The table column id stays `number` so saved sort and filter state still address it. The header label becomes `ID`. The cell shows the canonical code in the existing mono, muted, tabular style. Widen the column from `72` so `I-10000` fits. The card shows the same code in that style above the title, and the card's accessible name includes the code and the title.

The dialog focuses the title when it opens and restores focus when it closes. The detail column is `max-w-3xl` with responsive padding. Keyboard, reduced motion, light theme, and dark theme follow the existing dialog, link, and button behavior. A created issue highlights once for about 1.6 seconds. Reduced motion uses a static highlight and does not smooth-scroll.

## Files

Shared:

- Add `packages/shared/src/utilities/issue-code.ts` and its test. Cover the table in the code-format section, the bigint ceiling, and bound parsing.
- Change `packages/shared/src/contracts/issue.ts` so card and summary `number` is the decimal string. Export the schema for the by-number param.
- Change `packages/shared/src/contracts/issue-view.ts` so `numberMin` and `numberMax` normalize legacy JSON numbers and decimal strings.
- Change `packages/shared/src/utilities/issue-list-query.ts` and `issue-view.ts` for bounds, the min/max compare, and the summary text.
- Export the helper from the shared entry.

Database:

- Update `packages/db/src/schema/projects.ts`.
- Generate the migration with `bun run db:generate` and review the SQL before committing it. Drizzle Kit will emit the type change and the new table. It will not emit the backfill. Add the `INSERT ... SELECT coalesce(max(number), 0)` into the generated SQL so it runs in the same migration, after the table exists and after `issue.number` is `bigint`. The unique constraint and the new checks must agree with the statement order. A check on `number >= 1` can be added after the type change.
- Confirm the snapshot still matches after the hand-written backfill. The backfill does not change the schema shape.

API:

- `apps/api/src/services/issues.ts`: allocate from the counter, map the number to a decimal string, compare filter bounds as `bigint`, extend search, add `getByNumber`.
- `apps/api/src/services/projects.ts`: insert the counter row in the project-create transaction.
- `apps/api/src/routes/issues.ts`: register the by-number get. OpenAPI follows the schema.
- `apps/api/scripts/verify-organization-isolation.ts` and `apps/api/scripts/benchmark-issues.ts`: maintain the counter when they insert issues, and compare the decimal string.

Web:

- `apps/web/src/features/issues/lib/issue-paths.ts` and its test.
- `apps/web/src/app/routes.tsx` and `routes.test.tsx` for the child route, the canonical redirect, a rejected code, and returning from the page to the list.
- `apps/web/src/layouts/use-project-layout.ts` so Issues stays active on the detail URL.
- A route module `apps/web/src/routes/project-issue-route.tsx` for the issue page. Do not add a second overlay route.
- Extract the shared detail body from `IssueFormDialog` without changing create.
- `issue-table-columns.tsx`, `issue-card.tsx`, `issue-table-query.ts`, `issue-table-filters.tsx`, and `issue-view-draft.ts`.
- `use-issue-table.ts`, `use-issue-board.ts`, and `use-issue-view-board.ts` so a row or card click opens the issue page. Quick edit stays in the dialog.

Fixtures and tests that construct an issue with `number: 1` move to `number: "1"`. That includes web fixtures, API service tests, and the isolation script. Search the repo for `number:` on issue objects rather than guessing the list is complete.

Docs close-out for this pass: the finished behavior is in `docs/progress.md`, and the M1 checklist is no longer on the roadmap.

## Tests

Shared:

- Format and parse the rows in the code table, including case and extra zeros.
- Reject `0`, blank, a UUID, and a foreign prefix.
- Accept the bigint ceiling and reject the next integer.
- Parse filter bounds from decimals and from codes.

Service, against the test database:

- Two overlapping creates receive two consecutive numbers and both commits succeed.
- Create, delete that issue, create again: the second number is the deleted number plus one.
- Counter at `5` with no issue `5` still issues `6`.
- Counter at the bigint ceiling returns `409` `ISSUE_NUMBER_EXHAUSTED` and leaves the issue table unchanged.
- `getByNumber` returns the issue for a member who can view, `404` for another organization, `404` for another project in the same organization, and `404` for a private project the member cannot see.
- Search `I-0001` returns issue `1` and does not return issue `10`. Search `i-000` can return `I-0001`. Search `I-10000` returns `10000` and does not return `1000`.
- Filter `I-0002..I-0010` uses numeric order.

HTTP:

- The by-number route validates the decimal param, returns the summary schema, and does not treat the value as a UUID.
- Create response `number` is a string. A list sort on `number` is numeric.

Web:

- `/w/acme/p/website/issues/I-0001` renders the full page.
- `/w/acme/p/website/issues/I-1` replaces the URL with `I-0001`.
- `/w/acme/p/website/issues/nope` renders not-found and does not request the issue.
- A click in the table, the board, and a saved view opens the issue page. Back restores the previous query.
- Dismiss and Back restore `page` and filters. A board column that was scrolled is still scrolled.
- Refresh on the issue URL shows the full page.
- Copy link writes the canonical absolute URL.
- The table, the card, and the detail show the same code.
- A viewer sees disabled fields and no delete. A member can save. A lead can delete.
- The Issues nav item is active on the detail URL. Board is not.

`bun run --cwd apps/api verify:isolation` is required for this pass because the new read is tenant-scoped and the script inserts issue numbers directly.

## Verification before calling M1 done

- Review the generated migration by hand, including the backfill and the check-constraint order.
- `bun run check`.
- `bun run --cwd apps/api verify:isolation` with PostgreSQL up.
- In the browser: list, board, and saved view, then the direct URL, the padded redirect, the rejected code, copy link, search, the number filter, save, delete, Back, and refresh.
- Desktop and a narrow viewport. Light and dark. Keyboard through the page, the dialog, and the copy button. Reduced motion keeps the created-issue highlight static.
- `docs/progress.md` updated only after those paths exist. The roadmap M1 checklist comes out in that same docs pass.

Do not format `docs/plans/issue-pagination.md` while doing this. It already fails `prettier --check` and is outside the pass.
