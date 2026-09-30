import { render, screen } from "@testing-library/react";
import type { IssueSummary, ProjectMember } from "@teamos/shared";
import { expect, test } from "vitest";

import { IssueCardBody } from "./issue-card";

const issue: IssueSummary = {
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

const member: ProjectMember = {
  email: "ada@example.com",
  image: null,
  memberId: "member-1",
  name: "Ada Lovelace",
  role: "member",
  userId: "user-1",
};

test("shows the assignee name on one line beside the avatar", () => {
  render(<IssueCardBody issue={issue} member={member} />);

  const name = screen.getByText("Ada Lovelace");
  expect(name).toHaveClass("line-clamp-1");
  expect(name.parentElement?.querySelector("[data-slot=avatar]")).toBeInTheDocument();
});

test("omits an assignee name when the issue is unassigned", () => {
  render(<IssueCardBody issue={{ ...issue, assigneeMemberId: null }} member={undefined} />);

  expect(screen.getByLabelText("Unassigned")).toBeInTheDocument();
  expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
});
