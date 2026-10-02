# Project settings

Status: implemented.

Branch: current working branch. No new permission model, schema owner, or library.

Parent: the first recommended step in `docs/progress.md`. Issue links and "Assigned to me" are the following product step and are not part of this work.

`updateProjectRequestSchema` accepts only `name`, `description`, and `visibility`. A slug sent on update is stripped. The slug stays immutable.

## What the screen does

Route: `/workspaces/:organizationSlug/projects/:projectSlug/settings`, a child of the existing project layout.

A lead, or an organization owner or admin, can change:

- Name, trimmed, 1–80 characters.
- Description, trimmed, at most 500 characters. A blank description is sent as `null`.
- Visibility, `workspace` or `private`, with the same Select the create-project dialog uses.

The slug is shown in a disabled input and is never submitted.

One Save button sends one `PATCH` containing only the fields that changed. Save stays disabled until something changed and the trimmed name is non-empty.

An organization owner or admin also sees a danger zone. Deleting requires typing the current project name. Success returns to that workspace's project list.

A project member or viewer does not see the Settings item. Opening the URL directly sends them to the project overview. Someone who cannot see the project at all gets the existing not-found state.

## What it does not do

- No slug rename, archive, transfer, or audit table.
- No project-member management on this screen.
- No issue URL, "Assigned to me", labels, list view, comments, or realtime.
- No new role. `canPerformProjectAction` stays the permission matrix. A lead can update and cannot delete. An organization owner or admin can do both.

## API

`DELETE /api/organizations/{slug}/projects/{projectId}` requires:

```ts
const deleteProjectRequestSchema = z.object({
  confirmationName: z.string().min(1).max(80),
});
```

The comparison is exact, against the locked project name. A mismatch is `422 VALIDATION_ERROR`. A lead who can see the project still receives `403` before that comparison. An invisible project stays `404`.

Inside the delete transaction, issues for that organization and project are deleted first, then the project row. Memberships and columns cascade. `issue_status_fk` stays `ON DELETE RESTRICT`. There is no migration.

## Files

- `packages/shared/src/contracts/project.ts`
- `apps/api/src/services/projects.ts`
- `apps/api/src/routes/projects.ts`
- `apps/api/scripts/verify-organization-isolation.ts`
- `apps/web/src/features/projects/hooks/use-project-settings.ts`
- `apps/web/src/features/projects/components/project-settings-panel.tsx`
- `apps/web/src/features/projects/components/project-danger-zone.tsx`
- `apps/web/src/routes/project-settings-route.tsx`
- `apps/web/src/layouts/use-project-layout.ts`
- `apps/web/src/features/projects/components/project-sidebar.tsx`
