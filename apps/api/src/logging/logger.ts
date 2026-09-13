import { redactionPlugin } from "@loglayer/plugin-redaction";
import { LogLayer, StructuredTransport } from "loglayer";
import { serializeError } from "serialize-error";

import type { Env } from "@/config/index.js";

const sensitiveLogPaths = [
  "authorization",
  "cookie",
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "sessionToken",
  "secret",
  "apiKey",
];

function createLogger(env: Pick<Env, "LOG_LEVEL">): LogLayer {
  return new LogLayer({
    errorSerializer: serializeError,
    plugins: [
      redactionPlugin({
        paths: sensitiveLogPaths,
      }),
    ],
    transport: new StructuredTransport({
      logger: console,
      level: env.LOG_LEVEL,
      messageField: "msg",
      dateField: "time",
      levelField: "level",
      stringify: true,
    }),
  });
}

export { createLogger };
