import { z } from "zod";

const logLevels = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

const socialProviderCredentialPairs = [
  ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
] as const;

const requiredProductionVariables = [
  "DATABASE_URL",
  "REDIS_URL",
  "MINIO_ENDPOINT",
  "MINIO_ACCESS_KEY",
  "MINIO_SECRET_KEY",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "WEB_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
] as const;

function urlWithProtocols(protocols: readonly string[]) {
  return z.url().refine((value) => protocols.includes(new URL(value).protocol), {
    message: `URL must use one of: ${protocols.join(", ")}.`,
  });
}

const corsOriginsSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    return value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  },
  z.array(z.url()).min(1).default(["http://localhost:4000"]),
);

const envSchema = z
  .object({
    API_DOCS_ENABLED: z.enum(["true", "false"]).optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4001),
    DATABASE_URL: urlWithProtocols(["postgres:", "postgresql:"]).default(
      "postgresql://teamos_user:teamos_password@localhost:5432/teamos",
    ),
    REDIS_URL: urlWithProtocols(["redis:", "rediss:"]).default(
      "redis://:teamos_password@localhost:6379",
    ),
    MINIO_ENDPOINT: urlWithProtocols(["http:", "https:"]).default("http://localhost:9000"),
    MINIO_ACCESS_KEY: z.string().min(1).default("teamos_user"),
    MINIO_SECRET_KEY: z.string().min(1).default("teamos_password"),
    MINIO_REGION: z.string().min(1).default("us-east-1"),
    CORS_ORIGINS: corsOriginsSchema,
    LOG_LEVEL: z.enum(logLevels).default("info"),
    MAX_REQUEST_BODY_BYTES: z.coerce
      .number()
      .int()
      .min(1)
      .max(128 * 1024 * 1024)
      .default(1024 * 1024),
    REQUEST_TIMEOUT_MS: z.coerce.number().int().min(100).max(120_000).default(15_000),
    IDLE_TIMEOUT_SECONDS: z.coerce.number().int().min(1).max(255).default(30),
    STARTUP_TIMEOUT_MS: z.coerce.number().int().min(100).max(120_000).default(10_000),
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(100).max(120_000).default(10_000),
    RATE_LIMIT_ENABLED: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    RATE_LIMIT_POINTS: z.coerce.number().int().min(1).default(300),
    RATE_LIMIT_DURATION_SECONDS: z.coerce.number().int().min(1).default(60),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32)
      .default("teamos-development-auth-secret-change-before-production"),
    BETTER_AUTH_URL: urlWithProtocols(["http:", "https:"]).default("http://localhost:4001"),
    WEB_URL: urlWithProtocols(["http:", "https:"]).default("http://localhost:4000"),
    MAX_ORGANIZATIONS_PER_USER: z.coerce.number().int().min(1).max(1_000).default(3),
    MAX_ORGANIZATION_MEMBERS: z.coerce.number().int().min(1).max(10_000).default(100),
    MAX_PENDING_INVITATIONS: z.coerce.number().int().min(1).max(1_000).default(50),
    MANAGEMENT_RATE_LIMIT_POINTS: z.coerce.number().int().min(1).max(10_000).default(30),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().min(1).optional(),
  })
  .superRefine((value, context) => {
    for (const [idKey, secretKey] of socialProviderCredentialPairs) {
      const identifier = value[idKey];
      const secret = value[secretKey];

      if ((identifier === undefined) !== (secret === undefined)) {
        context.addIssue({
          code: "custom",
          message: `${idKey} and ${secretKey} must be configured together.`,
          path: [idKey],
        });
      }
    }

    if ((value.RESEND_API_KEY === undefined) !== (value.RESEND_FROM_EMAIL === undefined)) {
      context.addIssue({
        code: "custom",
        message: "RESEND_API_KEY and RESEND_FROM_EMAIL must be configured together.",
        path: ["RESEND_API_KEY"],
      });
    }
  })
  .transform((value) => ({
    ...value,
    API_DOCS_ENABLED:
      value.API_DOCS_ENABLED === undefined
        ? value.NODE_ENV !== "production"
        : value.API_DOCS_ENABLED === "true",
  }));

export type Env = z.infer<typeof envSchema>;

function formatIssues(issues: readonly z.core.$ZodIssue[]): string {
  return issues
    .map((issue) => {
      const path = issue.path.join(".");
      return `  - ${path || "(root)"}: ${issue.message}`;
    })
    .join("\n");
}

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Invalid environment variables in apps/api/.env:\n${formatIssues(result.error.issues)}`,
    );
  }

  if (result.data.NODE_ENV === "production") {
    const missingVariables = requiredProductionVariables.filter((variable) => !source[variable]);

    if (missingVariables.length > 0) {
      throw new Error(
        `Invalid environment variables in apps/api/.env:\n  - Missing production variables: ${missingVariables.join(", ")}`,
      );
    }
  }

  return result.data;
}
