import { DotsThreeIcon, PencilIcon, TrashIcon } from "@phosphor-icons/react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IssueViewListItem } from "../hooks/use-issue-view-list";

function IssueViewTable({
  items,
  onDelete,
  onEdit,
  searching,
}: {
  items: readonly IssueViewListItem[];
  onDelete: (viewId: string) => void;
  onEdit: (viewId: string) => void;
  searching: boolean;
}) {
  return (
    <Table aria-label="Views">
      {/* Sticky header needs an opaque background the table primitive does not provide. */}
      {/* eslint-disable-next-line shadcn/no-restyle */}
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Sharing</TableHead>
          <TableHead>Filters</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5}>
              <span className="text-muted-foreground">
                {searching ? "No views match this search." : "No views yet."}
              </span>
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Link className="font-medium hover:underline" to={item.path}>
                  {item.name}
                </Link>
              </TableCell>
              <TableCell>{item.visibilityLabel}</TableCell>
              <TableCell>
                <span className="block max-w-64 truncate" title={item.summary}>
                  {item.summary}
                </span>
              </TableCell>
              <TableCell>{item.updatedLabel}</TableCell>
              <TableCell>
                {item.canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          aria-label={`${item.name} actions`}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <DotsThreeIcon />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onClick={() => {
                            onEdit(item.id);
                          }}
                        >
                          <PencilIcon data-icon="inline-start" />
                          Edit view
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            onDelete(item.id);
                          }}
                          variant="destructive"
                        >
                          <TrashIcon data-icon="inline-start" />
                          Delete view
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export { IssueViewTable };
