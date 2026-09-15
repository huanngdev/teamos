import { bootstrap } from "@/bootstrap.js";
import { loadEnv } from "@/config/index.js";
import { createLogger } from "@/logging/index.js";

function isAddressInUseError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EADDRINUSE";
}

async function start(): Promise<void> {
  let env;
  try {
    env = loadEnv();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
    return;
  }

  const logger = createLogger(env);
  try {
    const runningApi = await bootstrap({ env, logger });
    let isShuttingDown = false;

    const shutdown = async (signal: string): Promise<void> => {
      if (isShuttingDown) {
        return;
      }

      isShuttingDown = true;
      await runningApi.shutdown(signal);
    };

    process.once("SIGINT", () => {
      void shutdown("SIGINT");
    });
    process.once("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
  } catch (error) {
    if (isAddressInUseError(error)) {
      logger
        .withMetadata({ port: env.PORT })
        .error("TeamOS API could not start because the configured port is already in use");
    } else {
      logger.withError(error).error("TeamOS API failed to start");
    }
    process.exit(1);
  }
}

void start();
