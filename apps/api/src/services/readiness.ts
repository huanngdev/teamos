import { getReadinessStatus, type ReadinessStatus } from "@teamos/shared";

type ReadinessProbe = (signal?: AbortSignal) => Promise<void>;

interface ReadinessProbes {
  database: ReadinessProbe;
  redis: ReadinessProbe;
  storage: ReadinessProbe;
}

interface ReadinessService {
  check: (signal?: AbortSignal) => Promise<ReadinessStatus>;
}

function createReadinessService(probes: ReadinessProbes): ReadinessService {
  return {
    check: async (signal) => {
      const entries = await Promise.all(
        Object.entries(probes).map(async ([name, probe]) => {
          try {
            await probe(signal);
            return [name, { status: "ok" as const }] as const;
          } catch {
            return [name, { status: "error" as const }] as const;
          }
        }),
      );

      return getReadinessStatus({
        database: entries.find(([name]) => name === "database")?.[1] ?? { status: "error" },
        redis: entries.find(([name]) => name === "redis")?.[1] ?? { status: "error" },
        storage: entries.find(([name]) => name === "storage")?.[1] ?? { status: "error" },
      });
    },
  };
}

function createUnavailableReadinessService(): ReadinessService {
  const unavailable = async () => {
    throw new Error("Service readiness probes are not configured.");
  };

  return createReadinessService({
    database: unavailable,
    redis: unavailable,
    storage: unavailable,
  });
}

export {
  createReadinessService,
  createUnavailableReadinessService,
  type ReadinessProbe,
  type ReadinessProbes,
  type ReadinessService,
};
