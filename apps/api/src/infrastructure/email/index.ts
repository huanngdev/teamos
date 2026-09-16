export { createEmailService, type EmailEnv } from "./create-email-service.js";
export type { EmailMessage, EmailService } from "./email-service.js";
export {
  buildOrganizationInvitationEmail,
  buildVerificationEmail,
  type EmailContent,
  type OrganizationInvitationEmailInput,
  type VerificationEmailInput,
} from "./email-templates.js";
export { createResendEmailService } from "./resend-email-service.js";
export { createUnavailableEmailService } from "./unavailable-email-service.js";
