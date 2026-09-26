import { Navigate, Route, Routes } from "react-router";

import { AccountLayout } from "@/layouts/account-layout";
import { ProjectLayout } from "@/layouts/project-layout";
import { ProtectedLayout } from "@/layouts/protected-layout";
import { WorkspaceLayout } from "@/layouts/workspace-layout";
import {
  AuthCompleteRoute,
  CreateWorkspaceRoute,
  InvitationRoute,
  LoginRoute,
  NotFoundRoute,
  ProfileRoute,
  VerifyEmailRoute,
  WorkspaceIndexRoute,
  ProjectIssuesRoute,
  ProjectOverviewRoute,
  WorkspaceMembersRoute,
  WorkspaceProjectsRoute,
  WorkspaceSettingsRoute,
} from "@/routes";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<LoginRoute />} path="/login" />
      <Route element={<AuthCompleteRoute />} path="/auth/complete" />
      <Route element={<VerifyEmailRoute />} path="/auth/verify-email" />
      <Route element={<InvitationRoute />} path="/invitations/:invitationId" />

      <Route element={<ProtectedLayout />}>
        <Route element={<WorkspaceIndexRoute />} path="/" />
        <Route element={<CreateWorkspaceRoute />} path="/workspaces/new" />

        <Route element={<AccountLayout />} path="/account">
          <Route element={<Navigate replace to="profile" />} index />
          <Route element={<ProfileRoute />} path="profile" />
        </Route>

        <Route
          element={<ProjectLayout />}
          path="/workspaces/:organizationSlug/projects/:projectSlug"
        >
          <Route element={<ProjectOverviewRoute />} index />
          <Route element={<ProjectIssuesRoute />} path="issues" />
        </Route>

        <Route element={<WorkspaceLayout />} path="/workspaces/:organizationSlug">
          <Route element={<Navigate replace to="projects" />} index />
          <Route element={<WorkspaceProjectsRoute />} path="projects" />
          <Route element={<WorkspaceMembersRoute />} path="members" />
          <Route element={<WorkspaceSettingsRoute />} path="settings" />
        </Route>
      </Route>

      <Route element={<NotFoundRoute />} path="*" />
    </Routes>
  );
}

export { AppRoutes };
