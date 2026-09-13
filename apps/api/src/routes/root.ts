import { Hono } from "hono";

const rootRoutes = new Hono().get("/", (context) => {
  return context.json({
    name: "TeamOS API",
    status: "ok",
  });
});

export { rootRoutes };
