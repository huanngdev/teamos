import { Navigate, Route, Routes } from "react-router";

import { ProtectedLayout } from "@/layouts/protected-layout";
import { WorkspaceLayout } from "@/layouts/workspace-layout";
import {
  AuthCompleteRoute,
  CreateWorkspaceRoute,
  InvitationRoute,
  LoginRoute,
  NotFoundRoute,
  VerifyEmailRoute,
  WorkspaceIndexRoute,
  WorkspaceMembersRoute,
  WorkspaceProjectsRoute,
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
        <Route element={<WorkspaceLayout />} path="/workspaces/:organizationSlug">
          <Route element={<Navigate replace to="projects" />} index />
          <Route element={<WorkspaceProjectsRoute />} path="projects" />
          <Route element={<WorkspaceMembersRoute />} path="members" />
        </Route>
      </Route>

      <Route element={<NotFoundRoute />} path="*" />
    </Routes>
  );
}

export { AppRoutes };
