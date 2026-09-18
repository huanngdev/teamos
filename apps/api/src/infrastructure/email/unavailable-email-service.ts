import type { EmailService } from "./email-service.js";

function createUnavailableEmailService(): EmailService {
  return {
    send: async () => {
      throw new Error(
        "Email delivery is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM to send authentication email.",
      );
    },
  };
}

export { createUnavailableEmailService };
