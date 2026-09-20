import nodemailer from "nodemailer";

import type { EmailService } from "./email-service.js";

interface CreateSmtpEmailServiceOptions {
  from: string;
  host: string;
  password: string;
  port: number;
  secure: boolean;
  user: string;
}

function createSmtpEmailService(options: CreateSmtpEmailServiceOptions): EmailService {
  const transporter = nodemailer.createTransport({
    auth: {
      user: options.user,
      pass: options.password,
    },
    host: options.host,
    port: options.port,
    secure: options.secure,
  });

  return {
    send: async (message) => {
      await transporter.sendMail({
        from: options.from,
        html: message.html,
        subject: message.subject,
        text: message.text,
        to: message.to,
      });
    },
  };
}

export { createSmtpEmailService };
