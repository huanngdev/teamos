import { Hono } from "hono";

import { getHealthStatus } from "../services/index.js";

const healthRoutes = new Hono().get("/", (context) => {
  return context.json(getHealthStatus());
});

export { healthRoutes };
