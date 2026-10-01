import { getInitials } from "@teamos/shared";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function PersonIdentity({
  email,
  image,
  name,
}: {
  email?: string;
  image: string | null;
  name: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar className="size-5">
        <AvatarImage alt="" src={image ?? undefined} />
        <AvatarFallback>{getInitials(name) || getInitials(email ?? "")}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 text-left">
        <span className="block truncate">{name}</span>
        {email === undefined ? null : (
          <span className="block truncate text-xs text-muted-foreground">{email}</span>
        )}
      </span>
    </span>
  );
}

export { PersonIdentity };
