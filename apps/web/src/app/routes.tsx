import { Navigate, type RouteObject } from "react-router";

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
import { PageLoading } from "@/shared/components/page-loading";
import { RouteError } from "./route-error";

/*
 * The root is a pathless route so one error boundary and one hydration
 * fallback cover every URL, including the public auth screens and the splat.
 */
const routes: RouteObject[] = [
  {
    HydrateFallback: PageLoading,
    errorElement: <RouteError />,
    children: [
      {
        path: "/login",
        lazy: () => import("@/routes/login-route").then((m) => ({ Component: m.LoginRoute })),
      },
      {
        path: "/auth/complete",
        lazy: () =>
          import("@/routes/auth-complete-route").then((m) => ({
            Component: m.AuthCompleteRoute,
          })),
      },
      {
        path: "/auth/verify-email",
        lazy: () =>
          import("@/routes/verify-email-route").then((m) => ({
            Component: m.VerifyEmailRoute,
          })),
      },
      {
        path: "/invitations/:invitationId",
        lazy: () =>
          import("@/routes/invitation-route").then((m) => ({
            Component: m.InvitationRoute,
          })),
      },
      {
        errorElement: <RouteError />,
        lazy: () =>
          import("@/layouts/protected-layout").then((m) => ({
            Component: m.ProtectedLayout,
          })),
        children: [
          {
            index: true,
            lazy: () =>
              import("@/routes/workspace-index-route").then((m) => ({
                Component: m.WorkspaceIndexRoute,
              })),
          },
          {
            /*
             * `/w/new` is creation. A workspace whose slug is `new` stays
             * reachable at `/w/new/projects`, `/members`, and `/settings`,
             * because this static route does not swallow those longer paths.
             */
            path: createWorkspacePath,
            lazy: () =>
              import("@/routes/create-workspace-route").then((m) => ({
                Component: m.CreateWorkspaceRoute,
              })),
          },
          {
            path: "/account",
            errorElement: <RouteError />,
            lazy: () =>
              import("@/layouts/account-layout").then((m) => ({
                Component: m.AccountLayout,
              })),
            children: [
              { index: true, element: <Navigate replace to="profile" /> },
              {
                path: "profile",
                lazy: () =>
                  import("@/routes/profile-route").then((m) => ({
                    Component: m.ProfileRoute,
                  })),
              },
            ],
          },
          {
            path: projectRoutePattern,
            errorElement: <RouteError />,
            lazy: () =>
              import("@/layouts/project-layout").then((m) => ({
                Component: m.ProjectLayout,
              })),
            children: [
              {
                index: true,
                lazy: () =>
                  import("@/routes/project-overview-route").then((m) => ({
                    Component: m.ProjectOverviewRoute,
                  })),
              },
              {
                path: projectBoardSegment,
                lazy: () =>
                  import("@/routes/project-board-route").then((m) => ({
                    Component: m.ProjectBoardRoute,
                  })),
              },
              {
                path: projectIssuesSegment,
                lazy: () =>
                  import("@/routes/project-issues-route").then((m) => ({
                    Component: m.ProjectIssuesRoute,
                  })),
              },
              {
                path: `${projectIssuesSegment}/:issueCode`,
                lazy: () =>
                  import("@/routes/project-issue-route").then((m) => ({
                    Component: m.ProjectIssueRoute,
                  })),
              },
              {
                path: projectViewSegment,
                lazy: () =>
                  import("@/routes/project-view-route").then((m) => ({
                    Component: m.ProjectViewRoute,
                  })),
              },
              {
                path: projectViewsSegment,
                lazy: () =>
                  import("@/routes/project-views-route").then((m) => ({
                    Component: m.ProjectViewsRoute,
                  })),
              },
              {
                path: projectSettingsSegment,
                lazy: () =>
                  import("@/routes/project-settings-route").then((m) => ({
                    Component: m.ProjectSettingsRoute,
                  })),
              },
            ],
          },
          {
            path: workspaceRoutePattern,
            errorElement: <RouteError />,
            lazy: () =>
              import("@/layouts/workspace-layout").then((m) => ({
                Component: m.WorkspaceLayout,
              })),
            children: [
              {
                index: true,
                element: <Navigate replace to={workspaceProjectsSegment} />,
              },
              {
                path: workspaceProjectsSegment,
                lazy: () =>
                  import("@/routes/workspace-projects-route").then((m) => ({
                    Component: m.WorkspaceProjectsRoute,
                  })),
              },
              {
                path: workspaceMembersSegment,
                lazy: () =>
                  import("@/routes/workspace-members-route").then((m) => ({
                    Component: m.WorkspaceMembersRoute,
                  })),
              },
              {
                path: workspaceSettingsSegment,
                lazy: () =>
                  import("@/routes/workspace-settings-route").then((m) => ({
                    Component: m.WorkspaceSettingsRoute,
                  })),
              },
            ],
          },
        ],
      },
      {
        path: "*",
        lazy: () =>
          import("@/routes/not-found-route").then((m) => ({
            Component: m.NotFoundRoute,
          })),
      },
    ],
  },
];

export { routes };
