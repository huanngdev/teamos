import { Navigate, Route, Routes } from "react-router";

import { projectBoardSegment, projectIssuesSegment } from "@/features/issues";
import { projectRoutePattern, projectSettingsSegment } from "@/features/projects";
import { projectViewSegment, projectViewsSegment } from "@/features/views";
import {
  createWorkspacePath,
  workspaceMembersSegment,
  workspaceProjectsSegment,
  workspaceRoutePattern,
  workspaceSettingsSegment,
} from "@/features/workspaces";
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
  ProjectBoardRoute,
  ProjectIssuesRoute,
  ProjectViewRoute,
  ProjectViewsRoute,
  ProjectOverviewRoute,
  ProjectSettingsRoute,
  WorkspaceMembersRoute,
  WorkspaceProjectsRoute,
  WorkspaceSettingsRoute,
} from "@/routes";
import { ProjectIssueRoute } from "@/routes/project-issue-route";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<LoginRoute />} path="/login" />
      <Route element={<AuthCompleteRoute />} path="/auth/complete" />
      <Route element={<VerifyEmailRoute />} path="/auth/verify-email" />
      <Route element={<InvitationRoute />} path="/invitations/:invitationId" />

      <Route element={<ProtectedLayout />}>
        <Route element={<WorkspaceIndexRoute />} path="/" />
        {/*
         * `/w/new` is creation. A workspace whose slug is `new` stays reachable
         * at `/w/new/projects`, `/members`, and `/settings`, because this static
         * route does not swallow those longer paths.
         */}
        <Route element={<CreateWorkspaceRoute />} path={createWorkspacePath} />

        <Route element={<AccountLayout />} path="/account">
          <Route element={<Navigate replace to="profile" />} index />
          <Route element={<ProfileRoute />} path="profile" />
        </Route>

        <Route element={<ProjectLayout />} path={projectRoutePattern}>
          <Route element={<ProjectOverviewRoute />} index />
          <Route element={<ProjectBoardRoute />} path={projectBoardSegment} />
          <Route element={<ProjectIssuesRoute />} path={projectIssuesSegment} />
          <Route element={<ProjectIssueRoute />} path={`${projectIssuesSegment}/:issueCode`} />
          <Route element={<ProjectViewRoute />} path={projectViewSegment} />
          <Route element={<ProjectViewsRoute />} path={projectViewsSegment} />
          <Route element={<ProjectSettingsRoute />} path={projectSettingsSegment} />
        </Route>

        <Route element={<WorkspaceLayout />} path={workspaceRoutePattern}>
          <Route element={<Navigate replace to={workspaceProjectsSegment} />} index />
          <Route element={<WorkspaceProjectsRoute />} path={workspaceProjectsSegment} />
          <Route element={<WorkspaceMembersRoute />} path={workspaceMembersSegment} />
          <Route element={<WorkspaceSettingsRoute />} path={workspaceSettingsSegment} />
        </Route>
      </Route>

      <Route element={<NotFoundRoute />} path="*" />
    </Routes>
  );
}

export { AppRoutes };
