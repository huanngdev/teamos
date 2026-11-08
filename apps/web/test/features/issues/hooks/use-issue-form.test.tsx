import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import type { IssueCardSummary, ProjectStatusSummary } from "@teamos/shared";
import type { ReactNode } from "react";

import { createTestQueryClient } from "../../../support/render-app";

import { useIssueForm } from "@/features/issues/hooks/use-issue-form";

const status: ProjectStatusSummary = {
  category: "unstarted",
  id: "00000000-0000-4000-8000-000000000001",
  isDefault: true,
  name: "Todo",
  position: 0,
};

const issue: IssueCardSummary = {
  assignees: [],
  createdAt: "2026-01-02T00:00:00.000Z",
  id: "issue-1",
  number: "1",
  position: 0,
  priority: "high",
  statusId: status.id,
  title: "First issue",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>;
}

function renderForm() {
  return renderHook(
    () =>
      useIssueForm({
        canUpdateIssue: true,
        organizationSlug: "acme",
        projectId: "project-1",
        statuses: [status],
      }),
    { wrapper },
  );
}

test("starts clean and opens an existing issue as the baseline", () => {
  const { result } = renderForm();

  expect(result.current.mode).toBe("closed");
  expect(result.current.isDirty).toBe(false);

  act(() => {
    result.current.openEdit(issue);
  });

  expect(result.current.mode).toBe("edit");
  expect(result.current.title).toBe("First issue");
  expect(result.current.priority).toBe("high");
  expect(result.current.isDirty).toBe(false);
});

test("marks edits dirty and resets them on close", () => {
  const { result } = renderForm();

  act(() => {
    result.current.openEdit(issue);
  });
  act(() => {
    result.current.setTitle("Renamed issue");
  });
  expect(result.current.isDirty).toBe(true);

  act(() => {
    result.current.requestClose();
  });
  expect(result.current.mode).toBe("closed");
  expect(result.current.title).toBe("");
  expect(result.current.isDirty).toBe(false);
});

test("opens a create form clean and reports a missing title as invalid", () => {
  const { result } = renderForm();

  act(() => {
    result.current.openCreate();
  });
  expect(result.current.mode).toBe("create");
  expect(result.current.isDirty).toBe(false);
  expect(result.current.isValid).toBe(false);

  act(() => {
    result.current.setTitle("New issue");
  });
  expect(result.current.isDirty).toBe(true);
  expect(result.current.isValid).toBe(true);
});
