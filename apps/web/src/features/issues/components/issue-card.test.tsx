import { render, screen } from "@testing-library/react";
import type { IssueSummary } from "@teamos/shared";
import { expect, test } from "vitest";

import { IssueCardBody } from "./issue-card";

const issue: IssueSummary = {
  assignee: {
    email: "ada@example.com",
    image: null,
    name: "Ada Lovelace",
  },
  assigneeMemberId: "member-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  description: null,
  id: "issue-1",
  number: 1,
  position: 0,
  priority: "none",
  statusId: "11111111-1111-4111-8111-111111111111",
  title: "Check the gate",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("shows the assignee name on one line beside the avatar", () => {
  render(
    <IssueCardBody
      assigneeName={issue.assignee?.name}
      image={issue.assignee?.image}
      issue={issue}
    />,
  );

  const name = screen.getByText("Ada Lovelace");
  expect(name).toHaveClass("line-clamp-1");
  expect(name.parentElement?.querySelector("[data-slot=avatar]")).toBeInTheDocument();
});

test("omits an assignee name when the issue is unassigned", () => {
  render(
    <IssueCardBody
      assigneeName={undefined}
      image={null}
      issue={{ ...issue, assignee: null, assigneeMemberId: null }}
    />,
  );

  expect(screen.getByLabelText("Unassigned")).toBeInTheDocument();
  expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
});
