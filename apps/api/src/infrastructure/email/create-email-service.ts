import type { Env } from "@/config/index.js";

import type { EmailService } from "./email-service.js";
import { createSmtpEmailService } from "./smtp-email-service.js";
import { createUnavailableEmailService } from "./unavailable-email-service.js";

type EmailEnv = Pick<
  Env,
  "EMAIL_FROM" | "SMTP_HOST" | "SMTP_PASSWORD" | "SMTP_PORT" | "SMTP_SECURE" | "SMTP_USER"
>;

function createEmailService(env: EmailEnv): EmailService {
  if (
    env.SMTP_HOST === undefined ||
    env.SMTP_USER === undefined ||
    env.SMTP_PASSWORD === undefined ||
    env.EMAIL_FROM === undefined
  ) {
    return createUnavailableEmailService();
  }

  return createSmtpEmailService({
    from: env.EMAIL_FROM,
    host: env.SMTP_HOST,
    password: env.SMTP_PASSWORD,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
  });
}

export { createEmailService, type EmailEnv };
