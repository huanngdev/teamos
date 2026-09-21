// @vitest-environment jsdom

import type { ProjectMember, ProjectRole } from "@teamos/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { ProjectMembersDialog } from "./project-members-dialog";

const members: ProjectMember[] = [
  {
    email: "ada@example.com",
    image: null,
    memberId: "member-1",
    name: "Ada Lovelace",
    role: "lead",
    userId: "user-1",
  },
  {
    email: "charles@example.com",
    image: null,
    memberId: "member-2",
    name: "Charles Babbage",
    role: "member",
    userId: "user-2",
  },
  {
    email: "grace@example.com",
    image: null,
    memberId: "member-3",
    name: "Grace Hopper",
    role: "viewer",
    userId: "user-3",
  },
];

function renderDialog(
  overrides: { onRoleChange?: (memberId: string, role: ProjectRole) => void } = {},
) {
  return render(
    <ProjectMembersDialog
      errorMessage={null}
      isPending={false}
      members={members}
      onClose={vi.fn()}
      onRemoveMember={vi.fn()}
      onRoleChange={overrides.onRoleChange ?? vi.fn()}
      open
      pendingMemberId={null}
      projectName="Apollo"
    />,
  );
}

test("shows project role labels instead of raw role codes", () => {
  renderDialog();

  const adaRole = screen.getByLabelText("Project role for Ada Lovelace");
  const charlesRole = screen.getByLabelText("Project role for Charles Babbage");
  const graceRole = screen.getByLabelText("Project role for Grace Hopper");

  expect(adaRole).toHaveTextContent("Lead");
  expect(adaRole).not.toHaveTextContent("lead");
  expect(charlesRole).toHaveTextContent("Member");
  expect(charlesRole).not.toHaveTextContent("member");
  expect(graceRole).toHaveTextContent("Viewer");
  expect(graceRole).not.toHaveTextContent("viewer");
});

test("reports the domain role when a new label is selected", async () => {
  const onRoleChange = vi.fn();

  renderDialog({ onRoleChange });

  await userEvent.click(screen.getByLabelText("Project role for Charles Babbage"));
  await userEvent.click(await screen.findByRole("option", { name: "Viewer" }));

  expect(onRoleChange).toHaveBeenCalledWith("member-2", "viewer");
});
