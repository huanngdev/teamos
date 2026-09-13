import { redactionPlugin } from "@loglayer/plugin-redaction";
import { getSimplePrettyTerminal, moonlight } from "@loglayer/transport-simple-pretty-terminal";
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

function createLogger(env: Pick<Env, "LOG_LEVEL" | "NODE_ENV">): LogLayer {
  const transport =
    env.NODE_ENV === "production"
      ? new StructuredTransport({
          logger: console,
          level: env.LOG_LEVEL,
          messageField: "msg",
          dateField: "time",
          levelField: "level",
          stringify: true,
        })
      : getSimplePrettyTerminal({
          level: env.LOG_LEVEL,
          runtime: "node",
          theme: moonlight,
          timestampFormat: "HH:mm:ss.SSS",
          viewMode: "expanded",
        });

  return new LogLayer({
    errorSerializer: serializeError,
    plugins: [
      redactionPlugin({
        paths: sensitiveLogPaths,
      }),
    ],
    transport,
  });
}

export { createLogger };
