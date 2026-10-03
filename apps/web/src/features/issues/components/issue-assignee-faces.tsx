import { getInitials } from "@teamos/shared";
import { UserCircleIcon } from "@phosphor-icons/react";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { IssueIconLabel } from "./issue-field-label";

interface AssigneePerson {
  id: string;
  image: string | null;
  name: string;
}

function AssigneeFaces({
  density = "default",
  emptyLabel = "No assignee",
  people,
}: {
  density?: "card" | "default";
  emptyLabel?: string;
  people: readonly AssigneePerson[];
}) {
  if (people.length === 0) {
    if (density === "card") {
      return (
        <span aria-label={emptyLabel} className="shrink-0 text-muted-foreground" role="img">
          <UserCircleIcon className="size-4" />
        </span>
      );
    }

    return <IssueIconLabel icon={UserCircleIcon} label={emptyLabel} />;
  }

  if (people.length === 1) {
    const person = people[0];

    if (person === undefined) {
      return <IssueIconLabel icon={UserCircleIcon} label={emptyLabel} />;
    }

    if (density === "card") {
      return (
        <span className="flex min-w-0 items-center gap-1">
          <Avatar aria-hidden="true" className="size-4">
            <AvatarImage alt="" src={person.image ?? undefined} />
            <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
          </Avatar>
          <span className="line-clamp-1 min-w-0 text-xs text-muted-foreground" title={person.name}>
            {person.name}
          </span>
        </span>
      );
    }

    return (
      <span className="flex min-w-0 items-center gap-2">
        <MenuAvatar person={person} />
        <span className="min-w-0 truncate">{person.name}</span>
      </span>
    );
  }

  const shown = people.slice(0, 3);
  const extra = people.length - shown.length;
  const names = people.map((person) => person.name).join(", ");
  const label = extra > 0 ? `${names}, +${extra}` : names;

  if (density === "card") {
    return (
      <AvatarGroup aria-label={label} role="img">
        {shown.map((person) => (
          <Avatar aria-hidden="true" className="size-4" key={person.id}>
            <AvatarImage alt="" src={person.image ?? undefined} />
            <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
          </Avatar>
        ))}
        {extra > 0 ? (
          <AvatarGroupCount aria-hidden="true" className="size-4">
            +{extra}
          </AvatarGroupCount>
        ) : null}
      </AvatarGroup>
    );
  }

  return (
    <AvatarGroup aria-label={label} role="img">
      {shown.map((person) => (
        <MenuAvatar key={person.id} person={person} />
      ))}
      {extra > 0 ? <AvatarGroupCount aria-hidden="true">+{extra}</AvatarGroupCount> : null}
    </AvatarGroup>
  );
}

function MenuAvatar({ person }: { person: AssigneePerson }) {
  return (
    <Avatar aria-hidden="true" size="sm">
      <AvatarImage alt="" src={person.image ?? undefined} />
      <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
    </Avatar>
  );
}

export { AssigneeFaces, type AssigneePerson };
