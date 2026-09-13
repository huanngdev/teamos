import { Hono } from "hono";
import { rootResponseSchema } from "@teamos/shared";

const rootRoutes = new Hono().get("/", (context) => {
  const response = rootResponseSchema.parse({
    name: "TeamOS API",
    status: "ok",
  });

  return context.json(response);
});

export { rootRoutes };
