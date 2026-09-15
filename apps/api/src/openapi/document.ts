import { Scalar } from "@scalar/hono-api-reference";
import type { OpenAPIHono } from "@hono/zod-openapi";

import type { AppEnv } from "@/types.js";

function registerApiDocumentation(app: OpenAPIHono<AppEnv>, enabled: boolean): void {
  if (!enabled) {
    return;
  }

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
    tags: [{ description: "Application and dependency health.", name: "System" }],
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
