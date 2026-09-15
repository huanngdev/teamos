import { z } from "zod";

const healthStatusSchema = z.object({
  service: z.literal("api"),
  status: z.literal("ok"),
  timestamp: z.iso.datetime(),
});

const readinessDependencySchema = z.object({
  status: z.enum(["ok", "error"]),
});

const readinessStatusSchema = z.object({
  dependencies: z.object({
    database: readinessDependencySchema,
    redis: readinessDependencySchema,
    storage: readinessDependencySchema,
  }),
  service: z.literal("api"),
  status: z.enum(["ok", "error"]),
  timestamp: z.iso.datetime(),
});

type HealthStatus = z.infer<typeof healthStatusSchema>;
type ReadinessDependencies = z.infer<typeof readinessStatusSchema>["dependencies"];
type ReadinessStatus = z.infer<typeof readinessStatusSchema>;

function getHealthStatus(now = new Date()): HealthStatus {
  return healthStatusSchema.parse({
    service: "api",
    status: "ok",
    timestamp: now.toISOString(),
  });
}

function getReadinessStatus(
  dependencies: ReadinessDependencies,
  now = new Date(),
): ReadinessStatus {
  return readinessStatusSchema.parse({
    dependencies,
    service: "api",
    status: Object.values(dependencies).every((dependency) => dependency.status === "ok")
      ? "ok"
      : "error",
    timestamp: now.toISOString(),
  });
}

export {
  getHealthStatus,
  getReadinessStatus,
  healthStatusSchema,
  readinessStatusSchema,
  type HealthStatus,
  type ReadinessDependencies,
  type ReadinessStatus,
};
