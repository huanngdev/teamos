# TeamOS — Product Roadmap

Date: 2026-10-02

Status: product direction agreed by the user. M1 is next. Each later milestone still needs its own implementation pass before coding.

## 1. Goal and Implementation Order

Complete the issue workflow first, then add collaboration and progress visibility. Each milestone must deliver usable behavior with persistence, authorization, tests, and a user-facing flow before the next milestone begins.

| Milestone | User-facing outcome                                             | Dependencies                         |
| --------- | --------------------------------------------------------------- | ------------------------------------ |
| M1        | Stable issue codes, shareable URLs, and issue detail            | Existing foundation                  |
| M2        | Issue activity history and workspace audit log                  | M1                                   |
| M3        | Blocks/blocked-by relationships and enforced status transitions | M1–M2                                |
| M4        | Rich descriptions, images/files, and comments                   | M1–M2                                |
| M5        | Realtime board/detail updates and notifications                 | M2–M4                                |
| M6        | Progress and workload dashboard                                 | M2–M3; preferably after M5           |
| M7        | Project chat                                                    | M4–M5                                |
| M8        | Production readiness                                            | Required before a production release |

**Start with M1. Do not begin all milestones at once.**

Schedules and dedicated HR functionality are outside this roadmap. For now, employee management means workspace/project membership, roles, assignments, and workload visibility.

## 2. Milestones and Subtasks

### M1 — Issue Identity and Detail

- [ ] **M1.1 — Allocate numbers without reuse.** Replace `max(number) + 1` with a project-owned counter incremented atomically inside a transaction. Initialize it from the highest existing issue number and preserve existing numbers.
- [ ] **M1.2 — Display issue codes.** Use the fixed `I-` prefix with a minimum of four digits: `I-0001`, `I-9999`, `I-10000`. Codes are unique within a project, not across the workspace.
- [ ] **M1.3 — Number capacity.** Use PostgreSQL `bigint` and decimal strings in API contracts to avoid JavaScript precision loss. Update affected filters and sorting, and return a clear error at the storage limit. Do not impose a four-digit limit.
- [ ] **M1.4 — Stable URLs.** Add `/w/:organizationSlug/p/:projectSlug/issues/:issueCode`, for example `/w/acme/p/website/issues/I-0001`. Validate the `I-` code and resolve its decimal number within the project; redirect alternate padding to the canonical minimum-four-digit code. Keep UUIDs as internal identifiers. Renaming a project must not change issue codes.
- [ ] **M1.5 — Two detail entry paths.** Clicking an issue in a list, board, or saved view opens a wide overlay and updates the URL. Opening the link directly or refreshing renders a full detail page. Closing the overlay or navigating back restores filters, pagination, and scroll position.
- [ ] **M1.6 — Initial detail content.** Show code, title, existing description, status, priority, assignee, and timestamps. Reuse existing mutations and permissions, with loading, not-found, retry, and read-only states.
- [ ] **M1.7 — Sharing and search.** Add Copy link. Display the same issue code on lists, cards, and detail. Search accepts codes such as `I-0001`.

**Acceptance:** links can be shared and opened directly; concurrent creates cannot duplicate codes; deleting the highest-numbered issue never causes its number to be reused.

### M2 — Change History and Audit Log

Build two surfaces on a shared event foundation: an issue activity timeline and a workspace audit log. Existing application logs do not replace durable history.

- [ ] **M2.1 — Persist events.** Record actor, workspace/project/resource, action, server timestamp, request/event ID, and structured changes. Preserve enough information to identify a resource after deletion.
- [ ] **M2.2 — Cover existing mutations.** Capture workspace, project, issue, workflow-column, and saved-view create/update/delete operations, plus role/member changes and invitation operations.
- [ ] **M2.3 — Reliable recording.** Commit TeamOS mutations and their events in the same transaction. For Better Auth operations, use a server integration/hook at the confirmed mutation boundary, with reconciliation and deduplication. Logging after an HTTP response is not an audit guarantee.
- [ ] **M2.4 — Issue activity.** Anyone allowed to view an issue can read its history. Comments are added in M4.
- [ ] **M2.5 — Workspace audit page.** Owners and admins can filter by actor, action, resource, and time, with server-side pagination, at `/w/:organizationSlug/audit`. Provide no audit-record edit/delete controls.
- [ ] **M2.6 — Safe event data.** Never store tokens, secrets, or complete file/description/comment contents in audit records. Record change type and revision for content changes; store before/after status and assignee values for history and analytics.

**Limits:** history starts when recording is deployed. Do not fabricate historical events for existing data. Do not record every page view. The first version does not automatically expire audit records.

### M3 — Blockers

Convention: **A blocks B** means B must wait for A to finish.

- [ ] **M3.1 — Relationship model.** Support multiple blockers within the same project. Enforce tenant/project consistency, reject self-blocking and duplicate relationships, and prevent cycles.
- [ ] **M3.2 — Management permissions.** A user who can update the dependent issue can add/remove its blockers. Viewers can only read. No bypass permission in the first version.
- [ ] **M3.3 — Server rules.** A blocker is resolved when its status category is `completed` or `canceled`, regardless of the column name. Unresolved blockers prevent the dependent issue from transitioning to `started` or `completed`.
- [ ] **M3.4 — Allowed operations.** Continue allowing content, assignee, and priority edits, transitions back to not-started states, and cancellation. Reordering within the same column is not starting work.
- [ ] **M3.5 — Reopening and relationship changes.** Do not automatically change the status of a dependent issue already in progress or completed. Show it as blocked and record history. Recheck the rule on its next status transition.
- [ ] **M3.6 — UI.** Add Blocks and Blocked by sections with issue links. Show blocked indicators on lists/boards and explain rejected transitions.
- [ ] **M3.7 — Concurrency and deletion.** Check graph integrity and status within transactions using a consistent locking strategy. An issue referenced as another issue's blocker cannot be deleted until the relationship is explicitly removed. Apply the same rule to bulk deletion.

**Acceptance:** every update path, including drag-and-drop and direct API calls, enforces the same rules.

### M4 — Rich Content, Files, and Comments

Target a visual editor with Markdown shortcuts, following the writing experience described in [Linear's editor documentation](https://linear.app/docs/editor). Use [Tiptap](https://tiptap.dev/docs) with the necessary core/extensions; do not add an editor cloud service. Tiptap is the proposed implementation choice, not a claim about Linear's internal stack.

- [ ] **M4.1 — Editor foundation.** Support paragraphs, headings, bold/italic/strikethrough, lists/checklists, quotes, links, inline code, and code blocks, with selection-based formatting and Markdown shortcuts.
- [ ] **M4.2 — Content persistence.** Versioned JSON is the source of truth; maintain a plain-text projection for search. Convert existing descriptions into paragraphs without changing their text. Validate nodes/marks, limit payload size, and render safely.
- [ ] **M4.3 — Description saving.** Autosave after one second without typing, with saving/saved/error feedback. Use revisions to detect conflicts. Preserve drafts on failure and allow retry. Concurrent character-level editing is out of scope.
- [ ] **M4.4 — Storage foundation.** Store file metadata and ownership in PostgreSQL and objects in a private MinIO bucket. Upload/download through authorized APIs. Handle failed uploads and orphaned objects.
- [ ] **M4.5 — Editor attachments.** Pasted or dropped images show progress, retry, and preview. Other files appear as downloadable attachments. Store attachment IDs in content JSON, not expiring signed URLs.
- [ ] **M4.6 — Initial limits.** Accept PNG/JPEG/WebP/GIF images, PDF, TXT/MD, and ZIP files, up to 20 MiB per file. Validate file type on the server; serve non-image files as downloads.
- [ ] **M4.7 — Comments.** Provide a paginated timeline using the shared editor. Members, leads, owners, and admins can write; viewers can read. Authors can edit/delete their own comments; leads, owners, and admins can moderate. Preserve edited/deleted indicators.
- [ ] **M4.8 — History integration.** Record comment, attachment, and description-change events through M2.

**Later:** inline comments, threads, reactions, standalone documents, and collaborative text editing.

### M5 — Realtime and Notifications

- [ ] **M5.1 — Event delivery.** Define versioned events and persist a durable outbox alongside mutations. Use Redis pub/sub to distribute signals across API instances.
- [ ] **M5.2 — Transport.** Use SSE for server-to-browser updates; retain HTTP mutations. Scope subscriptions to the authorized workspace/project, validate sessions and permissions, and stop delivery when access is revoked.
- [ ] **M5.3 — UI synchronization.** Update issues, columns, views, comments, and membership through TanStack Query invalidation/refetch. Never overwrite an active editor draft.
- [ ] **M5.4 — Reconnection.** Deduplicate events and replay within the retained event window. Outside that window, require snapshot/refetch. PostgreSQL remains the source of truth.
- [ ] **M5.5 — Durable notifications.** Add an in-app inbox with read/unread state and issue links. Initially notify on assignment, comments on followed issues, and blocker changes affecting issues assigned to the recipient.
- [ ] **M5.6 — Subscriptions.** Authors and assignees follow by default. Anyone allowed to view can follow/unfollow. Do not notify the actor about their own action.

**Later:** email/push notifications, presence, and character-level editor synchronization.

### M6 — Progress and Workload Analytics

- [ ] **M6.1 — Metric definitions.** Provide snapshots by status/priority/assignee, blocked counts, and created/completed/reopened counts over a selected period. Count canceled separately from completed.
- [ ] **M6.2 — Time metrics.** Cycle time for one work episode runs from entry into `started` to entry into `completed`; reopening starts a new episode. Calculate only when sufficient history exists, never from `updatedAt` alone.
- [ ] **M6.3 — Project dashboard.** Show status distribution, created/completed trends, blocked work, and workload by assignee, with time and project filters.
- [ ] **M6.4 — API and charts.** Aggregate in SQL on the server and reuse the existing Recharts dependency. Owners, admins, and leads can view dashboards. Do not fetch every issue to calculate metrics in the browser.
- [ ] **M6.5 — Explain the data.** Display history coverage and metric definitions. Do not rank employees or treat completed issue counts as quality/productivity scores.

**Later:** burndown, velocity, and utilization. These require defined cycles, estimates, or capacity first.

### M7 — Project Chat

- [ ] Create one default channel per project. Read access follows project visibility; members, leads, owners, and admins can send messages.
- [ ] Persist messages in PostgreSQL, with pagination, edit/delete behavior, and attachments using M4.
- [ ] Reuse M5 delivery/reconnection. Redis is not the only message store.
- [ ] Add unread state and notifications with mute controls. Presence/typing indicators are ephemeral.

**Later:** direct messages, customizable channels, voice/video, and meeting schedules.

### M8 — Production Operations

- [ ] Back up PostgreSQL/MinIO and test restoration. Document deploy, migration, and rollback procedures.
- [ ] Add a durable invitation email outbox, retries, and duplicate-send handling.
- [ ] Review secrets, OAuth token storage, sensitive-session requirements, quotas, and rate limits.
- [ ] Monitor outbox delivery, SSE, uploads, database health, and API errors.
- [ ] Load-test realistic workloads. Existing local benchmarks are not production support guarantees.

Ownership transfer and self-service workspace leaving should become a separate milestone when prioritized, rather than being silently bundled into issue work.

## 3. Task Structure and Verification

- This roadmap defines product direction. Write a separate implementation plan for each milestone before coding; do not execute the entire roadmap in one pass.
- Infrastructure subtasks may be intermediate steps, but a milestone is complete only when its user-facing flow works end to end.
- Every new API has a contract in `packages/shared`, server-side authorization, and tenant isolation. Return `404` for resources the caller cannot see.
- Review schema migrations and convert existing data before enabling dependent UI.
- Run formatting, lint, type checking, tests, and builds. Run live isolation verification when tenant/permission behavior changes. Verify keyboard use, responsive layout, light/dark themes, and reduced motion.
- Required scenarios include concurrent number allocation; direct/back/refresh detail navigation; missing/duplicate audit events; blocker cycles/races/reopening; private files and failed uploads; editor conflicts; realtime reconnect/access revocation; and analytics with incomplete history.
- Update `docs/progress.md` after each completed milestone. Reconcile stale statements in `docs/infra-guide.md` when this roadmap is adopted; preserve unrelated user changes.

## 4. Agreed Decisions and Proposed Defaults

The user explicitly selected:

- Browser routes stay on `/w/:organizationSlug` and `/w/:organizationSlug/p/:projectSlug`. Old `/workspaces` routes stay unregistered.
- Audit captures data changes; workspace audit access belongs to owners/admins.
- Issue codes use `I-`, are unique within a project, and must keep increasing beyond four digits.
- Detail opens as an overlay with a URL; direct navigation opens a full page.
- Blockers stay within one project and prevent starting/completing dependent work. Reopening a blocker preserves the dependent issue's existing status.
- The editor should feel like Linear.
- Analytics focuses on progress and workload.

Implementation defaults proposed in this roadmap:

- Leave HTTP API routes and existing slugs unchanged. Issue detail is M1 and is not started.
- Never reuse allocated issue numbers; use a project counter with `bigint` storage and decimal-string contracts.
- Use Tiptap for the visual editor, private MinIO storage for attachments, SSE for initial realtime delivery, and the existing Recharts library for analytics.
- Preserve the TeamOS stack and architecture boundaries. Keep chat and schedules out of the initial issue-completion milestones.

These defaults are planning recommendations, not evidence of implemented functionality or permission to introduce unrelated product changes.
