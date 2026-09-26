import type { ILogLayer } from "loglayer";
import type { OpenAPIHono } from "@hono/zod-openapi";

import type { OrganizationAccessService } from "@/auth/index.js";
import type { AppEnv } from "@/types.js";
import type {
  IssueService,
  OrganizationManagementService,
  OrganizationMemberService,
  ProjectService,
  ProjectStatusService,
} from "@/services/index.js";

type OrganizationRoutes = OpenAPIHono<AppEnv>;

interface OrganizationRouteDependencies {
  issues: IssueService;
  logger: ILogLayer;
  management: OrganizationManagementService;
  members: OrganizationMemberService;
  organizationAccess: OrganizationAccessService;
  projectStatuses: ProjectStatusService;
  projects: ProjectService;
}

export type { OrganizationRouteDependencies, OrganizationRoutes };
