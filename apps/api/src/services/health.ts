interface HealthStatus {
  service: "api";
  status: "ok";
  timestamp: string;
}

export function getHealthStatus(now = new Date()): HealthStatus {
  return {
    service: "api",
    status: "ok",
    timestamp: now.toISOString(),
  };
}
