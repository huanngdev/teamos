import type { CSSProperties } from "react";

const issueSelectColumnId = "select";

interface PinningState {
  end: string[];
  start: string[];
}

interface PinColumn {
  getAfter: (position?: "end" | "start" | false) => number;
  getIsPinned: () => "end" | "start" | false;
  getSize: () => number;
  getStart: (position?: "end" | "start" | false) => number;
  id: string;
}

function withSelectColumnPinned(pinning: PinningState): PinningState {
  return {
    end: pinning.end.filter((id) => id !== issueSelectColumnId),
    start: [issueSelectColumnId, ...pinning.start.filter((id) => id !== issueSelectColumnId)],
  };
}

function issueTablePinStyle(column: PinColumn): CSSProperties {
  const pinned = column.getIsPinned();
  const size = column.getSize();

  if (pinned === "start") {
    return { left: column.getStart("start"), minWidth: size, width: size };
  }

  if (pinned === "end") {
    return { minWidth: size, right: column.getAfter("end"), width: size };
  }

  return { minWidth: size, width: size };
}

export { issueSelectColumnId, issueTablePinStyle, withSelectColumnPinned };
