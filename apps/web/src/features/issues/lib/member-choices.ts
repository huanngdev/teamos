import { currentUserAssigneeId, unassignedAssigneeId, type EligibleAssignee } from "@teamos/shared";

interface MemberChoice {
  id: string;
  image: string | null;
  name: string;
}

const memberTokenLabels: Record<string, string> = {
  [currentUserAssigneeId]: "Me",
  [unassignedAssigneeId]: "Unassigned",
};

const currentUserMemberChoice: MemberChoice = {
  id: currentUserAssigneeId,
  image: null,
  name: memberTokenLabels[currentUserAssigneeId] ?? "Me",
};

const unassignedMemberChoice: MemberChoice = {
  id: unassignedAssigneeId,
  image: null,
  name: memberTokenLabels[unassignedAssigneeId] ?? "Unassigned",
};

function toMemberChoice(assignee: EligibleAssignee): MemberChoice {
  return {
    id: assignee.id,
    image: assignee.image,
    name: assignee.name,
  };
}

function isMemberToken(id: string): boolean {
  return id === currentUserAssigneeId || id === unassignedAssigneeId;
}

function buildMemberChoices(options: {
  assignees: readonly EligibleAssignee[];
  includeCurrentUser: boolean;
  includeUnassigned: boolean;
  known: readonly EligibleAssignee[];
  selectedIds: readonly string[];
}): MemberChoice[] {
  const byId = new Map<string, EligibleAssignee>();

  for (const assignee of options.known) {
    byId.set(assignee.id, assignee);
  }

  for (const assignee of options.assignees) {
    byId.set(assignee.id, assignee);
  }

  const leading: MemberChoice[] = [];

  if (options.includeCurrentUser) {
    leading.push(currentUserMemberChoice);
  }

  if (options.includeUnassigned) {
    leading.push(unassignedMemberChoice);
  }

  const pageIds = new Set(options.assignees.map((assignee) => assignee.id));
  const trailing = options.selectedIds.flatMap((id) => {
    if (isMemberToken(id) || pageIds.has(id)) {
      return [];
    }

    const assignee = byId.get(id);

    return [
      assignee === undefined
        ? { id, image: null, name: "Saved assignee" }
        : toMemberChoice(assignee),
    ];
  });

  return [...leading, ...options.assignees.map(toMemberChoice), ...trailing];
}

function selectedMemberChoices(
  ids: readonly string[],
  choices: readonly MemberChoice[],
): MemberChoice[] {
  const byId = new Map(choices.map((choice) => [choice.id, choice]));

  return ids.flatMap((id) => {
    const choice = byId.get(id);

    return choice === undefined ? [] : [choice];
  });
}

export {
  buildMemberChoices,
  currentUserMemberChoice,
  selectedMemberChoices,
  toMemberChoice,
  unassignedMemberChoice,
  type MemberChoice,
};
