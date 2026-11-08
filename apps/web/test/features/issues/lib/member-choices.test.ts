import type { EligibleAssignee } from "@teamos/shared";
import { expect, test } from "vitest";

import { buildMemberChoices, selectedMemberChoices } from "./member-choices";

const grace: EligibleAssignee = {
  email: "grace@example.com",
  id: "member-3",
  image: null,
  name: "Grace Hopper",
};

const ada: EligibleAssignee = {
  email: "ada@example.com",
  id: "member-9",
  image: null,
  name: "Ada Lovelace",
};

test("keeps selected assignees in the item list when they are not on the current page", () => {
  const choices = buildMemberChoices({
    assignees: [grace],
    includeCurrentUser: true,
    includeUnassigned: true,
    known: [ada],
    selectedIds: ["me", "unassigned", ada.id],
  });

  expect(choices.map((choice) => choice.name)).toEqual([
    "Me",
    "Unassigned",
    "Grace Hopper",
    "Ada Lovelace",
  ]);
  expect(selectedMemberChoices(["me", ada.id], choices).map((choice) => choice.id)).toEqual([
    "me",
    ada.id,
  ]);
});

test("labels a selected assignee that is not loaded yet", () => {
  const choices = buildMemberChoices({
    assignees: [],
    includeCurrentUser: false,
    includeUnassigned: false,
    known: [],
    selectedIds: ["member-4"],
  });

  expect(choices).toEqual([{ id: "member-4", image: null, name: "Saved assignee" }]);
});
