import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(4001),
  DATABASE_URL: z.url().default("postgresql://teamos:teamos@localhost:5432/teamos"),
  REDIS_URL: z.url().default("redis://:teamos@localhost:6379"),
  MINIO_ENDPOINT: z.url().default("http://localhost:9000"),
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
