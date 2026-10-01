import { issue } from "@teamos/db/schema";
import { ISSUE_POSITION_GAP, ISSUE_POSITION_MAX, type IssuePlacement } from "@teamos/shared";
import { and, asc, count, desc, eq, ne, sql } from "drizzle-orm";

import { AppError } from "@/errors/index.js";
import { placeBetween, spreadWindow } from "@/services/issue-position.js";
import type { ProjectTransaction } from "@/services/project-access.js";

const REBALANCE_WINDOW = 128;

interface PlacementScope {
  excludeId?: string;
  organizationId: string;
  placement: IssuePlacement;
  projectId: string;
  statusId: string;
}

interface PositionedRow {
  id: string;
  position: number;
}

function scopeWhere(input: PlacementScope) {
  return and(
    eq(issue.organizationId, input.organizationId),
    eq(issue.projectId, input.projectId),
    eq(issue.statusId, input.statusId),
    input.excludeId === undefined ? undefined : ne(issue.id, input.excludeId),
  );
}

async function lockIssueColumns(
  transaction: ProjectTransaction,
  projectId: string,
  statusIds: readonly string[],
): Promise<void> {
  const keys = [...new Set(statusIds)].sort();

  for (const statusId of keys) {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${projectId}), hashtext(${`column:${statusId}`}))`,
    );
  }
}

async function lockIssueNumbers(transaction: ProjectTransaction, projectId: string): Promise<void> {
  await transaction.execute(
    sql`select pg_advisory_xact_lock(hashtext(${projectId}), hashtext('issue-number'))`,
  );
}

async function placeRelative(
  transaction: ProjectTransaction,
  input: PlacementScope,
): Promise<number> {
  const bounds = await readBounds(transaction, input);
  const placed = placeBetween(bounds.previous, bounds.next);

  if (placed.kind === "position") {
    return placed.position;
  }

  const spread = await spreadLocal(transaction, input, bounds);

  if (spread !== null) {
    return spread;
  }

  await renumberColumn(transaction, input);
  const retried = await readBounds(transaction, input);
  const again = placeBetween(retried.previous, retried.next);

  if (again.kind === "position") {
    return again.position;
  }

  throw new AppError(
    409,
    "ISSUE_PLACEMENT_CONFLICT",
    "The column could not be reordered. Refresh and try again.",
  );
}

async function readBounds(
  transaction: ProjectTransaction,
  input: PlacementScope,
): Promise<{
  next: number | null;
  nextId: string | null;
  previous: number | null;
  previousId: string | null;
}> {
  if (input.placement.type === "start") {
    const next = await readEdge(transaction, input, "first");

    return {
      next: next?.position ?? null,
      nextId: next?.id ?? null,
      previous: null,
      previousId: null,
    };
  }

  if (input.placement.type === "end") {
    const previous = await readEdge(transaction, input, "last");

    return {
      next: null,
      nextId: null,
      previous: previous?.position ?? null,
      previousId: previous?.id ?? null,
    };
  }

  const anchor = await readAnchor(transaction, input, input.placement.anchorIssueId);
  const side = input.placement.type === "before" ? "before" : "after";
  const neighbor = await readNeighbor(transaction, input, anchor, side);

  if (input.placement.type === "before") {
    return {
      next: anchor.position,
      nextId: anchor.id,
      previous: neighbor?.position ?? null,
      previousId: neighbor?.id ?? null,
    };
  }

  return {
    next: neighbor?.position ?? null,
    nextId: neighbor?.id ?? null,
    previous: anchor.position,
    previousId: anchor.id,
  };
}

async function readAnchor(
  transaction: ProjectTransaction,
  input: PlacementScope,
  anchorIssueId: string,
): Promise<PositionedRow> {
  if (anchorIssueId === input.excludeId) {
    throw new AppError(
      409,
      "ISSUE_PLACEMENT_CONFLICT",
      "The drop target changed. Refresh and try again.",
    );
  }

  const [anchor] = await transaction
    .select({ id: issue.id, position: issue.position })
    .from(issue)
    .where(
      and(
        eq(issue.organizationId, input.organizationId),
        eq(issue.projectId, input.projectId),
        eq(issue.statusId, input.statusId),
        eq(issue.id, anchorIssueId),
      ),
    )
    .for("update")
    .limit(1);

  if (anchor === undefined) {
    throw new AppError(
      409,
      "ISSUE_PLACEMENT_CONFLICT",
      "The drop target changed. Refresh and try again.",
    );
  }

  return anchor;
}

async function readEdge(
  transaction: ProjectTransaction,
  input: PlacementScope,
  edge: "first" | "last",
): Promise<PositionedRow | undefined> {
  const [row] = await transaction
    .select({ id: issue.id, position: issue.position })
    .from(issue)
    .where(scopeWhere(input))
    .orderBy(
      ...(edge === "first"
        ? [asc(issue.position), asc(issue.id)]
        : [desc(issue.position), desc(issue.id)]),
    )
    .limit(1);

  return row;
}

async function readNeighbor(
  transaction: ProjectTransaction,
  input: PlacementScope,
  anchor: PositionedRow,
  side: "after" | "before",
): Promise<PositionedRow | undefined> {
  const comparison =
    side === "before"
      ? sql`(${issue.position}, ${issue.id}) < (${anchor.position}::int, ${anchor.id}::uuid)`
      : sql`(${issue.position}, ${issue.id}) > (${anchor.position}::int, ${anchor.id}::uuid)`;
  const [row] = await transaction
    .select({ id: issue.id, position: issue.position })
    .from(issue)
    .where(and(scopeWhere(input), comparison))
    .orderBy(
      ...(side === "before"
        ? [desc(issue.position), desc(issue.id)]
        : [asc(issue.position), asc(issue.id)]),
    )
    .limit(1);

  return row;
}

async function spreadLocal(
  transaction: ProjectTransaction,
  input: PlacementScope,
  bounds: {
    next: number | null;
    nextId: string | null;
    previous: number | null;
    previousId: string | null;
  },
): Promise<number | null> {
  const window = await readWindow(transaction, input, bounds);
  const insertAt =
    bounds.nextId === null
      ? window.length
      : Math.max(
          0,
          window.findIndex((row) => row.id === bounds.nextId),
        );
  const spread = spreadWindow({
    high: await sentinel(transaction, input, window, "after"),
    insertAt: insertAt === -1 ? window.length : insertAt,
    low: await sentinel(transaction, input, window, "before"),
    movingId: input.excludeId ?? "new",
    orderedIds: window.map((row) => row.id),
  });

  if (spread.kind === "full") {
    return null;
  }

  if (spread.positions.length > 0) {
    await writePositions(transaction, input, spread.positions);
  }

  return spread.movingPosition;
}

async function readWindow(
  transaction: ProjectTransaction,
  input: PlacementScope,
  bounds: {
    next: number | null;
    nextId: string | null;
    previous: number | null;
    previousId: string | null;
  },
): Promise<PositionedRow[]> {
  const half = Math.floor(REBALANCE_WINDOW / 2);
  const before =
    bounds.previous === null || bounds.previousId === null
      ? []
      : await transaction
          .select({ id: issue.id, position: issue.position })
          .from(issue)
          .where(
            and(
              scopeWhere(input),
              sql`(${issue.position}, ${issue.id}) <= (${bounds.previous}::int, ${bounds.previousId}::uuid)`,
            ),
          )
          .orderBy(desc(issue.position), desc(issue.id))
          .limit(half);
  const after =
    bounds.next === null || bounds.nextId === null
      ? []
      : await transaction
          .select({ id: issue.id, position: issue.position })
          .from(issue)
          .where(
            and(
              scopeWhere(input),
              sql`(${issue.position}, ${issue.id}) >= (${bounds.next}::int, ${bounds.nextId}::uuid)`,
            ),
          )
          .orderBy(asc(issue.position), asc(issue.id))
          .limit(half);
  const rows = new Map<string, PositionedRow>();

  for (const row of [...before, ...after]) {
    rows.set(row.id, row);
  }

  return [...rows.values()].sort(
    (left, right) => left.position - right.position || left.id.localeCompare(right.id),
  );
}

async function sentinel(
  transaction: ProjectTransaction,
  input: PlacementScope,
  window: readonly PositionedRow[],
  side: "after" | "before",
): Promise<number | null> {
  const edge = side === "before" ? window[0] : window[window.length - 1];

  if (edge === undefined) {
    return null;
  }

  const neighbor = await readNeighbor(transaction, input, edge, side);

  return neighbor?.position ?? null;
}

async function writePositions(
  transaction: ProjectTransaction,
  input: PlacementScope,
  positions: readonly { id: string; position: number }[],
): Promise<void> {
  const values = sql.join(
    positions.map((item) => sql`(${item.id}::uuid, ${item.position}::int)`),
    sql`, `,
  );

  await transaction.execute(sql`
    update issue as target
    set position = data.position
    from (values ${values}) as data(id, position)
    where target.id = data.id
      and target.organization_id = ${input.organizationId}
      and target.project_id = ${input.projectId}
      and target.status_id = ${input.statusId}
  `);
}

async function renumberColumn(
  transaction: ProjectTransaction,
  input: PlacementScope,
): Promise<void> {
  const [counted] = await transaction
    .select({ value: count() })
    .from(issue)
    .where(scopeWhere(input));
  const total = Number(counted?.value ?? 0);

  if (total > 1 && (total - 1) * ISSUE_POSITION_GAP > ISSUE_POSITION_MAX) {
    throw new AppError(
      409,
      "ISSUE_PLACEMENT_CONFLICT",
      "The column could not be reordered. Refresh and try again.",
    );
  }

  const moving =
    input.excludeId === undefined ? sql`true` : sql`${issue.id} <> ${input.excludeId}::uuid`;

  await transaction.execute(sql`
    update issue as target
    set position = ranked.next_position
    from (
      select ${issue.id} as id,
        (row_number() over (order by ${issue.position}, ${issue.id}) - 1) * ${ISSUE_POSITION_GAP} as next_position
      from ${issue}
      where ${issue.organizationId} = ${input.organizationId}
        and ${issue.projectId} = ${input.projectId}
        and ${issue.statusId} = ${input.statusId}
        and ${moving}
    ) as ranked
    where target.id = ranked.id
      and target.position is distinct from ranked.next_position
  `);
}

export { lockIssueColumns, lockIssueNumbers, placeRelative };
