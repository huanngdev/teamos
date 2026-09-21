import type { ReadinessDependencies } from "@teamos/shared";

type ReadinessDependencyStatus = ReadinessDependencies[keyof ReadinessDependencies]["status"];

/*
 * Readiness statuses travel over the wire as `ok` or `error`. The UI resolves
 * them through this mapper so a dependency badge never renders the wire code.
 */
const readinessDependencyStatusLabels: Record<ReadinessDependencyStatus, string> = {
  error: "Unavailable",
  ok: "Ready",
};

function getReadinessDependencyStatusLabel(status: ReadinessDependencyStatus): string {
  return readinessDependencyStatusLabels[status];
}

export {
  getReadinessDependencyStatusLabel,
  readinessDependencyStatusLabels,
  type ReadinessDependencyStatus,
};
