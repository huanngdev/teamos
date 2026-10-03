import { formatIssueCode, type IssueDetail } from "@teamos/shared";
import { useEffect, useRef, useState } from "react";

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
  const optionsRef = useRef(options);
  const [pending, setPending] = useState<IssueDetail | null>(null);
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);
  const [highlightedIssueId, setHighlightedIssueId] = useState<string | null>(null);
  optionsRef.current = options;

  useEffect(() => {
    if (pending === null || options.isFetching) {
      return;
    }

    const issue = pending;
    const current = optionsRef.current;
    const code = formatIssueCode(issue.number);
    const location = current.locationLabel(issue);
    setPending(null);

    if (current.isVisible(issue.id)) {
      setCreatedMessage(`${code} created.`);
      setHighlightedIssueId(issue.id);
      return;
    }

    setHighlightedIssueId(null);
    setCreatedMessage(`${code} was created in ${location}. It is outside the current results.`);
    notify.success(`${code} was created in ${location}.`, {
      label: "View issue",
      onClick: () => {
        current.onView(issue);
      },
    });
  }, [options.dataUpdatedAt, options.isFetching, pending]);

  useEffect(() => {
    if (highlightedIssueId === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      setHighlightedIssueId(null);
    }, highlightMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [highlightedIssueId]);

  return {
    createdMessage,
    highlightedIssueId,
    notifyCreated: (issue) => {
      setHighlightedIssueId(null);
      setCreatedMessage(null);
      setPending(issue);
    },
  };
}

export { useCreatedIssueFeedback };
