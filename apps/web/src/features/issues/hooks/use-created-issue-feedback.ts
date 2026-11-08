import { formatIssueCode, type IssueDetail } from "@teamos/shared";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { notify } from "@/shared";

interface CreatedIssueFeedbackOptions {
  dataUpdatedAt: number;
  isFetching: boolean;
  isVisible: (issueId: string) => boolean;
  locationLabel: (issue: IssueDetail) => string;
  onView: (issue: IssueDetail) => void;
}

interface CreatedIssueFeedback {
  createdMessage: string | null;
  highlightedIssueId: string | null;
  notifyCreated: (issue: IssueDetail) => void;
}

const highlightMs = 1600;

function useCreatedIssueFeedback(options: CreatedIssueFeedbackOptions): CreatedIssueFeedback {
  const [pending, setPending] = useState<IssueDetail | null>(null);
  const [clearedHighlightId, setClearedHighlightId] = useState<string | null>(null);
  const notified = useRef<IssueDetail | null>(null);
  const readOptions = useEffectEvent(() => options);

  /*
   * The created issue settles once the list stops fetching. Both the message
   * and the highlight derive from that snapshot; the effect only fires the
   * external notification, so no state is written during it.
   */
  const settled = pending !== null && !options.isFetching ? pending : null;
  const code = settled === null ? null : formatIssueCode(settled.number);
  const createdMessage =
    settled === null || code === null
      ? null
      : options.isVisible(settled.id)
        ? `${code} created.`
        : `${code} was created in ${options.locationLabel(settled)}. It is outside the current results.`;
  const highlightedIssueId =
    settled !== null && clearedHighlightId !== settled.id ? settled.id : null;

  useEffect(() => {
    if (settled === null || notified.current === settled) {
      return;
    }

    notified.current = settled;
    const current = readOptions();

    if (current.isVisible(settled.id)) {
      return;
    }

    const settledCode = formatIssueCode(settled.number);
    const location = current.locationLabel(settled);
    notify.success(`${settledCode} was created in ${location}.`, {
      label: "View issue",
      onClick: () => {
        current.onView(settled);
      },
    });
  }, [settled]);

  useEffect(() => {
    if (highlightedIssueId === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      setClearedHighlightId(highlightedIssueId);
    }, highlightMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [highlightedIssueId]);

  return {
    createdMessage,
    highlightedIssueId,
    notifyCreated: (issue) => {
      notified.current = null;
      setClearedHighlightId(null);
      setPending(issue);
    },
  };
}

export { useCreatedIssueFeedback };
