import type { EligibleAssignee } from "@teamos/shared";

interface AssigneeIdentity {
  email: string;
  id: string;
  image: string | null;
  name: string;
}

function issueAssigneeKey(ids: readonly string[]): string {
  return [...ids].sort().join("\n");
}

function assigneesFromIssue(issue: { assignees: readonly AssigneeIdentity[] }): EligibleAssignee[] {
  return issue.assignees.map((person) => ({
    email: person.email,
    id: person.id,
    image: person.image,
    name: person.name,
  }));
}

function resolveAssignees(
  ids: readonly string[],
  ...sources: readonly (readonly EligibleAssignee[])[]
): EligibleAssignee[] {
  return ids.map((id) => {
    for (const source of sources) {
      const match = source.find((person) => person.id === id);

      if (match !== undefined) {
        return match;
      }
    }

    return {
      email: "",
      id,
      image: null,
      name: "Unknown member",
    };
  });
}

export { assigneesFromIssue, issueAssigneeKey, resolveAssignees };
