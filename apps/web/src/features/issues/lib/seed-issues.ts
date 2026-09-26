import { ISSUE_BOARD_MAX } from "@teamos/shared";

const SEED_ISSUES_PER_COLUMN = 3;

type SeedIssuePlan =
  { reason: "empty" | "full"; status: "skipped" } | { slots: string[]; status: "ready" };

function planSeedIssues(statusIds: readonly string[], currentTotal: number): SeedIssuePlan {
  if (statusIds.length === 0) {
    return { reason: "empty", status: "skipped" };
  }

  const room = ISSUE_BOARD_MAX - currentTotal;

  if (room <= 0) {
    return { reason: "full", status: "skipped" };
  }

  const count = Math.min(room, statusIds.length * SEED_ISSUES_PER_COLUMN);
  const slots: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const statusId = statusIds[index % statusIds.length];

    if (statusId !== undefined) {
      slots.push(statusId);
    }
  }

  return { slots, status: "ready" };
}

export { SEED_ISSUES_PER_COLUMN, planSeedIssues, type SeedIssuePlan };
