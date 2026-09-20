import { Scalar } from "@scalar/hono-api-reference";
import type { OpenAPIHono } from "@hono/zod-openapi";

import type { AppEnv } from "@/types.js";

function registerApiDocumentation(app: OpenAPIHono<AppEnv>, enabled: boolean): void {
  if (!enabled) {
    return;
  }

  app.openAPIRegistry.registerComponent("securitySchemes", "sessionCookie", {
    description:
      "Better Auth session cookie. The cookie name gains a `__Secure-` prefix when secure cookies are enabled in production.",
    in: "cookie",
    name: "better-auth.session_token",
    type: "apiKey",
  });

  app.doc31("/openapi.json", (context) => ({
    info: {
      description:
        "The TeamOS HTTP API for organizations, projects, issues, collaboration, and schedules.",
      title: "TeamOS API",
      version: "0.1.0",
    },
    openapi: "3.1.0",
    servers: [
      {
        description: "Current API origin",
        url: new URL(context.req.url).origin,
      },
    ],
    tags: [
      { description: "Application and dependency health.", name: "System" },
      { description: "Sign-in, session, and identity.", name: "Authentication" },
      { description: "Organization workspace access.", name: "Organizations" },
    ],
  }));
  app.get(
    "/docs",
    Scalar({
      pageTitle: "TeamOS API Reference",
      theme: "deepSpace",
      url: "/openapi.json",
    }),
  );
}

export { registerApiDocumentation };
