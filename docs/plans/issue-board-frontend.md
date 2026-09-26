# Issue Board Frontend

Status: implemented.

Branch: `feat/issue-list`.

Parent plan: `docs/plans/issue-list.md`.

Backend: `docs/plans/issue-board-backend.md` is implemented. This plan is only the screen. It does not change the API, add a list view, or add realtime.

The screen should feel like a basic Linear board: quiet columns, short cards, one create dialog, and drag that does not invent a second workflow. It should look like the rest of TeamOS, which means shadcn primitives and semantic tokens, not a custom kanban skin.

## Library choice

`@shadcn` has no kanban component. `shadcn search @shadcn -q kanban` returns nothing. The only "board" hit is the dashboard block, which is a sidebar and a table. Do not install a community kanban block. Those blocks usually restyle primitives, pass `size="sm"`, and assume Radix `asChild`. This app is Base UI (`base-nova`) and must not edit `components/ui`.

| Library                                                    | Fit                                                                                                                     | Decision                                               |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | Headless. Renders nothing, so Card, Button, and ScrollArea stay shadcn. Multiple containers, keyboard sensor, React 19. | Use these three.                                       |
| `@hello-pangea/dnd`                                        | Maintained fork of `react-beautiful-dnd`. List-first, weaker nested column and card dragging, maintenance-only.         | Do not add.                                            |
| `@atlaskit/pragmatic-drag-and-drop`                        | Fast and used by large boards, but it is a manual DOM toolkit, not a sortable React API. Too much code for 200 cards.   | Do not add.                                            |
| `framer-motion` `Reorder`                                  | Already installed. One list only. No cross-column drop and no keyboard sortable.                                        | Do not use it to drag. Use `useReducedMotion` from it. |
| Native HTML drag                                           | No reliable keyboard path.                                                                                              | Do not use.                                            |
| Base UI                                                    | No drag primitive.                                                                                                      | Keep it for Dialog, Select, and Menu.                  |

Add the three dnd-kit packages to `apps/web` with Bun. Do not add `@dnd-kit/modifiers` unless a collision bug shows up. The first board does not need snap modifiers.

dnd-kit only supplies drag state. Every visible control is an existing primitive: `Card`, `Button`, `Badge`, `Avatar`, `ScrollArea`, `DropdownMenu`, `Dialog`, `AlertDialog`, `Field`, `Input`, `Textarea`, `Select`, `Alert`, `Skeleton`, `Empty` is not used inside a column.

## What the screen does

- Route: `/workspaces/:organizationSlug/projects/:projectSlug/issues`.
- Sidebar item Issues, next to Overview. Overview is current only on the project index.
- Columns render in `position` order, including empty ones. A new project is five columns, not an empty page.
- A card shows `#number`, title, priority label, and assignee. Description stays in the dialog.
- Board-level create omits `statusId`, so the server puts the issue at the top of Backlog.
- The `+` on a column creates in that column by sending `statusId`.
- Dragging a card sends `PATCH` with `statusId` and `index`. Dragging a column sends `PATCH` with `index`. The client never sends `position`.
- A member can drag cards. A lead, owner, or admin can also drag columns and use the column menu. A viewer can only look.
- If `total` is greater than the returned issues, show a non-blocking alert. Do not hide columns.

## What it does not do

- No list toggle, filters, search, labels, estimates, or comments.
- No inline title editing on the card. Create and edit are one dialog.
- No color picker and no raw palette classes. Category is an icon, not a painted column.
- No page-level `Empty` inside each column. Five full empty states would hide the board. An empty column is one muted sentence inside the drop area.
- No pointer-drag test. Ordering is already proven in `verify:isolation`.

## Files

Create `apps/web/src/features/issues/`:

- `api/issue-api.ts`
- `query-keys.ts`
- `lib/issue-paths.ts`
- `lib/board-columns.ts`
- `hooks/use-issue-board.ts`
- `hooks/use-issue-form.ts`
- `hooks/use-column-form.ts`
- `components/issue-board.tsx`
- `components/issue-column.tsx`
- `components/issue-card.tsx`
- `components/issue-form-dialog.tsx`
- `components/column-form-dialog.tsx`
- `components/delete-issue-dialog.tsx`
- `components/delete-column-dialog.tsx`
- `components/issue-board.test.tsx`
- `index.ts`

Also:

- `apps/web/src/routes/project-issues-route.tsx`
- Export it from `apps/web/src/routes/index.ts`
- Register `path="issues"` beside the project index route in `apps/web/src/app/routes.tsx`
- Add the same child to `renderWorkspace` in `apps/web/src/test/workspace-fixtures.tsx`
- Extend `ProjectSidebarView` and `useProjectLayout`
- Change `project-sidebar.tsx` only to render the new item and the active flags it receives

Do not put fetching or permissions in `features/projects`. The layout may import `projectIssuesPath` from the issues barrel.

## Data

`issue-api.ts` uses `requestParsed` and `requestVoid` with the shared schemas. Paths use the project id, not the slug:

- `GET/POST /api/organizations/{slug}/projects/{projectId}/statuses`
- `PATCH/DELETE .../statuses/{statusId}`
- `GET/POST .../issues`
- `PATCH/DELETE .../issues/{issueId}`

Query keys:

```text
["organization", slug, "projects", projectId, "issues"]
["organization", slug, "projects", projectId, "issues", "statuses"]
["organization", slug, "projects", projectId, "issues", "cards"]
```

The first key is the prefix. Every mutation invalidates it. Do not poll.

The page hook resolves the project the same way overview does: `useProjectList`, then find the slug. Missing project is `not-found`. The list query failing is `error` with retry. Status and issue queries stay disabled until that project id exists.

Fetch statuses and issues with two `useQuery` calls. Group cards in `board-columns.ts`, a pure function: statuses sorted by `position` then `id`, issues filtered by `statusId` and sorted by `position` then `id`. The hook returns that grouped view. The column component does not sort.

Assignee names come from the existing project members query, keyed by `memberId`. If that query fails, the board still renders and the avatar falls back to initials or a generic user icon. The form shows the members error and disables the assignee select.

## Permissions

Compute these once in `useIssueBoard` with `canPerformProjectAction`. Pass booleans down.

| Flag               | Action         | UI                                   |
| ------------------ | -------------- | ------------------------------------ |
| `canCreateIssue`   | `create-issue` | Board create button and column `+`   |
| `canUpdateIssue`   | `update-issue` | Card drag, and the form can save     |
| `canDeleteIssue`   | `delete-issue` | Delete action in the issue dialog    |
| `canUpdateProject` | `update`       | Column drag, column menu, add column |

A viewer gets none of these. A member gets the issue flags except delete. A lead gets all of them. Organization owners and admins get all of them through the existing helper. Do not reimplement that matrix in the component.

## Layout and sidebar

`projectIssuesPath(organizationSlug, projectSlug)` returns the issues URL with encoded segments.

`useProjectLayout` adds `issuesPath`, `overviewActive`, and `issuesActive`. Use `useMatch` with `end: true` for the project index, and a non-end match is wrong there because `/issues` would also match. Issues uses a match on the issues path.

Remove the hardcoded `isActive` on Overview. `SidebarMenuButton` gets `isActive={view.overviewActive}` or `view.issuesActive`. Both items use `render={<NavLink />}`. Overview keeps `end`. Issues does not need `end` unless the URL later grows children. For this slice, pass `end` on both so only the exact page is current.

Issues icon: `ListTodoIcon` from `lucide-react`. Do not size it.

The board lives in `SidebarInset` under the existing project header. It should fill the remaining height and scroll horizontally. Do not add a second page header that repeats the project name.

## Visual design

Keep it close to Linear and closer to the current shadcn pages.

Board:

- `ScrollArea` with a horizontal row, `flex` and `gap-4`, `items-start`.
- Each column is `w-72 shrink-0`, a `Card` with `CardHeader` and `CardContent`.
- Header: category icon, truncated column name, count in `text-muted-foreground`, then icon buttons.
- Category icon map, exhaustive over the category union: `CircleDashedIcon` backlog, `CircleIcon` unstarted, `CircleDotIcon` started, `CircleCheckIcon` completed, `CircleXIcon` canceled. The accessible name is the column name, not the category code.
- Do not render `backlog` or `started` as text. Do not add `bg-blue-500` or other raw colors.

Column actions, only when `canUpdateProject`:

- `+` is `Button` `variant="ghost"` `size="icon"` with `PlusIcon` and `aria-label` `Add issue to {name}`.
- Menu is `DropdownMenu`. Items: Rename, Delete. Delete is `variant="destructive"` if that item variant exists. Both have icons via `data-icon="inline-start"`.
- The default column still shows Delete, but the confirm dialog explains it cannot be deleted, or the item is omitted when `isDefault` is true. Omit it. The server remains the guard.
- Add column is a ghost button at the end of the row, with `PlusIcon` and the label "Add column".

Cards:

- `Card` `size` default, compact padding only if the Card primitive already provides it. Do not pass `size="sm"`.
- Top line: `#${number}` in `text-muted-foreground`, and a `Badge` for priority when it is not `none`.
- Title is one or two lines with `line-clamp-2`. It is a heading or a button label, not a raw div with heading styles.
- Footer: `Avatar` `size-6` is a layout size on the avatar wrapper if the primitive allows `className` for size. Prefer the primitive default if `size-6` fights it. Fallback is `getInitials`. Unassigned shows `UserRoundIcon` in muted text, with `aria-label` "Unassigned".
- Priority copy comes from `getIssuePriorityLabel`. Badge variant: `destructive` for `urgent`, `secondary` otherwise. `none` is hidden on the card and still selectable in the form.
- The whole card is a `button` so keyboard users can open it. Do not nest a button inside a button. Column `+` and the card menu are outside the card button.

Empty column copy: "No issues". It stays inside the droppable so a card can be dropped on an empty column.

Loading: column-shaped `Skeleton` rows, `aria-busy`, and an `sr-only` label. Error: destructive `Alert` plus Retry. Truncation: a non-destructive `Alert` above the board, "Showing 200 of {total} issues."

## Drag behavior

One `DndContext` wraps the board.

Sensors:

- `PointerSensor` with `activationConstraint: { distance: 8 }`, so a click still opens the dialog.
- `KeyboardSensor` with `sortableKeyboardCoordinates`.

Cards use `SortableContext` per column, strategy `verticalListSortingStrategy`. The column body is the droppable. Columns use a horizontal `SortableContext` only when `canUpdateProject` is true. When it is false, columns are static droppables and cards still move if `canUpdateIssue` is true. When both are false, do not mount sensors.

`onDragEnd` is the only place that writes. `onDragOver` may update a local preview, but the mutation waits for drop.

Card drop payload:

- `statusId`: the column the card was dropped on.
- `index`: the 0-based index among the other cards in that column.

Column drop payload:

- `index`: the 0-based index among the other columns.

If the card was dropped back where it started, do not send a request.

Optimistic update: move the card in the issues query cache before the request, then invalidate on settle. On error, roll the cache back and toast a short message. Do not leave the card in the new column after a 403 or 409.

`DragOverlay` renders a plain card preview. If `useReducedMotion()` is true, render the overlay without a transform transition. The drop still commits.

Dragging sets `aria-grabbed` through dnd-kit attributes. The card button's accessible name is `#{number} {title}`.

## Dialogs

One issue dialog for create and edit. `DialogTitle` is required. `FieldGroup` has `my-4`.

Fields:

- Title, `Input`, required.
- Description, `Textarea`, optional. Clearing it on edit sends `null`.
- Status, `Select` with status ids as values and column names as labels. Names are free-form, so this select does not use a code label record. Pass an `items` record of id to name so `SelectValue` shows the name.
- Priority, `Select` with `items={issuePriorityLabels}` and `getIssuePriorityLabel`.
- Assignee, `Select` of project members plus an unassigned value that sends `null`. Show the member name, not the member id.

Footer: Cancel, and a submit button with `Spinner` while pending. Edit mode adds a destructive Delete button that opens `AlertDialog` instead of deleting immediately. Hide Delete when `canDeleteIssue` is false. Hide the whole create entry points when `canCreateIssue` is false. An edit dialog can still open for a viewer, but the fields are read-only and there is no submit.

Column dialog: name and, on create only, category `Select` with `items={issueStatusCategoryLabels}`. Rename does not show category. `FieldGroup` has `my-4`.

Delete column uses `AlertDialog`. Copy says issues must be moved first if the server returns `CONFLICT`. Map these codes in the form hook, and do not render the raw server message:

- `ISSUE_NOT_FOUND`
- `PROJECT_NOT_FOUND`
- `PROJECT_STATUS_NOT_FOUND`
- `PROJECT_STATUS_NAME_TAKEN`
- `MEMBER_NOT_FOUND`
- `FORBIDDEN`
- `CONFLICT`

`PROJECT_STATUS_NAME_TAKEN` is an inline field error. `CONFLICT` on delete is the alert description after a failed confirm, or a toast if the confirm already closed.

## Hook shape

`useIssueBoard` returns `loading | not-found | error | ready`. The ready view contains the grouped columns, permission flags, truncation, dialog state, and callbacks: `onCreateIssue`, `onEditIssue`, `onMoveIssue`, `onMoveColumn`, `onCreateColumn`, `onRenameColumn`, `onDeleteColumn`, `retry`.

`useIssueForm` owns the draft, validation, and the mutation. The dialog receives `form` and does not call `useMutation`.

`useColumnForm` is the same split for the column dialog.

`board-columns.ts` is pure and tested without jsdom: grouping, sort, and the index calculation for a drop. The drag handler calls that function, then the mutation. That is the unit test for "drop on column B at index 2".

Components take `view` or `form` props. They do not call `useQuery`, `useParams`, or `canPerformProjectAction`.

## Tests

`issue-board.test.tsx` mounts the route through `renderWorkspace`.

- Seeded column names render. Category codes do not.
- Creating from the board posts `{ title }` and no `statusId`.
- Creating from a column posts that column's `statusId`.
- Add column is absent when the project role is `member`, and present when it is `lead`.
- From the issues URL, Issues is `current: "page"` and Overview is not.
- The overview test still passes: Overview is current, Issues is not.

`board-columns.test.ts` covers grouping and drop index without a browser.

Do not install a drag-event simulation. A flaky pointer test would not prove the server order.

MSW needs default handlers for statuses and issues, or `onUnhandledRequest: "error"` fails the suite. Add them to `useWorkspaceHandlers`.

## shadcn rules for this screen

- No `size="sm"`. Icon-only buttons use `size="icon"` and an accessible name.
- Icons sit on buttons with `data-icon="inline-start"` or `data-icon="inline-end"`. Do not add `size-4` to those icons.
- `className` is for layout: width, gap, truncate, line-clamp. Not for recoloring Card or Button.
- Spacing is `gap-*`, not `space-y-*`.
- Selects that show a code use the shared label record as `items`. Column names and member names are display data.
- Dialogs have a title. Confirmations use `AlertDialog`.
- Do not edit `components/ui`.

## Done when

```text
bun run --cwd apps/web test
bun run --cwd apps/web lint
bun run --cwd apps/web check-types
```

Also run `bun run format:check` from the repo root. Do not mark the product milestone complete in `docs/progress.md` until this screen and the existing backend checks both pass. The web package already has an unrelated `App.tsx` casing error in `check-types`. If that is still present, report it and do not treat it as part of this slice.

## Implementation order

1. Add the three dnd-kit packages.
2. API client, query keys, path helper, and `board-columns` with its test.
3. Board hook and the two form hooks.
4. Presentational board, column, card, and dialogs.
5. Route, sidebar active state, and MSW fixtures.
6. Route tests, then the web lint, typecheck, and test scripts.
