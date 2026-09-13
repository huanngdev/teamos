import { app } from "./app.js";
import { getPort } from "./config/index.js";

const port = getPort();

Bun.serve({
  fetch: app.fetch,
  port,
});

console.info(`TeamOS API is running on http://localhost:${port}`);
