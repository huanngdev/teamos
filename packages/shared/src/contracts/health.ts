import { z } from "zod";

const healthStatusSchema = z.object({
  service: z.literal("api"),
  status: z.literal("ok"),
  timestamp: z.iso.datetime(),
});

type HealthStatus = z.infer<typeof healthStatusSchema>;

function getHealthStatus(now = new Date()): HealthStatus {
  return healthStatusSchema.parse({
    service: "api",
    status: "ok",
    timestamp: now.toISOString(),
  });
}

export { getHealthStatus, healthStatusSchema, type HealthStatus };
