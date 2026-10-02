import { render, screen } from "@testing-library/react";
import type { IssueCardSummary } from "@teamos/shared";
import { expect, test } from "vitest";

import { IssueCardBody } from "./issue-card";

const ada = {
  email: "ada@example.com",
  id: "member-1",
  image: null,
  name: "Ada Lovelace",
};

const issue: IssueCardSummary = {
  assignees: [ada],
  createdAt: "2026-01-01T00:00:00.000Z",
  id: "issue-1",
  number: "1",
  position: 0,
  priority: "none",
  statusId: "11111111-1111-4111-8111-111111111111",
  title: "Check the gate",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("shows the assignee name on one line beside the avatar", () => {
  render(<IssueCardBody issue={issue} />);

  const name = screen.getByText("Ada Lovelace");
  expect(name).toHaveClass("line-clamp-1");
  expect(name.parentElement?.querySelector("[data-slot=avatar]")).toBeInTheDocument();
});

test("omits an assignee name when the issue is unassigned", () => {
  render(<IssueCardBody issue={{ ...issue, assignees: [] }} />);

  expect(screen.getByLabelText("Unassigned")).toBeInTheDocument();
  expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
});

test("groups more than one assignee", () => {
  render(
    <IssueCardBody
      issue={{
        ...issue,
        assignees: [
          ada,
          {
            email: "grace@example.com",
            id: "member-3",
            image: null,
            name: "Grace Hopper",
          },
        ],
      }}
    />,
  );

  expect(document.querySelector("[data-slot=avatar-group]")).toBeInTheDocument();
  expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
});
