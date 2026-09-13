import { z } from "zod";

const logLevels = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

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

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4001),
  DATABASE_URL: z.url().default("postgresql://teamos:teamos@localhost:5432/teamos"),
  REDIS_URL: z.url().default("redis://:teamos@localhost:6379"),
  MINIO_ENDPOINT: z.url().default("http://localhost:9000"),
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
  RATE_LIMIT_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  RATE_LIMIT_POINTS: z.coerce.number().int().min(1).default(300),
  RATE_LIMIT_DURATION_SECONDS: z.coerce.number().int().min(1).default(60),
});

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

  return result.data;
}
