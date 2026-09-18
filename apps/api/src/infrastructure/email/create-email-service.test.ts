import { expect, test } from "bun:test";

import { createEmailService, type EmailEnv } from "./create-email-service.js";

const configuredEnv: EmailEnv = {
  EMAIL_FROM: "TeamOS <notifications@example.com>",
  SMTP_HOST: "smtp.gmail.com",
  SMTP_PASSWORD: "gmail-app-password",
  SMTP_PORT: 465,
  SMTP_SECURE: true,
  SMTP_USER: "notifications@example.com",
};

const unconfiguredEnv: EmailEnv = {
  EMAIL_FROM: undefined,
  SMTP_HOST: undefined,
  SMTP_PASSWORD: undefined,
  SMTP_PORT: 465,
  SMTP_SECURE: true,
  SMTP_USER: undefined,
};

test("returns an unavailable service when SMTP is not configured", async () => {
  const service = createEmailService(unconfiguredEnv);

  await expect(
    service.send({ html: "<p>hi</p>", subject: "Verify", text: "hi", to: "ada@example.com" }),
  ).rejects.toThrow("Email delivery is not configured");
});

test("creates an SMTP-backed service when SMTP is configured", () => {
  const service = createEmailService(configuredEnv);

  expect(typeof service.send).toBe("function");
});
