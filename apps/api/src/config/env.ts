import { z } from "zod";

const logLevels = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

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
      "postgresql://teamos:teamos@localhost:5432/teamos",
    ),
    REDIS_URL: urlWithProtocols(["redis:", "rediss:"]).default("redis://:teamos@localhost:6379"),
    MINIO_ENDPOINT: urlWithProtocols(["http:", "https:"]).default("http://localhost:9000"),
    MINIO_ACCESS_KEY: z.string().min(1).default("teamos"),
    MINIO_SECRET_KEY: z.string().min(1).default("teamosminio"),
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
  })
  .transform((value) => ({
    ...value,
    API_DOCS_ENABLED:
      value.API_DOCS_ENABLED === undefined
        ? value.NODE_ENV !== "production"
        : value.API_DOCS_ENABLED === "true",
  }));

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: Record<string, string | undefined> = Bun.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const path = issue.path.join(".");
        return `  - ${path || "(root)"}: ${issue.message}`;
      })
      .join("\n");

    throw new Error(`Invalid environment variables in apps/api/.env:\n${issues}`);
  }

  if (result.data.NODE_ENV === "production") {
    const requiredProductionVariables = [
      "DATABASE_URL",
      "REDIS_URL",
      "MINIO_ENDPOINT",
      "MINIO_ACCESS_KEY",
      "MINIO_SECRET_KEY",
    ];
    const missingVariables = requiredProductionVariables.filter((variable) => !source[variable]);

    if (missingVariables.length > 0) {
      throw new Error(
        `Invalid environment variables in apps/api/.env:\n  - Missing production variables: ${missingVariables.join(", ")}`,
      );
    }
  }

  return result.data;
}
