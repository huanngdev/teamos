import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

function IssueFieldLabel({ children }: { children: ReactNode }) {
  return <span className="flex min-w-0 items-center gap-2 text-sm">{children}</span>;
}

function IssueIconLabel({ icon: Icon, label }: { icon: Icon; label: string }) {
  return (
    <IssueFieldLabel>
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
    </IssueFieldLabel>
  );
}

export { IssueFieldLabel, IssueIconLabel };
