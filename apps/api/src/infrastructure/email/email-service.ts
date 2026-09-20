interface EmailMessage {
  html: string;
  subject: string;
  text: string;
  to: string;
}

interface EmailService {
  send: (message: EmailMessage) => Promise<void>;
}

export type { EmailMessage, EmailService };
