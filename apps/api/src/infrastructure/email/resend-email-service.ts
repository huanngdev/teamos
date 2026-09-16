import { Resend } from "resend";

import type { EmailService } from "./email-service.js";

interface CreateResendEmailServiceOptions {
  apiKey: string;
  from: string;
}

function createResendEmailService(options: CreateResendEmailServiceOptions): EmailService {
  const resend = new Resend(options.apiKey);

  return {
    send: async (message) => {
      const result = await resend.emails.send({
        from: options.from,
        html: message.html,
        subject: message.subject,
        text: message.text,
        to: message.to,
      });

      if (result.error !== null) {
        throw new Error(`The email provider rejected the message: ${result.error.message}`);
      }
    },
  };
}

export { createResendEmailService };
