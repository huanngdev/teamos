import { Hono } from "hono";

import { healthRoutes, rootRoutes } from "./routes/index.js";

const app = new Hono();

app.route("/", rootRoutes);
app.route("/health", healthRoutes);

export { app };
