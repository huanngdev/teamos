import { Navigate, Route, Routes } from "react-router";

import {
  AuthCompletePage,
  CreateWorkspacePage,
  InvitationPage,
  LoginPage,
  VerifyEmailPage,
  WorkspaceIndexPage,
  WorkspacePage,
} from "@/pages";

import { ProtectedLayout } from "./protected-layout";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />
      <Route element={<AuthCompletePage />} path="/auth/complete" />
      <Route element={<VerifyEmailPage />} path="/auth/verify-email" />
      <Route element={<InvitationPage />} path="/invitations/:invitationId" />
      <Route element={<ProtectedLayout />}>
        <Route element={<WorkspaceIndexPage />} path="/" />
        <Route element={<CreateWorkspacePage />} path="/new-workspace" />
        <Route element={<WorkspacePage />} path="/:organizationSlug" />
      </Route>
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}

export { AppRoutes };
