import type { EmailService } from "./email-service.js";

function createUnavailableEmailService(): EmailService {
  return {
    send: async () => {
      throw new Error(
        "Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL to send authentication email.",
      );
    },
  };
}

export { createUnavailableEmailService };
