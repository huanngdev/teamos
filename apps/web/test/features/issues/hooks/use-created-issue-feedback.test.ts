import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { formatIssueCode, type IssueDetail } from "@teamos/shared";

import { useCreatedIssueFeedback } from "@/features/issues/hooks/use-created-issue-feedback";

const notifyMock = vi.hoisted(() => ({
  error: vi.fn<(message: string) => void>(),
  success: vi.fn<(message: string, action?: { label: string; onClick: () => void }) => void>(),
}));

vi.mock("@/shared/notifications/notify", () => ({ notify: notifyMock }));

const issue: IssueDetail = {
  assignees: [],
  content: null,
  contentText: "",
  createdAt: "2026-01-02T00:00:00.000Z",
  id: "issue-1",
  number: "1",
  position: 0,
  priority: "none",
  statusId: "00000000-0000-4000-8000-000000000001",
  title: "First issue",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

interface Options {
  isFetching: boolean;
  isVisible: boolean;
}

function renderFeedback(options: Options) {
  const onView = vi.fn();

  return {
    ...renderHook(
      (props: Options) =>
        useCreatedIssueFeedback({
          dataUpdatedAt: 0,
          isFetching: props.isFetching,
          isVisible: () => props.isVisible,
          locationLabel: () => "Todo",
          onView,
        }),
      { initialProps: options },
    ),
    onView,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

test("reports a created issue once the list stops fetching", () => {
  const { result, rerender } = renderFeedback({ isFetching: true, isVisible: true });

  act(() => {
    result.current.notifyCreated(issue);
  });
  expect(result.current.createdMessage).toBeNull();

  rerender({ isFetching: false, isVisible: true });
  expect(result.current.createdMessage).toBe(`${formatIssueCode(issue.number)} created.`);
  expect(result.current.highlightedIssueId).toBe("issue-1");
  expect(notifyMock.success).not.toHaveBeenCalled();
});

test("notifies with a view action when the issue is outside the results", () => {
  const { onView, result, rerender } = renderFeedback({ isFetching: false, isVisible: false });

  act(() => {
    result.current.notifyCreated(issue);
  });
  rerender({ isFetching: false, isVisible: false });

  expect(result.current.createdMessage).toBe(
    `${formatIssueCode(issue.number)} was created in Todo. It is outside the current results.`,
  );
  expect(notifyMock.success).toHaveBeenCalledTimes(1);

  const [, action] = notifyMock.success.mock.calls[0] ?? [];
  expect(action?.label).toBe("View issue");
  action?.onClick();
  expect(onView).toHaveBeenCalledWith(issue);
});

test("clears the highlight after the feedback window", () => {
  const { result, rerender } = renderFeedback({ isFetching: false, isVisible: true });

  act(() => {
    result.current.notifyCreated(issue);
  });
  rerender({ isFetching: false, isVisible: true });
  expect(result.current.highlightedIssueId).toBe("issue-1");

  act(() => {
    vi.advanceTimersByTime(1600);
  });
  expect(result.current.highlightedIssueId).toBeNull();
});
