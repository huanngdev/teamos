import {
  getInitials,
  getProjectRoleLabel,
  parseProjectRole,
  projectRoleLabels,
  projectRoles,
  type ProjectMember,
  type ProjectRole,
} from "@teamos/shared";
import { CircleNotchIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectMembersDialogProps {
  errorMessage: string | null;
  isPending: boolean;
  members: ProjectMember[];
  onClose: () => void;
  onRemoveMember: (memberId: string) => void;
  onRoleChange: (memberId: string, role: ProjectRole) => void;
  open: boolean;
  pendingMemberId: string | null;
  projectName: string;
}

function ProjectMembersDialog({
  errorMessage,
  isPending,
  members,
  onClose,
  onRemoveMember,
  onRoleChange,
  open,
  pendingMemberId,
  projectName,
}: ProjectMembersDialogProps) {
  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{projectName} members</DialogTitle>
          <DialogDescription>
            Only workspace members can hold a project role. Organization owners and admins always
            retain full access.
          </DialogDescription>
        </DialogHeader>

        {errorMessage === null ? null : (
          <Alert variant="destructive">
            <AlertTitle>Project members unavailable</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {isPending ? (
          <div aria-busy="true" className="flex flex-col gap-2" role="status">
            <span className="sr-only">Loading project members</span>
            {[0, 1].map((index) => (
              <Skeleton className="h-14 w-full" key={index} />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one has an explicit project role yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((member) => (
              <Item key={member.memberId} variant="outline">
                <ItemMedia>
                  <Avatar>
                    <AvatarImage alt="" src={member.image ?? undefined} />
                    <AvatarFallback>
                      {getInitials(member.name) || getInitials(member.email)}
                    </AvatarFallback>
                  </Avatar>
                </ItemMedia>
                <ItemContent className="min-w-0">
                  <ItemTitle>
                    <span className="min-w-0 truncate">{member.name}</span>
                  </ItemTitle>
                  <ItemDescription>
                    <span className="block truncate">{member.email}</span>
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Select
                    items={projectRoleLabels}
                    onValueChange={(value) => {
                      const role = parseProjectRole(value);

                      if (role !== undefined) {
                        onRoleChange(member.memberId, role);
                      }
                    }}
                    value={member.role}
                  >
                    <SelectTrigger aria-label={`Project role for ${member.name}`} className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {projectRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {getProjectRoleLabel(role)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Button
                    aria-label={`Remove ${member.name} from ${projectName}`}
                    onClick={() => {
                      onRemoveMember(member.memberId);
                    }}
                    variant="ghost"
                  >
                    {pendingMemberId === member.memberId ? (
                      <CircleNotchIcon className="animate-spin" />
                    ) : null}
                    Remove
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ProjectMembersDialog };
