export { createEmailService, type EmailEnv } from "./create-email-service.js";
export type { EmailMessage, EmailService } from "./email-service.js";
export {
  buildOrganizationInvitationEmail,
  buildVerificationEmail,
  type EmailContent,
  type OrganizationInvitationEmailInput,
  type VerificationEmailInput,
} from "./email-templates.js";
export { createSmtpEmailService } from "./smtp-email-service.js";
export { createUnavailableEmailService } from "./unavailable-email-service.js";
