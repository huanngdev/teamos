import { MockLogLayer } from "loglayer";

import { createAuth } from "./auth.js";
import { loadEnv } from "../config/index.js";
import type { EmailService } from "../infrastructure/email/index.js";

/*
 * Better Auth CLI configuration used only to generate the Drizzle schema.
 * The CLI runs under Node, so it must not construct the Bun-based database
 * client. Pass `--adapter drizzle --dialect postgresql` when generating.
 */
const emailService: EmailService = {
  send: async () => {},
};

const env = loadEnv();

const auth = createAuth({
  emailService,
  env,
  logger: new MockLogLayer(),
});

export { auth };
