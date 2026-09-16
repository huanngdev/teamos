import type { Env } from "@/config/index.js";

import type { EmailService } from "./email-service.js";
import { createResendEmailService } from "./resend-email-service.js";
import { createUnavailableEmailService } from "./unavailable-email-service.js";

type EmailEnv = Pick<Env, "RESEND_API_KEY" | "RESEND_FROM_EMAIL">;

function createEmailService(env: EmailEnv): EmailService {
  if (env.RESEND_API_KEY === undefined || env.RESEND_FROM_EMAIL === undefined) {
    return createUnavailableEmailService();
  }

  return createResendEmailService({
    apiKey: env.RESEND_API_KEY,
    from: env.RESEND_FROM_EMAIL,
  });
}

export { createEmailService, type EmailEnv };
