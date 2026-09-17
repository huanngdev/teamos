import type { ILogLayer } from "loglayer";
import type { OpenAPIHono } from "@hono/zod-openapi";

import type { OrganizationAccessService } from "@/auth/index.js";
import type { AppEnv } from "@/types.js";
import type {
  OrganizationManagementService,
  OrganizationMemberService,
  ProjectService,
} from "@/services/index.js";

type OrganizationRoutes = OpenAPIHono<AppEnv>;

interface OrganizationRouteDependencies {
  logger: ILogLayer;
  management: OrganizationManagementService;
  members: OrganizationMemberService;
  organizationAccess: OrganizationAccessService;
  projects: ProjectService;
}

export type { OrganizationRouteDependencies, OrganizationRoutes };
