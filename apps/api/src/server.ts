import { app } from "./app.js";
import { loadEnv } from "./config/index.js";

function isAddressInUseError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EADDRINUSE";
}

function reportStartupFailure(error: unknown): never {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

let port: number;
try {
  port = loadEnv().PORT;
} catch (error) {
  reportStartupFailure(error);
}

try {
  Bun.serve({
    fetch: app.fetch,
    port,
  });

  console.info(`TeamOS API is running on http://localhost:${port}`);
} catch (error) {
  if (!isAddressInUseError(error)) {
    throw error;
  }

  reportStartupFailure(
    new Error(
      `TeamOS API could not start because port ${port} is already in use. ` +
        `Stop the process using it or run with PORT=<free-port> bun run --cwd apps/api dev.`,
    ),
  );
}
