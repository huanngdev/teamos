import type { EmailMessage } from "./email-service.js";

type EmailContent = Omit<EmailMessage, "to">;

interface VerificationEmailInput {
  name: string;
  url: string;
}

interface OrganizationInvitationEmailInput {
  inviteLink: string;
  inviterName: string;
  organizationName: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createLayout(content: string): string {
  return [
    '<div style="background:#f4f4f5;padding:32px 16px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#18181b">',
    '<div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:32px">',
    '<p style="margin:0 0 24px;font-size:16px;font-weight:600;letter-spacing:-0.01em">TeamOS</p>',
    content,
    "</div>",
    '<p style="max-width:520px;margin:16px auto 0;font-size:12px;color:#71717a">',
    "You received this message because of activity on your TeamOS account.",
    "</p>",
    "</div>",
  ].join("");
}

function createButton(url: string, label: string): string {
  return [
    `<a href="${escapeHtml(url)}" style="display:inline-block;background:#18181b;color:#fafafa;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500">`,
    escapeHtml(label),
    "</a>",
  ].join("");
}

function buildVerificationEmail(input: VerificationEmailInput): EmailContent {
  const recipientName = input.name.trim() || "there";

  return {
    html: createLayout(
      [
        `<h1 style="margin:0 0 12px;font-size:20px;font-weight:600">Verify your email</h1>`,
        `<p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46">Hi ${escapeHtml(recipientName)}, confirm this email address to finish signing in to TeamOS.</p>`,
        createButton(input.url, "Verify email"),
        `<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#71717a">If you did not request this, you can ignore this email. The link expires shortly.</p>`,
      ].join(""),
    ),
    subject: "Verify your email for TeamOS",
    text: [
      `Hi ${recipientName},`,
      "",
      "Confirm this email address to finish signing in to TeamOS:",
      input.url,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
  };
}

function buildOrganizationInvitationEmail(input: OrganizationInvitationEmailInput): EmailContent {
  return {
    html: createLayout(
      [
        `<h1 style="margin:0 0 12px;font-size:20px;font-weight:600">Join ${escapeHtml(input.organizationName)}</h1>`,
        `<p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46">${escapeHtml(input.inviterName)} invited you to collaborate in ${escapeHtml(input.organizationName)} on TeamOS.</p>`,
        createButton(input.inviteLink, "Accept invitation"),
        `<p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#71717a">Sign in with the email address that received this invitation. The invitation expires in 48 hours.</p>`,
      ].join(""),
    ),
    subject: `Join ${input.organizationName} on TeamOS`,
    text: [
      `${input.inviterName} invited you to collaborate in ${input.organizationName} on TeamOS.`,
      "",
      "Accept the invitation:",
      input.inviteLink,
      "",
      "Sign in with the email address that received this invitation. The invitation expires in 48 hours.",
    ].join("\n"),
  };
}

export {
  buildOrganizationInvitationEmail,
  buildVerificationEmail,
  type EmailContent,
  type OrganizationInvitationEmailInput,
  type VerificationEmailInput,
};
